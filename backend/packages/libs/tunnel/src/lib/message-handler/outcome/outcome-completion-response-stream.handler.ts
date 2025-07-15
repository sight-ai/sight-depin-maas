import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

// 流式 completion 响应消息类型
interface CompletionResponseStreamMessage {
  type: 'completion_response_stream';
  from: string;
  to: string;
  payload: {
    taskId: string;
    path: string;
    data?: any;
    error?: string;
    done?: boolean;
  };
}

/**
 * 流式 Completion 响应处理器
 * 
 * 职责：
 * 1. 处理出站流式 completion 响应消息
 * 2. 将响应转发给目标设备
 * 3. 记录响应处理日志
 * 
 * 设计模式：
 * - Template Method: 标准化消息处理流程
 * - Single Responsibility: 专注于响应转发
 */
@MessageHandler({ type: 'completion_response_stream', direction: 'outcome' })
@Injectable()
export class OutcomeCompletionResponseStreamHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeCompletionResponseStreamHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  /**
   * 处理出站流式 completion 响应消息
   * Template Method Pattern - 定义标准处理流程
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    const completionResponse = message as unknown as CompletionResponseStreamMessage;
    
    this.logger.log(`📤 发送流式 Completion 响应 - 目标: ${completionResponse.to}, TaskID: ${completionResponse.payload.taskId}`);

    try {
      // 验证响应数据
      this.validateResponse(completionResponse);

      // 转发响应消息
      await this.forwardResponse(completionResponse);



    } catch (error) {
      this.logger.error(`❌ 发送流式 Completion 响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 验证响应数据
   */
  private validateResponse(response: CompletionResponseStreamMessage): void {
    if (!response.payload.taskId) {
      throw new Error('Invalid response: missing taskId');
    }

    if (!response.payload.data && !response.payload.error && !response.payload.done) {
      throw new Error('Invalid response: missing data, error, or done flag');
    }
  }

  /**
   * 转发响应消息
   */
  private async forwardResponse(response: CompletionResponseStreamMessage): Promise<void> {
    // 直接发送消息，让底层处理路由
    await this.tunnel.sendMessage(response as any);
  }
}
