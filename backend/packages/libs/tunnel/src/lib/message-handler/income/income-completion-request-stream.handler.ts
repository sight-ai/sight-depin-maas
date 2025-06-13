import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import {
  TunnelMessage,
  CompletionCompatibilityPayload,
  CompletionRequestStreamMessage,
  CompletionResponseStreamMessage
} from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';
import { UnifiedModelService } from '@saito/model-inference-client';

// 使用 models 中定义的类型，无需本地定义

/**
 * OpenAI 流式 Completion 请求处理器
 * 
 * 职责：
 * 1. 接收并验证流式 completion 请求
 * 2. 调用推理服务执行文本补全
 * 3. 处理 OpenAI SSE 格式的流式响应
 * 4. 转发响应给目标设备
 * 
 * 设计模式：
 * - Strategy Pattern: 处理不同格式的流式数据
 * - Template Method: 标准化消息处理流程
 * - Factory Pattern: 创建响应处理器
 */
@MessageHandler({ type: 'completion_request_stream', direction: 'income' })
@Injectable()
export class IncomeCompletionRequestStreamHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeCompletionRequestStreamHandler.name);

  // SSE 数据缓冲区 - 用于处理不完整的 SSE 行
  private readonly sseBuffers = new Map<string, string>();

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    private readonly unifiedModelService: UnifiedModelService
  ) {
    super();
  }

  /**
   * 处理入站流式 completion 请求消息
   * Template Method Pattern - 定义标准处理流程
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.log(`🎯 收到流式 Completion 请求 - 目标: ${message.to}, 来源: ${message.from}`);

    try {
      // 1. 验证并解析消息
      const completionRequest = this.parseAndValidateMessage(message);

      // 2. 执行流式 completion 推理
      await this.processCompletionRequestStream(completionRequest);

    } catch (error) {
      this.logger.error(`❌ 处理流式 Completion 请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.handleError(message, error);
    }
  }

  /**
   * 解析并验证消息
   * Strategy Pattern - 支持多种消息格式
   */
  private parseAndValidateMessage(message: TunnelMessage): CompletionRequestStreamMessage {
    // 尝试直接解析为标准格式
    if (message.type === 'completion_request_stream' && message.payload) {
      const payload = message.payload as any;
      if (payload.taskId && payload.data) {
        this.logger.debug(`✅ 标准格式解析成功`);
        return message as CompletionRequestStreamMessage;
      }
    }

    // 尝试兼容格式解析
    this.logger.debug(`⚠️ 尝试兼容格式解析`);
    return this.parseCompatibilityFormat(message);
  }

  /**
   * 解析兼容格式的消息（嵌套 data 格式）
   */
  private parseCompatibilityFormat(message: TunnelMessage): CompletionRequestStreamMessage {
    const payload = message.payload as CompletionCompatibilityPayload;

    if (!payload.taskId || !payload.data) {
      throw new Error('Invalid compatibility format: missing taskId or data');
    }

    // 转换为标准格式
    const convertedData = {
      model: payload.data.model || 'unknown',
      prompt: payload.data.prompt,
      stream: true, // 确保是流式请求
      temperature: payload.data.temperature,
      max_tokens: payload.data.max_tokens,
      top_p: payload.data.top_p,
      frequency_penalty: payload.data.frequency_penalty,
      presence_penalty: payload.data.presence_penalty,
      stop: payload.data.stop,
      n: payload.data.n || 1,
      logit_bias: payload.data.logit_bias,
      user: payload.data.user,
      echo: payload.data.echo,
      logprobs: payload.data.logprobs
    };

    // 转换为标准格式
    return {
      type: 'completion_request_stream',
      from: message.from,
      to: message.to,
      payload: {
        taskId: payload.taskId,
        path: payload.path || '/openai/v1/completions',
        data: convertedData
      }
    };
  }

  /**
   * 处理错误情况
   */
  private async handleError(message: TunnelMessage, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    this.logger.error(`处理消息失败: ${errorMessage}`, {
      messageType: message.type,
      from: message.from,
      to: message.to
    });
  }

  /**
   * 处理流式 completion 请求并执行推理
   */
  private async processCompletionRequestStream(message: CompletionRequestStreamMessage): Promise<void> {
    const payload = message.payload;
    const taskId = payload.taskId;
    const path = payload.path;

    // 从 payload 中提取 OpenAI 格式的数据
    const requestData = payload.data;

    // 构建请求参数，确保是流式请求
    const requestParams = {
      model: requestData.model,
      prompt: Array.isArray(requestData.prompt) ? requestData.prompt.join('\n') : requestData.prompt,
      stream: true, // 确保是流式请求
      temperature: requestData.temperature,
      max_tokens: requestData.max_tokens,
      top_p: requestData.top_p,
      frequency_penalty: requestData.frequency_penalty,
      presence_penalty: requestData.presence_penalty,
      stop: requestData.stop,
      n: requestData.n,
      echo: requestData.echo,
      logprobs: requestData.logprobs
    };

    this.logger.log(`执行流式 Completion 推理 - TaskID: ${taskId}, Path: ${path}, Model: ${requestParams.model}`);

    // 验证请求数据
    this.validateCompletionRequest(requestParams);

    this.logger.debug(`调用推理服务 - Model: ${requestParams.model}, Prompt: ${typeof requestParams.prompt === 'string' ? requestParams.prompt.substring(0, 100) : 'Array'}`);

    try {
      // 创建流式响应处理器
      const responseHandler = this.createStreamResponseHandler(taskId, message.from);

      // 调用推理服务
      await this.unifiedModelService.complete(requestParams, responseHandler as unknown as any, path);

    } catch (error) {
      this.logger.error(`推理执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
   * 创建流式响应处理器
   * Factory Pattern - 创建模拟的 Express Response 对象
   */
  private createStreamResponseHandler(taskId: string, targetDeviceId: string) {
    return {
      // Express Response 接口方法
      setHeader: () => { },
      status: () => ({ json: () => { } }),
      json: () => { },
      headersSent: false,

      // 流式写入方法
      write: async (chunk: any) => {
        try {
          let jsonData: any;

          // 如果已经是对象，直接使用
          if (typeof chunk === 'object' && chunk !== null && !Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) {
            jsonData = chunk;
          } else {
            // 转换为字符串并解析 JSON
            const text = chunk instanceof Uint8Array
              ? new TextDecoder('utf-8').decode(chunk)
              : String(chunk);
              console.log(text)
            jsonData = text.includes('data: [DONE]') ? {
              id: `cmpl-${taskId}`,
              object: 'text_completion',
              created: Math.floor(Date.now() / 1000),
              model: 'unknown',
              choices: [{
                text: '',
                index: 0,
                finish_reason: 'stop'
              }]
            } :JSON.parse(text.replace('data: ', ''));
          }

          // 发送 JSON 数据
          await this.sendStreamChunk(taskId, targetDeviceId, jsonData);

        } catch (error) {
          this.logger.error(`数据块解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      },

      // 流式结束方法
      end: async () => {
        await this.sendStreamComplete(taskId, targetDeviceId);
      }
    };
  }
  /**
   * 发送流式数据块（OpenAI Completion 格式）
   */
  private async sendStreamChunk(taskId: string, targetDeviceId: string, chunk: any): Promise<void> {
    this.logger.debug(`📤 发送 OpenAI Completion 数据块 - TaskID: ${taskId}`);

    const streamMessage: CompletionResponseStreamMessage = {
      type: 'completion_response_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        path: '', // 响应时path可以为空
        data: chunk
      }
    };

    // 使用 handleMessage 让系统自动判断发送目标
    await this.tunnel.handleMessage(streamMessage as any);
  }

  /**
   * 发送流式完成信号
   */
  private async sendStreamComplete(taskId: string, targetDeviceId: string): Promise<void> {
    // 清理 SSE 缓冲区
    const bufferKey = `${taskId}-${targetDeviceId}`;
    this.sseBuffers.delete(bufferKey);

    this.logger.log(`✅ 流式 Completion 推理完成 - TaskID: ${taskId}, Target: ${targetDeviceId}`);

    // 创建符合 OpenAI 格式的完成信号
    const completeChunk = {
      id: `cmpl-${taskId}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: 'unknown',
      choices: [{
        text: '',
        index: 0,
        finish_reason: 'stop'
      }]
    };

    const completeMessage: CompletionResponseStreamMessage = {
      type: 'completion_response_stream',
      from: this.peerId,
      to: targetDeviceId,
      payload: {
        taskId,
        path: '', // 响应时path可以为空
        data: completeChunk,
        done: true
      }
    };

    // 使用 handleMessage 让系统自动判断发送目标
    await this.tunnel.handleMessage(completeMessage as any);
  }
}
