import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ChatRequestStreamMessage, ChatRequestStreamMessageSchema, ChatResponseStreamMessage, OllamaChatStreamChunk } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';
import { UnifiedModelService } from '@saito/model-inference-client';
import { Response } from 'express';

/**
 * 流式聊天请求处理器
 * 
 * 接收流式聊天请求并执行推理，根据path区分Ollama或OpenAI
 */
@MessageHandler({ type: 'chat_request_stream', direction: 'income' })
@Injectable()
export class IncomeChatRequestStreamHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeChatRequestStreamHandler.name);

  // 用于累积Ollama流式数据的缓冲区
  private streamBuffers = new Map<string, string>();

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    private readonly unifiedModelService: UnifiedModelService
  ) {
    super();
  }

  /**
   * 处理入站流式聊天请求消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.log(`🎯 IncomeChatRequestStreamHandler 收到消息!`);
    this.logger.log(`当前设备ID (peerId): ${this.peerId}`);
    this.logger.log(`消息目标: ${message.to}`);
    this.logger.log(`消息来源: ${message.from}`);
    this.logger.debug(`收到流式聊天请求: ${JSON.stringify(message)}`);

    try {
      // 执行流式聊天推理
      await this.processChatRequestStream(message as unknown as ChatRequestStreamMessage);

    } catch (error) {
      this.logger.error(`❌ 处理流式聊天请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 创建一个基本的错误响应消息
      const errorMessage: ChatResponseStreamMessage = {
        type: 'chat_response_stream',
        from: this.peerId,
        to: message.from,
        payload: {
          taskId: 'unknown',
          path: '',
          data: {
            message: {
              role: 'user',
              content: '发生错误: ' + (error instanceof Error ? error.message : '未知错误')
            },
            done: true
          },
          error: error instanceof Error ? error.message : '未知错误',
        }
      };
      await this.sendErrorResponse(errorMessage, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 处理流式聊天请求并执行推理
   */
  private async processChatRequestStream(message: ChatRequestStreamMessage): Promise<void> {
    this.logger.log(`处理流式聊天请求: ${JSON.stringify(message)}`);
    const { taskId, path, data } = message.payload;

    this.logger.log(`执行流式聊天推理 - TaskID: ${taskId}, Path: ${path}, Model: ${data.model}`);

    // 验证请求数据
    if (!data.messages || data.messages.length === 0) {
      throw new Error('Invalid chat request: missing messages');
    }
    this.logger.debug(`调用UnifiedModelService: ${JSON.stringify(message)}`);

    try {
      // 创建模拟的Response对象来处理流式响应
      const mockResponse = this.createStreamResponseHandler(taskId, message.from, path);

      // 直接调用UnifiedModelService
      await this.unifiedModelService.chat(data, mockResponse as unknown as Response, path);

    } catch (error) {
      this.logger.error(`推理执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 创建流式响应处理器
   * 模拟Express Response对象，用于处理UnifiedModelService的流式响应
   */
  private createStreamResponseHandler(taskId: string, targetDeviceId: string, path: string) {
    const self = this;

    return {
      // Express Response 接口方法
      setHeader: () => { },
      status: () => ({ json: () => { } }),
      json: () => { },
      headersSent: false,
      // 流式写入方法
      write: async (chunk: Buffer) => {
        try {
          // 处理不同类型的chunk，统一转换为文本
          let text: string;

          if (typeof chunk === 'string') {
            text = chunk;
          } else if (Buffer.isBuffer(chunk)) {
            text = chunk.toString('utf8');
          } else if (chunk && typeof chunk === 'object') {
            // 检查是否是Uint8Array或类似的数字数组
            if (Array.isArray(chunk) || ('length' in chunk && typeof (chunk as ArrayLike<number>).length === 'number')) {
              // 将数字数组转换为Buffer然后转换为字符串
              const uint8Array = new Uint8Array(chunk as ArrayLike<number>);
              text = Buffer.from(uint8Array).toString('utf8');
            } else {
              // 如果是其他类型的对象，直接发送
              // await self.sendStreamChunk(taskId, targetDeviceId, JSON.stringify(chunk));
              return;
            }
          } else {
            text = String(chunk);
          }

          // 通过 handleMessage 发送流式数据
          await self.sendStreamChunk(taskId, targetDeviceId, text);
        } catch (error) {
          self.logger.error(`Error processing chunk: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      },

      // 流式结束方法
      end: async () => {
      }
    };
  }


  /**
   * 发送流式数据块（通过 handleMessage）
   */
  private async sendStreamChunk(taskId: string, targetDeviceId: string, chunkText: string): Promise<void> {
    const streamMessage: ChatResponseStreamMessage = {
      type: 'chat_response_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        path: '', // 响应时path可以为空
        data: JSON.parse(chunkText) as OllamaChatStreamChunk
      }
    };

    // 使用 handleMessage 让系统自动判断发送目标
    await this.tunnel.handleMessage(streamMessage);
  }

  /**
   * 发送错误响应
   */
  private async sendErrorResponse(originalMessage: ChatResponseStreamMessage, error: string): Promise<void> {
    const errorMessage: ChatResponseStreamMessage = {
      type: 'chat_response_stream',
      from: this.peerId,
      to: originalMessage.from,
      payload: {
        taskId: originalMessage.payload.taskId,
        path: '', // 响应时path可以为空
        data: {
          message: {
            role: 'user',
            content: '发生错误: ' + error
          }, // 响应时messages可以为空
          done: true
        },
        error,
      }
    };

    await this.tunnel.sendMessage(errorMessage);
  }
}
