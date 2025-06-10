import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { 
  ITaskManager, 
  IEarningsManager, 
  TASK_MANAGER, 
  EARNINGS_MANAGER 
} from '@saito/miner';
import { 
  TDeviceConfig, 
  DEVICE_CONFIG_SERVICE 
} from '@saito/device-status';
import { EarningsConfigService } from '../services/earnings-config.service';
import * as crypto from 'crypto';

/**
 * 任务跟踪器接口
 */
interface TaskTracker {
  taskId: string;
  framework: string;
  taskType: string;
  model: string;
  inputTokens: number;
  startTime: number;
  requestUrl: string;
  requestBody: any;
}

/**
 * 收益跟踪拦截器
 *
 * 功能：
 * 1. 拦截所有 API 调用（Ollama 风格和 OpenAI 风格）
 * 2. 完整的任务生命周期跟踪（创建 → 运行 → 完成/失败）
 * 3. 基于实际使用量计算收益
 * 4. 支持两种协议风格独立记录收益
 * 5. 实时任务状态更新和监控
 *
 */
@Injectable()
export class EarningsTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EarningsTrackingInterceptor.name);

  constructor(
    @Inject(TASK_MANAGER)
    private readonly taskManager: ITaskManager,
    
    @Inject(EARNINGS_MANAGER)
    private readonly earningsManager: IEarningsManager,
    
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly deviceConfigService: TDeviceConfig,
    
    private readonly earningsConfig: EarningsConfigService
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 检查是否需要跟踪的端点
    if (!this.shouldTrackEarnings(request.url)) {
      return next.handle();
    }

    // 任务跟踪状态
    let taskTracker: TaskTracker | null = null;
    const startTime = Date.now();

    try {
      // 1. 创建任务跟踪器
      taskTracker = await this.createTaskTracker(request, startTime);

      // 2. 更新任务状态为运行中
      await this.updateTaskStatus(taskTracker.taskId, 'running', {
        started_at: new Date().toISOString()
      });

      // 3. 执行 API 调用并跟踪结果
      return next.handle().pipe(
        tap(async (responseData) => {
          // 成功完成 - 记录收益和更新状态
          await this.handleTaskCompletion(taskTracker!, request, responseData, startTime);
        }),
        catchError(async (error) => {
          // 失败处理 - 更新任务状态
          await this.handleTaskFailure(taskTracker!, error);
          throw error;
        })
      );

    } catch (error) {
      this.logger.error('Error in earnings tracking interceptor:', error);
      if (taskTracker) {
        await this.handleTaskFailure(taskTracker, error);
      }
      return next.handle();
    }
  }

  /**
   * 判断是否需要跟踪收益的端点
   */
  private shouldTrackEarnings(url: string): boolean {
    return this.earningsConfig.isTrackableEndpoint(url);
  }

  /**
   * 创建任务跟踪器
   */
  private async createTaskTracker(request: Request, startTime: number): Promise<TaskTracker> {
    const framework = this.earningsConfig.getFramework(request.url);
    const taskType = this.earningsConfig.getTaskType(request.url);
    const model = this.extractModel(request.body);
    const inputTokens = this.estimateInputTokens(request.body, taskType);

    const taskTracker: TaskTracker = {
      taskId: crypto.randomUUID(),
      framework,
      taskType,
      model,
      inputTokens,
      startTime,
      requestUrl: request.url,
      requestBody: request.body
    };

    // 创建任务记录
    const deviceConfig = this.deviceConfigService.getCurrentConfig();
    const createTaskRequest = {
      model: model,
      device_id: deviceConfig.deviceId || undefined
    };

    const createdTask = await this.taskManager.createTask(createTaskRequest);
    taskTracker.taskId = createdTask.id;

    this.logger.debug(`Task tracker created: ${taskTracker.taskId} for ${framework}/${taskType} with model ${model}`);

    return taskTracker;
  }

  /**
   * 更新任务状态
   */
  private async updateTaskStatus(taskId: string, status: string, additionalData?: any): Promise<void> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      await this.taskManager.updateTask(taskId, updates);
      this.logger.debug(`Task ${taskId} status updated to: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId} status:`, error);
    }
  }

  /**
   * 处理任务完成
   */
  private async handleTaskCompletion(
    taskTracker: TaskTracker,
    request: Request,
    responseData: any,
    startTime: number
  ): Promise<void> {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const outputTokens = this.estimateOutputTokens(responseData, taskTracker.taskType);

      // 计算收益
      const earnings = this.earningsConfig.calculateEarnings(
        taskTracker.framework,
        taskTracker.taskType,
        taskTracker.inputTokens,
        outputTokens,
        duration
      );

      // 更新任务状态为完成
      await this.updateTaskStatus(taskTracker.taskId, 'completed', {
        total_duration: duration,
        eval_count: outputTokens,
        eval_duration: duration * 0.8,
        completed_at: new Date().toISOString()
      });

      // 记录收益
      const deviceConfig = this.deviceConfigService.getCurrentConfig();
      await this.earningsManager.createEarnings(
        earnings.blockRewards,
        earnings.jobRewards,
        taskTracker.taskId,
        deviceConfig.deviceId || 'unknown'
      );

      this.logger.log(`✅ Task completed: ${taskTracker.taskId}`);
      this.logger.log(`💰 Earnings: ${earnings.jobRewards.toFixed(6)} tokens (${taskTracker.framework}/${taskTracker.taskType})`);
      this.logger.debug(`📊 Breakdown:`, earnings.breakdown);

    } catch (error) {
      this.logger.error(`Failed to handle task completion for ${taskTracker.taskId}:`, error);
    }
  }

  /**
   * 处理任务失败
   */
  private async handleTaskFailure(taskTracker: TaskTracker, error: any): Promise<void> {
    try {
      await this.updateTaskStatus(taskTracker.taskId, 'failed', {
        failed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error)
      });

      this.logger.warn(`❌ Task failed: ${taskTracker.taskId} - ${error}`);
    } catch (updateError) {
      this.logger.error(`Failed to update failed task ${taskTracker.taskId}:`, updateError);
    }
  }

  /**
   * 提取模型名称
   */
  private extractModel(body: any): string {
    if (!body) return 'unknown';
    return body.model || body.name || 'default';
  }

  /**
   * 估算输入 tokens
   */
  private estimateInputTokens(body: any, taskType: string): number {
    if (!body) return 0;

    try {
      let text = '';
      
      if (body.messages && Array.isArray(body.messages)) {
        // OpenAI/Ollama chat 格式
        text = body.messages.map((msg: any) => msg.content || '').join(' ');
      } else if (body.prompt) {
        // Ollama generate 格式
        text = body.prompt;
      } else if (body.input) {
        // OpenAI embeddings 格式
        text = Array.isArray(body.input) ? body.input.join(' ') : body.input;
      }

      // 简单的 token 估算：大约 4 个字符 = 1 token
      return Math.ceil(text.length / 4);
    } catch (error) {
      this.logger.warn('Failed to estimate input tokens:', error);
      return 0;
    }
  }

  /**
   * 估算输出 tokens
   */
  private estimateOutputTokens(responseData: any, taskType: string): number {
    if (!responseData) return 0;

    try {
      // 优先使用响应中的 usage 信息
      if (responseData.usage?.completion_tokens) {
        return responseData.usage.completion_tokens;
      }

      // 从响应内容估算
      let text = '';
      if (responseData.choices && Array.isArray(responseData.choices)) {
        text = responseData.choices.map((choice: any) => 
          choice.message?.content || choice.text || ''
        ).join(' ');
      } else if (responseData.response) {
        // Ollama 格式
        text = responseData.response;
      }

      return Math.ceil(text.length / 4);
    } catch (error) {
      this.logger.warn('Failed to estimate output tokens:', error);
      return 0;
    }
  }
}
