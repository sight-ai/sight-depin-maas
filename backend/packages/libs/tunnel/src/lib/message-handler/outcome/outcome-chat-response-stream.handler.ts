import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, ChatResponseStreamMessage } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 流式聊天响应出站处理器
 * 
 * 处理发送流式聊天响应到网关
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
    const chatResponseMessage = message as ChatResponseStreamMessage;
    this.logger.debug(`📤 发送流式聊天响应 - TaskID: ${chatResponseMessage.payload.taskId}, Target: ${chatResponseMessage.to}`);

    try {
      // 实际发送响应到网关
      await this.sendResponseToGateway(chatResponseMessage);

      // 记录流式聊天响应发送
      // await this.recordChatResponseStreamSent(chatResponseMessage);

    } catch (error) {
      this.logger.error(`处理出站流式聊天响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 发送响应到网关
   */
  private async sendResponseToGateway(message: ChatResponseStreamMessage): Promise<void> {
    const { taskId, data } = message.payload;

    // 检查是否是完成信号
    const isComplete = data && typeof data === 'object' && (data as any).done === true;

    if (isComplete) {
      this.logger.log(`✅ 发送流式完成信号到网关 - TaskID: ${taskId}, Target: ${message.to}`);
    } else {
      // 获取数据信息用于日志
      const dataInfo = this.getDataInfo(data);
      this.logger.debug(`📤 发送流式数据到网关 - TaskID: ${taskId}, ${dataInfo}`);
    }

    // 通过 tunnel 服务发送消息到网关
    await this.tunnel.sendMessage(message);
  }

  /**
   * 获取数据信息（用于日志）
   */
  private getDataInfo(data: any): string {
    if (typeof data === 'string') {
      const preview = data.length > 50 ? data.substring(0, 50) + '...' : data;
      return `文本数据: "${preview}" (${data.length}字符)`;
    } else if (data && typeof data === 'object') {
      return `对象数据: ${Object.keys(data).join(', ')}`;
    } else {
      return `数据类型: ${typeof data}`;
    }
  }



  /**
   * 记录流式聊天响应发送
   */
  private async recordChatResponseStreamSent(message: ChatResponseStreamMessage): Promise<void> {
    const { taskId } = message.payload;
    
    this.logger.log(`记录流式聊天响应发送 - TaskID: ${taskId}, Target: ${message.to}`);
    
    // 记录响应详情
    this.logger.debug(`响应数据类型: ${typeof message.payload.data}`);
    
    // 这里可以添加发送记录逻辑
    // 例如：
    // 1. 记录响应时间
    // 2. 更新任务状态
    // 3. 记录到数据库
    // 4. 监控响应性能
    
    const responseTime = Date.now();
    this.logger.debug(`流式聊天响应发送时间: ${new Date(responseTime).toISOString()}`);
  }
}
