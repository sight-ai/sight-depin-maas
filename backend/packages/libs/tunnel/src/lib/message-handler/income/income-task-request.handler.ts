import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, TaskRequestMessage, TaskRequestMessageSchema, TaskResponseMessage, TaskStreamMessage } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';
import { UnifiedModelService } from '@saito/model-inference-client';
import { Response } from 'express';
import { Readable } from 'stream';

@MessageHandler({ type: 'task_request', direction: 'income' })
@Injectable()
export class IncomeTaskRequestHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeTaskRequestHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    @Inject('PEER_ID') protected override readonly peerId: string,
    private readonly unifiedModelService: UnifiedModelService
  ) {
    super(peerId);
  }

  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    const taskRequestMessage = TaskRequestMessageSchema.parse(message) as TaskRequestMessage;
    
    this.logger.debug(`收到任务请求: ${taskRequestMessage.payload.type}, taskId: ${taskRequestMessage.payload.taskId}`);

    try {
      // 根据任务类型处理不同的请求
      switch (taskRequestMessage.payload.type) {
        case 'chat_request_stream':
          await this.handleChatRequestStream(taskRequestMessage);
          break;
        case 'chat_request_no_stream':
          await this.handleChatRequestNoStream(taskRequestMessage);
          break;
        case 'generate_request_stream':
          await this.handleGenerateRequestStream(taskRequestMessage);
          break;
        case 'generate_request_no_stream':
          await this.handleGenerateRequestNoStream(taskRequestMessage);
          break;
        case 'proxy_request':
          await this.handleProxyRequest(taskRequestMessage);
          break;
        default:
          this.logger.warn(`未知任务类型: ${taskRequestMessage.payload.type}`);
          await this.sendTaskError(taskRequestMessage.payload.taskId, `不支持的任务类型: ${taskRequestMessage.payload.type}`);
      }
    } catch (error) {
      this.logger.error(`处理任务请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.sendTaskError(taskRequestMessage.payload.taskId, error instanceof Error ? error.message : '未知错误');
    }
  }

  private async handleChatRequestStream(message: TaskRequestMessage): Promise<void> {
    this.logger.debug(`处理流式聊天请求: ${message.payload.taskId}`);

    try {
      const { taskId, data } = message.payload;

      // 验证请求数据
      if (!data || !data.messages) {
        throw new Error('Invalid chat request: missing messages');
      }

      // 创建一个模拟的Response对象来捕获流式响应
      const mockResponse = this.createMockStreamResponse(taskId, message.from);

      // 构建聊天请求
      const chatRequest = {
        messages: data.messages,
        model: data.model || 'default',
        stream: true,
        temperature: data.temperature || 0.7,
        max_tokens: data.max_tokens || 2048,
        top_p: data.top_p || 1.0,
        frequency_penalty: data.frequency_penalty || 0,
        presence_penalty: data.presence_penalty || 0
      };

      this.logger.debug(`发起流式聊天请求，模型: ${chatRequest.model}, taskId: ${taskId}`);

      // 调用统一模型服务处理聊天请求
      await this.unifiedModelService.chat(chatRequest, mockResponse as any, '/v1/chat/completions');

    } catch (error) {
      this.logger.error(`流式聊天请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.sendTaskError(message.payload.taskId, error instanceof Error ? error.message : '未知错误');
    }
  }

  private async handleChatRequestNoStream(message: TaskRequestMessage): Promise<void> {
    this.logger.debug(`处理非流式聊天请求: ${message.payload.taskId}`);

    try {
      const { taskId, data } = message.payload;

      // 验证请求数据
      if (!data || !data.messages) {
        throw new Error('Invalid chat request: missing messages');
      }

      // 创建一个模拟的Response对象来捕获非流式响应
      const mockResponse = this.createMockNonStreamResponse(taskId, message.from);

      // 构建聊天请求
      const chatRequest = {
        messages: data.messages,
        model: data.model || 'default',
        stream: false,
        temperature: data.temperature || 0.7,
        max_tokens: data.max_tokens || 2048,
        top_p: data.top_p || 1.0,
        frequency_penalty: data.frequency_penalty || 0,
        presence_penalty: data.presence_penalty || 0
      };

      this.logger.debug(`发起非流式聊天请求，模型: ${chatRequest.model}, taskId: ${taskId}`);

      // 调用统一模型服务处理聊天请求
      await this.unifiedModelService.chat(chatRequest, mockResponse as any, '/v1/chat/completions');

    } catch (error) {
      this.logger.error(`非流式聊天请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.sendTaskError(message.payload.taskId, error instanceof Error ? error.message : '未知错误');
    }
  }

  private async handleGenerateRequestStream(message: TaskRequestMessage): Promise<void> {
    // TODO: 实现流式生成请求处理
    this.logger.debug(`处理流式生成请求: ${message.payload.taskId}`);
  }

  private async handleGenerateRequestNoStream(message: TaskRequestMessage): Promise<void> {
    // TODO: 实现非流式生成请求处理
    this.logger.debug(`处理非流式生成请求: ${message.payload.taskId}`);
  }

  private async handleProxyRequest(message: TaskRequestMessage): Promise<void> {
    // TODO: 实现代理请求处理
    this.logger.debug(`处理代理请求: ${message.payload.taskId}`);
  }

  private async sendTaskError(taskId: string, error: string): Promise<void> {
    this.logger.error(`任务错误: ${taskId}, ${error}`);

    const errorResponse: TaskResponseMessage = {
      type: 'task_response',
      from: this.peerId,
      to: 'gateway', // 发送给网关
      payload: {
        taskId,
        error,
        data: null
      }
    };

    await this.tunnel.sendMessage(errorResponse);
  }

  /**
   * 创建模拟的流式Response对象
   */
  private createMockStreamResponse(taskId: string, targetDeviceId: string) {
    const self = this;

    return {
      setHeader: () => {},
      write: async (chunk: string) => {
        // 解析流式数据并发送
        try {
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // 流式响应结束
                await self.sendTaskComplete(taskId, targetDeviceId);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                await self.sendTaskStream(taskId, targetDeviceId, parsed);
              } catch (parseError) {
                self.logger.warn(`Failed to parse stream data: ${data}`);
              }
            }
          }
        } catch (error) {
          self.logger.error(`Error processing stream chunk: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      },
      end: async () => {
        // 流式响应结束
        await self.sendTaskComplete(taskId, targetDeviceId);
      },
      status: () => ({ json: () => {} }),
      json: () => {},
      headersSent: false
    };
  }

  /**
   * 创建模拟的非流式Response对象
   */
  private createMockNonStreamResponse(taskId: string, targetDeviceId: string) {
    const self = this;

    return {
      setHeader: () => {},
      json: async (data: any) => {
        // 发送完整响应
        await self.sendTaskResponse(taskId, targetDeviceId, data);
      },
      status: () => ({ json: async (data: any) => await self.sendTaskResponse(taskId, targetDeviceId, data) }),
      headersSent: false
    };
  }

  /**
   * 发送任务流式数据
   */
  private async sendTaskStream(taskId: string, targetDeviceId: string, data: any): Promise<void> {
    const streamMessage: TaskStreamMessage = {
      type: 'task_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        chunk: data,
        done: false
      }
    };

    await this.tunnel.sendMessage(streamMessage);
  }

  /**
   * 发送任务完整响应
   */
  private async sendTaskResponse(taskId: string, targetDeviceId: string, data: any): Promise<void> {
    const responseMessage: TaskResponseMessage = {
      type: 'task_response',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        data
      }
    };

    await this.tunnel.sendMessage(responseMessage);
  }

  /**
   * 发送任务完成信号
   */
  private async sendTaskComplete(taskId: string, targetDeviceId: string): Promise<void> {
    const completeMessage: TaskStreamMessage = {
      type: 'task_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        chunk: null,
        done: true
      }
    };

    await this.tunnel.sendMessage(completeMessage);
  }
}
