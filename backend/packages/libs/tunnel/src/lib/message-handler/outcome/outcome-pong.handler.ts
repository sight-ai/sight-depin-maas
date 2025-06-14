import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, PongMessage, PongMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * Pong消息出站处理器
 * 
 * 处理发送出去的pong响应消息，用于记录和监控
 */
@MessageHandler({ type: 'pong', direction: 'outcome' })
@Injectable()
export class OutcomePongHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomePongHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理出站Pong消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送Pong消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = PongMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`Pong消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const pongMessage = parseResult.data as PongMessage;
    
    try {
      // 记录pong发送
      await this.recordPongSent(pongMessage);
      
    } catch (error) {
      this.logger.error(`处理出站Pong消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录pong发送
   */
  private async recordPongSent(message: PongMessage): Promise<void> {
    const { message: pongMessage, timestamp } = message.payload;
    
    this.logger.debug(`记录Pong发送 - Target: ${message.to}, Message: ${pongMessage}, Timestamp: ${timestamp}`);
    
    // 这里可以添加发送记录逻辑
    // 例如：
    // 1. 记录响应时间
    // 2. 更新发送统计
    // 3. 监控响应性能
    // 4. 记录到数据库
  }
}
