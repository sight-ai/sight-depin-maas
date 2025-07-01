import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import {
  TunnelMessage,
  CompletionCompatibilityPayload,
  CompletionRequestNoStreamMessage,
  CompletionResponseMessage,
  OpenAICompletionRequest
} from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';
import {
  TUNNEL_EVENTS,
  TunnelCompletionRequestReceivedEvent,
  TunnelCompletionInferenceRequestEvent
} from '../../events';

// 使用 models 中定义的类型，无需本地定义

/**
 * OpenAI 非流式 Completion 请求处理器
 * 
 * 职责：
 * 1. 接收并验证非流式 completion 请求
 * 2. 调用推理服务执行文本补全
 * 3. 处理完整的 OpenAI 响应
 * 4. 转发响应给目标设备
 * 
 * 设计模式：
 * - Strategy Pattern: 处理不同格式的请求数据
 * - Template Method: 标准化消息处理流程
 * - Factory Pattern: 创建响应处理器
 */
@MessageHandler({ type: 'completion_request_no_stream', direction: 'income' })
@Injectable()
export class IncomeCompletionRequestNoStreamHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeCompletionRequestNoStreamHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super();
  }

  /**
   * 处理入站非流式 completion 请求消息
   * Template Method Pattern - 定义标准处理流程
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.log(`🎯 收到非流式 Completion 请求 - 目标: ${message.to}, 来源: ${message.from}`);

    try {
      // 1. 验证并解析消息
      const completionRequest = this.parseAndValidateMessage(message);
      
      // 2. 执行非流式 completion 推理
      await this.processCompletionRequestNoStream(completionRequest);

    } catch (error) {
      this.logger.error(`❌ 处理非流式 Completion 请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.handleError(message, error);
    }
  }

  /**
   * 解析并验证消息
   * Strategy Pattern - 支持多种消息格式
   */
  private parseAndValidateMessage(message: TunnelMessage): CompletionRequestNoStreamMessage {
    // 尝试直接解析为标准格式
    if (message.type === 'completion_request_no_stream' && message.payload) {
      const payload = message.payload as any;
      if (payload.taskId && payload.model && payload.prompt) {
        this.logger.debug(`✅ 标准格式解析成功`);
        return message as CompletionRequestNoStreamMessage;
      }
    }

    // 尝试兼容格式解析
    this.logger.debug(`⚠️ 尝试兼容格式解析`);
    return this.parseCompatibilityFormat(message);
  }

  /**
   * 解析兼容格式的消息（嵌套 data 格式）
   */
  private parseCompatibilityFormat(message: TunnelMessage): CompletionRequestNoStreamMessage {
    const payload = message.payload as CompletionCompatibilityPayload;

    if (!payload.taskId || !payload.data) {
      throw new Error('Invalid compatibility format: missing taskId or data');
    }

    // 转换为标准格式
    return {
      type: 'completion_request_no_stream',
      from: message.from,
      to: message.to,
      payload: {
        taskId: payload.taskId,
        path: payload.path || '/openai/v1/completions',
        model: payload.data.model || 'unknown',
        prompt: payload.data.prompt,
        temperature: payload.data.temperature,
        max_tokens: payload.data.max_tokens,
        top_p: payload.data.top_p,
        frequency_penalty: payload.data.frequency_penalty,
        presence_penalty: payload.data.presence_penalty,
        stop: payload.data.stop,
        n: payload.data.n,
        echo: payload.data.echo,
        logprobs: payload.data.logprobs
      }
    };
  }

  /**
   * 处理错误情况
   */
  private async handleError(message: TunnelMessage, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 发送错误响应给客户端
    await this.sendErrorResponse(message, errorMessage);
    
    this.logger.error(`处理消息失败: ${errorMessage}`, { 
      messageType: message.type, 
      from: message.from, 
      to: message.to 
    });
  }

  /**
   * 处理非流式 completion 请求并执行推理
   */
  private async processCompletionRequestNoStream(message: CompletionRequestNoStreamMessage): Promise<void> {
    const payload = message.payload;
    const taskId = payload.taskId;
    const path = payload.path;

    // 构建请求参数，转换为 UnifiedModelService 期望的格式
    const requestParams = {
      model: payload.model || 'unknown',
      prompt: Array.isArray(payload.prompt) ? payload.prompt.join('\n') : payload.prompt,
      stream: false, // 确保是非流式请求
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      top_p: payload.top_p,
      frequency_penalty: payload.frequency_penalty,
      presence_penalty: payload.presence_penalty,
      stop: payload.stop,
      n: payload.n || 1,
      echo: payload.echo,
      logprobs: payload.logprobs
    };

    this.logger.log(`执行非流式 Completion 推理 - TaskID: ${taskId}, Path: ${path}, Model: ${requestParams.model}`);

    // 验证请求数据
    this.validateCompletionRequest(requestParams);

    this.logger.debug(`调用推理服务 - Model: ${requestParams.model}, Prompt: ${typeof requestParams.prompt === 'string' ? requestParams.prompt.substring(0, 100) : 'Array'}`);

    try {
      // 发射完成推理请求事件，让推理服务模块处理
      // Tunnel 模块只负责消息传输，不直接调用推理服务
      this.eventEmitter.emit(
        TUNNEL_EVENTS.COMPLETION_INFERENCE_REQUEST,
        new TunnelCompletionInferenceRequestEvent(
          taskId,
          message.from,
          requestParams,
          path,
          false // 非流式请求
        )
      );

      this.logger.log(`✅ 已发射完成推理请求事件 - TaskID: ${taskId}`);
      this.logger.debug(`📡 事件已发射，等待推理服务模块处理并响应`);

    } catch (error) {
      this.logger.error(`❌ 发射推理请求事件失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 验证 completion 请求数据
   */
  private validateCompletionRequest(data: any): void {
    if (!data.prompt || (Array.isArray(data.prompt) && data.prompt.length === 0)) {
      throw new Error('Invalid completion request: missing prompt');
    }

    if (!data.model) {
      throw new Error('Invalid completion request: missing model');
    }
  }

  /**
   * 创建非流式响应处理器
   * Factory Pattern - 创建模拟的 Express Response 对象
   */
  private createNoStreamResponseHandler(taskId: string, targetDeviceId: string) {
    return {
      // Express Response 接口方法
      setHeader: () => {},
      status: () => ({ json: () => {} }),
      headersSent: false,

      // 非流式响应方法
      json: async (data: any) => {
        try {
          this.logger.debug(`📤 收到完整 Completion 响应 - TaskID: ${taskId}, Model: ${data.model}`);
          await this.sendCompleteResponse(taskId, targetDeviceId, data);
        } catch (error) {
          this.logger.error(`处理完整响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      },

      // 兼容流式接口（但不会被调用）
      write: () => {},
      end: () => {}
    };
  }

  /**
   * 发送完整响应
   */
  private async sendCompleteResponse(taskId: string, targetDeviceId: string, response: any): Promise<void> {
    this.logger.log(`✅ 非流式 Completion 推理完成 - TaskID: ${taskId}, Target: ${targetDeviceId}`);

    const responseMessage: CompletionResponseMessage = {
      type: 'completion_response',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        data: response
      }
    };

    // 使用 handleMessage 让系统自动判断发送目标
    await this.tunnel.handleMessage(responseMessage as any);
  }

  /**
   * 发送错误响应
   */
  private async sendErrorResponse(originalMessage: TunnelMessage, error: string): Promise<void> {
    const payload = originalMessage.payload as { taskId?: string };
    const taskId = payload.taskId || `error-${Date.now()}`;

    const errorResponse = {
      id: `cmpl-error-${taskId}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: 'unknown',
      choices: [{
        text: `发生错误: ${error}`,
        index: 0,
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    const errorMessage: CompletionResponseMessage = {
      type: 'completion_response',
      from: this.peerId,
      to: originalMessage.from,
      payload: {
        taskId,
        data: errorResponse,
        error
      }
    };

    await this.tunnel.handleMessage(errorMessage as any);
  }
}
