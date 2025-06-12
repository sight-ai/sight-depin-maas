import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceRegisterAckMessage, DeviceRegisterAckMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 设备注册确认消息出站处理器
 * 
 * 处理发送出去的设备注册确认消息，用于记录和监控
 */
@MessageHandler({ type: 'device_register_ack', direction: 'outcome' })
@Injectable()
export class OutcomeDeviceRegisterAckHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeDeviceRegisterAckHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理出站设备注册确认消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送设备注册确认消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = DeviceRegisterAckMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`设备注册确认消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const deviceRegisterAckMessage = parseResult.data as DeviceRegisterAckMessage;
    
    try {
      // 记录设备注册确认发送
      await this.recordDeviceRegisterAckSent(deviceRegisterAckMessage);
      
    } catch (error) {
      this.logger.error(`处理出站设备注册确认消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录设备注册确认发送
   */
  private async recordDeviceRegisterAckSent(message: DeviceRegisterAckMessage): Promise<void> {
    const { success, deviceId, message: ackMessage, error } = message.payload;
    
    this.logger.log(`记录设备注册确认发送 - DeviceID: ${deviceId}, Target: ${message.to}, Success: ${success}`);
    
    if (success) {
      this.logger.debug(`成功确认消息: ${ackMessage || '无消息'}`);
    } else {
      this.logger.debug(`失败错误信息: ${error || '无错误信息'}`);
    }
    
    // 这里可以添加发送记录逻辑
    // 例如：
    // 1. 记录确认发送
    // 2. 更新设备状态
    // 3. 记录到数据库
    // 4. 监控确认性能
    
    // 记录发送时间
    const sendTime = Date.now();
    this.logger.debug(`设备注册确认发送时间: ${new Date(sendTime).toISOString()}`);
  }
}
