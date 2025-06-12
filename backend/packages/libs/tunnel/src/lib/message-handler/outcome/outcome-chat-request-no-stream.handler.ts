import { Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, TaskRequestMessage, TaskRequestMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 非流式聊天请求出站处理器
 * 
 * 处理发送出去的非流式聊天请求，用于记录和监控
 */
@MessageHandler({ type: 'chat_request_no_stream', direction: 'outcome' })
@Injectable()
export class OutcomeChatRequestNoStreamHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeChatRequestNoStreamHandler.name);

  constructor() {
    super();
  }

  /**
   * 处理出站非流式聊天请求消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送非流式聊天请求: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = TaskRequestMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`非流式聊天请求消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const taskRequestMessage = parseResult.data as TaskRequestMessage;
    
    // 验证任务类型
    if (taskRequestMessage.payload.type !== 'chat_request_no_stream') {
      this.logger.error(`错误的任务类型: ${taskRequestMessage.payload.type}, 期望: chat_request_no_stream`);
      return;
    }

    try {
      // 记录非流式聊天请求发送
      await this.recordChatRequestNoStreamSent(taskRequestMessage);
      
    } catch (error) {
      this.logger.error(`处理出站非流式聊天请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录非流式聊天请求发送
   */
  private async recordChatRequestNoStreamSent(message: TaskRequestMessage): Promise<void> {
    const { taskId, data } = message.payload;
    
    this.logger.log(`记录非流式聊天请求发送 - TaskID: ${taskId}, Target: ${message.to}`);
    
    // 记录请求详情
    if (data) {
      this.logger.debug(`聊天模型: ${data.model || 'default'}`);
      this.logger.debug(`消息数量: ${data.messages?.length || 0}`);
      this.logger.debug(`温度参数: ${data.temperature || 0.7}`);
      this.logger.debug(`最大令牌: ${data.max_tokens || 2048}`);
      this.logger.debug(`流式模式: false`);
    }
    
    // 这里可以添加发送记录逻辑
    // 例如：
    // 1. 记录请求时间
    // 2. 更新任务状态
    // 3. 记录到数据库
    // 4. 监控请求性能
    
    const requestTime = Date.now();
    this.logger.debug(`非流式聊天请求发送时间: ${new Date(requestTime).toISOString()}`);
  }
}
