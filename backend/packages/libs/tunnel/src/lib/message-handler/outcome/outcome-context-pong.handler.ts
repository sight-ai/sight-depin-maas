import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ContextPongMessage, ContextPongMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 上下文Pong消息出站处理器
 * 
 * 处理发送出去的上下文pong响应消息
 */
@MessageHandler({ type: 'context-pong', direction: 'outcome' })
@Injectable()
export class OutcomeContextPongHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeContextPongHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理出站上下文Pong消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送上下文Pong消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = ContextPongMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`上下文Pong消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const contextPongMessage = parseResult.data as ContextPongMessage;
    
    try {
      // 记录上下文pong发送
      await this.recordContextPongSent(contextPongMessage);
      
    } catch (error) {
      this.logger.error(`处理出站上下文Pong消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录上下文pong发送
   */
  private async recordContextPongSent(message: ContextPongMessage): Promise<void> {
    const { requestId, message: pongMessage, timestamp } = message.payload;
    
    this.logger.debug(`记录上下文Pong发送 - RequestID: ${requestId}, Target: ${message.to}, Message: ${pongMessage}, Timestamp: ${timestamp}`);
    
    // 这里可以添加发送记录逻辑
    // 例如：记录响应时间、更新统计信息等
  }
}
