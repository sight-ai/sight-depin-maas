import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, PongMessage, PongMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * Pong消息处理器
 * 
 * 处理接收到的pong响应消息，用于连接测试和延迟监控
 */
@MessageHandler({ type: 'pong', direction: 'income' })
@Injectable()
export class IncomePongHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomePongHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理入站Pong消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`收到Pong消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = PongMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`Pong消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const pongMessage = parseResult.data as PongMessage;
    
    try {
      // 处理pong逻辑
      await this.processPong(pongMessage);
      
    } catch (error) {
      this.logger.error(`处理Pong消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理pong逻辑
   */
  private async processPong(message: PongMessage): Promise<void> {
    const { message: pongMessage, timestamp } = message.payload;
    
    this.logger.debug(`处理Pong - From: ${message.from}, Message: ${pongMessage}, Timestamp: ${timestamp}`);
    
    // 计算往返时间
    const currentTime = Date.now();
    const roundTripTime = currentTime - timestamp;
    
    this.logger.debug(`Pong往返时间: ${roundTripTime}ms`);
    
    // 这里可以添加特定的pong处理逻辑
    // 例如：
    // 1. 更新连接质量统计
    // 2. 记录延迟信息
    // 3. 触发连接状态更新
    // 4. 完成ping-pong周期
    
    await this.recordPongReceived(message.from, roundTripTime);
  }

  /**
   * 记录pong接收
   */
  private async recordPongReceived(fromDevice: string, roundTripTime: number): Promise<void> {
    this.logger.debug(`记录Pong接收 - From: ${fromDevice}, RTT: ${roundTripTime}ms`);
    
    // 这里可以添加pong接收记录逻辑
    // 例如：记录到数据库、更新统计信息等
  }
}
