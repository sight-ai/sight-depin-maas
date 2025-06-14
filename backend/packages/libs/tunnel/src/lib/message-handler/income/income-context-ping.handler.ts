import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ContextPingMessage, ContextPongMessage, ContextPingMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 上下文Ping消息处理器
 * 
 * 处理带有上下文信息的ping消息，通常用于特定请求的连接测试
 */
@MessageHandler({ type: 'context-ping', direction: 'income' })
@Injectable()
export class IncomeContextPingHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeContextPingHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
  ) {
    super();
  }

  /**
   * 处理入站上下文Ping消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`收到上下文Ping消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = ContextPingMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`上下文Ping消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const contextPingMessage = parseResult.data as ContextPingMessage;
    
    try {
      // 处理上下文ping逻辑
      await this.processContextPing(contextPingMessage);
      
      // 发送上下文pong响应
      await this.sendContextPongResponse(contextPingMessage);
      
    } catch (error) {
      this.logger.error(`处理上下文Ping消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理上下文ping逻辑
   */
  private async processContextPing(message: ContextPingMessage): Promise<void> {
    const { requestId, message: pingMessage, timestamp } = message.payload;
    
    this.logger.debug(`处理上下文Ping - RequestID: ${requestId}, Message: ${pingMessage}, Timestamp: ${timestamp}`);
    
    // 这里可以添加特定的上下文ping处理逻辑
    // 例如：记录请求上下文、更新连接状态等
    
    // 计算延迟
    const currentTime = Date.now();
    const latency = currentTime - timestamp;
    
    this.logger.debug(`上下文Ping延迟: ${latency}ms`);
  }

  /**
   * 发送上下文pong响应
   */
  private async sendContextPongResponse(originalMessage: ContextPingMessage): Promise<void> {
    const pongMessage: ContextPongMessage = {
      type: 'context-pong',
      from: this.peerId,
      to: originalMessage.from,
      payload: {
        requestId: originalMessage.payload.requestId,
        message: `Context Pong response to: ${originalMessage.payload.message}`,
        timestamp: Date.now()
      }
    };

    this.logger.debug(`发送上下文Pong响应: ${JSON.stringify(pongMessage)}`);
    
    try {
      await this.tunnel.sendMessage(pongMessage);
      this.logger.debug(`上下文Pong响应发送成功`);
    } catch (error) {
      this.logger.error(`发送上下文Pong响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}
