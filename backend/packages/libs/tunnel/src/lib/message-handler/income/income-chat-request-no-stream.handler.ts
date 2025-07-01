import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import {
  TunnelMessage,
  ChatRequestNoStreamMessage,
  ChatRequestNoStreamMessageSchema,
  ChatResponseMessage,
  ChatCompatibilityPayload,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIChatMessage
} from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';
import {
  TUNNEL_EVENTS,
  TunnelChatRequestReceivedEvent,
  TunnelChatInferenceRequestEvent,
  TunnelInferenceResponseEvent
} from '../../events';

// 使用 models 中定义的类型，无需本地定义

/**
 * OpenAI 非流式聊天请求处理器
 * 
 * 职责：
 * 1. 接收并验证非流式聊天请求
 * 2. 调用推理服务执行聊天
 * 3. 处理完整的 OpenAI 响应
 * 4. 转发响应给目标设备
 * 
 * 设计模式：
 * - Strategy Pattern: 处理不同格式的请求数据
 * - Template Method: 标准化消息处理流程
 * - Factory Pattern: 创建响应处理器
 */
@MessageHandler({ type: 'chat_request_no_stream', direction: 'income' })
@Injectable()
export class IncomeChatRequestNoStreamHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeChatRequestNoStreamHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super();
  }

  /**
   * 处理入站非流式聊天请求消息
   * Template Method Pattern - 定义标准处理流程
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.log(`🎯 收到非流式聊天请求 - 目标: ${message.to}, 来源: ${message.from}`);

    try {
      // 1. 验证并解析消息
      const chatRequest = this.parseAndValidateMessage(message);

      // 发射聊天请求接收事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.CHAT_REQUEST_RECEIVED,
        new TunnelChatRequestReceivedEvent(
          chatRequest.payload.taskId || `${Date.now()}`,
          chatRequest.from,
          chatRequest.payload,
          false // 非流式请求
        )
      );

      // 2. 执行非流式聊天推理
      await this.processChatRequestNoStream(chatRequest);

    } catch (error) {
      this.logger.error(`❌ 处理非流式聊天请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.handleError(message, error);
    }
  }

  /**
   * 解析并验证消息
   * Strategy Pattern - 支持多种消息格式
   */
  private parseAndValidateMessage(message: TunnelMessage): ChatRequestNoStreamMessage {
    // 尝试标准格式解析
    const parseResult = ChatRequestNoStreamMessageSchema.safeParse(message);

    if (parseResult.success) {
      this.logger.debug(`✅ 标准格式解析成功`);
      return parseResult.data;
    }

    // 尝试兼容格式解析
    this.logger.debug(`⚠️ 标准格式解析失败，尝试兼容格式: ${parseResult.error.message}`);
    return this.parseCompatibilityFormat(message);
  }

  /**
   * 解析兼容格式的消息（嵌套 data 格式）
   */
  private parseCompatibilityFormat(message: TunnelMessage): ChatRequestNoStreamMessage {
    const payload = message.payload as ChatCompatibilityPayload;

    if (!payload.taskId || !payload.data) {
      throw new Error('Invalid compatibility format: missing taskId or data');
    }

    // 转换消息格式以符合 OpenAI 标准
    const convertedMessages: OpenAIChatMessage[] = payload.data.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'function',
      content: msg.content || null,
      name: undefined,
      function_call: undefined
    }));

    const convertedData: OpenAIChatCompletionRequest = {
      model: payload.data.model || 'unknown',
      messages: convertedMessages,
      stream: false, // 确保是非流式请求
      temperature: payload.data.temperature,
      max_tokens: payload.data.max_tokens,
      top_p: payload.data.top_p,
      frequency_penalty: payload.data.frequency_penalty,
      presence_penalty: payload.data.presence_penalty,
      stop: payload.data.stop,
      n: payload.data.n || 1,
      logit_bias: payload.data.logit_bias,
      user: payload.data.user
    };

    // 转换为标准格式
    return {
      type: 'chat_request_no_stream',
      from: message.from,
      to: message.to,
      payload: {
        taskId: payload.taskId,
        path: payload.path || '/openai/v1/chat/completions',
        data: {
          messages: convertedMessages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content || ''
          })),
          model: convertedData.model,
          temperature: convertedData.temperature,
          max_tokens: convertedData.max_tokens,
          top_p: convertedData.top_p,
          frequency_penalty: convertedData.frequency_penalty,
          presence_penalty: convertedData.presence_penalty
        }
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
   * 处理非流式聊天请求并执行推理
   */
  private async processChatRequestNoStream(message: ChatRequestNoStreamMessage): Promise<void> {
    const payload = message.payload;
    const taskId = payload.taskId;
    const path = payload.path;

    // 构建 OpenAI 格式的请求参数
    const requestParams: OpenAIChatCompletionRequest = {
      model: payload.data.model || 'unknown',
      messages: payload.data.messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant' | 'function',
        content: msg.content,
        name: undefined,
        function_call: undefined
      })),
      stream: false, // 确保是非流式请求
      temperature: payload.data.temperature,
      max_tokens: payload.data.max_tokens,
      top_p: payload.data.top_p,
      frequency_penalty: payload.data.frequency_penalty,
      presence_penalty: payload.data.presence_penalty,
      n: 1
    };

    this.logger.log(`执行非流式聊天推理 - TaskID: ${taskId}, Path: ${path}, Model: ${requestParams.model}`);

    // 验证请求数据
    this.validateChatRequest(requestParams);

    this.logger.debug(`调用推理服务 - Model: ${requestParams.model}, Messages: ${requestParams.messages.length}`);

    try {
      // 发射聊天推理请求事件，让推理服务模块处理
      this.eventEmitter.emit(
        TUNNEL_EVENTS.CHAT_INFERENCE_REQUEST,
        new TunnelChatInferenceRequestEvent(
          taskId,
          message.from,
          requestParams,
          path,
          false // 非流式请求
        )
      );

      this.logger.log(`✅ 已发射聊天推理请求事件 - TaskID: ${taskId}`);

    } catch (error) {
      this.logger.error(`发射推理请求事件失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 验证聊天请求数据
   */
  private validateChatRequest(data: OpenAIChatCompletionRequest): void {
    if (!data.messages || data.messages.length === 0) {
      throw new Error('Invalid chat request: missing messages');
    }

    if (!data.model) {
      throw new Error('Invalid chat request: missing model');
    }
  }

  // 注意：推理响应监听器已移除
  // 现在推理服务直接通过 tunnel 发送响应，不再需要事件转发

  /**
   * 创建非流式响应处理器
   * Factory Pattern - 创建模拟的 Express Response 对象
   */
  private createNoStreamResponseHandler(taskId: string, targetDeviceId: string) {
    return {
      // Express Response 接口方法
      setHeader: () => { },
      status: () => ({ json: () => { } }),
      headersSent: false,

      // 非流式响应方法
      json: async (data: OpenAIChatCompletionResponse) => {
        try {
          this.logger.debug(`📤 收到完整响应 - TaskID: ${taskId}, Model: ${data.model}`);
          await this.sendCompleteResponse(taskId, targetDeviceId, data);
        } catch (error) {
          this.logger.error(`处理完整响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      },

      // 兼容流式接口（但不会被调用）
      write: () => { },
      end: () => { }
    };
  }

  /**
   * 发送完整响应
   */
  private async sendCompleteResponse(taskId: string, targetDeviceId: string, response: OpenAIChatCompletionResponse): Promise<void> {
    this.logger.log(`✅ 非流式推理完成 - TaskID: ${taskId}, Target: ${targetDeviceId}`);

    const responseMessage: ChatResponseMessage = {
      type: 'chat_response',
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

    const errorResponse: OpenAIChatCompletionResponse = {
      id: `chatcmpl-error-${taskId}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'unknown',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: `发生错误: ${error}`,
          name: undefined,
          function_call: undefined
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    const errorMessage: ChatResponseMessage = {
      type: 'chat_response',
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
