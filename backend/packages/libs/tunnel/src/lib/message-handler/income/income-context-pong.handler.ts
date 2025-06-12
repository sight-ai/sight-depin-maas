import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ContextPongMessage, ContextPongMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 上下文Pong消息处理器
 * 
 * 处理接收到的上下文pong响应消息
 */
@MessageHandler({ type: 'context-pong', direction: 'income' })
@Injectable()
export class IncomeContextPongHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeContextPongHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理入站上下文Pong消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`收到上下文Pong消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = ContextPongMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`上下文Pong消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const contextPongMessage = parseResult.data as ContextPongMessage;
    
    try {
      // 处理上下文pong逻辑
      await this.processContextPong(contextPongMessage);
      
    } catch (error) {
      this.logger.error(`处理上下文Pong消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理上下文pong逻辑
   */
  private async processContextPong(message: ContextPongMessage): Promise<void> {
    const { requestId, message: pongMessage, timestamp } = message.payload;
    
    this.logger.debug(`处理上下文Pong - RequestID: ${requestId}, Message: ${pongMessage}, Timestamp: ${timestamp}`);
    
    // 这里可以添加特定的上下文pong处理逻辑
    // 例如：计算往返时间、更新连接质量统计、完成特定请求等
    
    // 记录pong接收
    this.logger.debug(`上下文Pong接收完成 - RequestID: ${requestId}`);
  }
}
