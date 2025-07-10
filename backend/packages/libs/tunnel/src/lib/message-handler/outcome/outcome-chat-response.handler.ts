import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ChatResponseMessage } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 非流式聊天响应处理器
 * 
 * 职责：
 * 1. 处理出站非流式聊天响应消息
 * 2. 将响应转发给目标设备
 * 3. 记录响应处理日志
 * 
 * 设计模式：
 * - Template Method: 标准化消息处理流程
 * - Single Responsibility: 专注于响应转发
 */
@MessageHandler({ type: 'chat_response', direction: 'outcome' })
@Injectable()
export class OutcomeChatResponseHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeChatResponseHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  /**
   * 处理出站非流式聊天响应消息
   * Template Method Pattern - 定义标准处理流程
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    const chatResponse = message as unknown as ChatResponseMessage;
    
    this.logger.log(`📤 发送非流式聊天响应 - 目标: ${chatResponse.to}, TaskID: ${chatResponse.payload.taskId}`);

    try {
      // 验证响应数据
      this.validateResponse(chatResponse);

      // 转发响应消息
      await this.forwardResponse(chatResponse);



    } catch (error) {
      this.logger.error(`❌ 发送非流式聊天响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 验证响应数据
   */
  private validateResponse(response: ChatResponseMessage): void {
    if (!response.payload.taskId) {
      throw new Error('Invalid response: missing taskId');
    }

    if (!response.payload.data && !response.payload.error) {
      throw new Error('Invalid response: missing both data and error');
    }
  }

  /**
   * 转发响应消息
   */
  private async forwardResponse(response: ChatResponseMessage): Promise<void> {
    // 直接发送消息，让底层处理路由
    await this.tunnel.sendMessage(response as any);
  }
}
