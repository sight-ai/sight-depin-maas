import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ContextPingMessage, ContextPingMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 上下文Ping消息出站处理器
 * 
 * 处理发送出去的上下文ping消息，通常用于记录和监控
 */
@MessageHandler({ type: 'context-ping', direction: 'outcome' })
@Injectable()
export class OutcomeContextPingHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeContextPingHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理出站上下文Ping消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送上下文Ping消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = ContextPingMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`上下文Ping消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const contextPingMessage = parseResult.data as ContextPingMessage;
    
    try {
      // 记录上下文ping发送
      await this.recordContextPingSent(contextPingMessage);
      
    } catch (error) {
      this.logger.error(`处理出站上下文Ping消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录上下文ping发送
   */
  private async recordContextPingSent(message: ContextPingMessage): Promise<void> {
    const { requestId, message: pingMessage, timestamp } = message.payload;
    
    this.logger.debug(`记录上下文Ping发送 - RequestID: ${requestId}, Target: ${message.to}, Message: ${pingMessage}, Timestamp: ${timestamp}`);
    
    // 这里可以添加发送记录逻辑
    // 例如：记录到数据库、更新统计信息等
  }
}
