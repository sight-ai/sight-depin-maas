import { Injectable, Logger, Inject } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ChatResponseStreamMessage, ChatResponseStreamSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 流式聊天响应出站处理器
 * 
 * 职责：
 * 1. 处理发送出去的流式聊天响应
 * 2. 记录响应发送状态
 * 3. 支持P2P网络扩展
 */
@MessageHandler({ type: 'chat_response_stream', direction: 'outcome' })
@Injectable()
export class OutcomeChatResponseStreamHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeChatResponseStreamHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  /**
   * 处理出站流式聊天响应消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送流式聊天响应 - To: ${message.to}, Type: ${message.type}`);

    try {
      console.log(message)
      // 验证消息格式
      const parseResult = ChatResponseStreamSchema.safeParse(message);
      if (!parseResult.success) {
        this.logger.warn(`流式聊天响应消息格式验证失败: ${parseResult.error.message}`);
        // 不阻断发送，继续处理
      }

      const responseMessage = parseResult.success ? 
        parseResult.data as ChatResponseStreamMessage : 
        message as ChatResponseStreamMessage;

      // 实际发送消息到网关
      await this.sendToGateway(responseMessage);

    } catch (error) {
      this.logger.error(`处理出站流式聊天响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 即使处理失败，也要尝试发送消息
      await this.sendToGateway(message as ChatResponseStreamMessage);
    }
  }

  /**
   * 发送消息到网关
   */
  private async sendToGateway(message: ChatResponseStreamMessage): Promise<void> {
    try {
      // 记录发送详情
      this.logger.debug(`向网关发送消息: ${message.type} -> ${message.to}`);
      this.logger.debug(`消息内容: TaskID=${message.payload.taskId}, Done=${message.payload.data?.choices || 'N/A'}, Error=${message.payload.error}`);

      // 通过TunnelService发送消息到网关
      // TunnelService会处理连接状态检查和实际的网关通信
      await this.tunnel.sendMessage(message);

      // 记录发送成功
      this.logger.debug(`消息发送成功: ${message.type} -> ${message.to}`);

    } catch (error) {
      this.logger.error(`发送到网关失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.logger.error(`失败消息详情: ${JSON.stringify(message, null, 2)}`);
      throw error;
    }
  }
}
