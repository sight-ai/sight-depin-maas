import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceRegistrationMessage, DeviceRegistrationMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 设备注册消息出站处理器
 * 
 * 处理发送出去的设备注册消息，用于记录和监控
 */
@MessageHandler({ type: 'device_registration', direction: 'outcome' })
@Injectable()
export class OutcomeDeviceRegistrationHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeDeviceRegistrationHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理出站设备注册消息
   */
  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`发送设备注册消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = DeviceRegistrationMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`设备注册消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const deviceRegistrationMessage = parseResult.data as DeviceRegistrationMessage;
    
    try {
      // 记录设备注册发送
      await this.recordDeviceRegistrationSent(deviceRegistrationMessage);
      
    } catch (error) {
      this.logger.error(`处理出站设备注册消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 记录设备注册发送
   */
  private async recordDeviceRegistrationSent(message: DeviceRegistrationMessage): Promise<void> {
    const { deviceId, deviceInfo } = message.payload;
    
    this.logger.log(`记录设备注册发送 - DeviceID: ${deviceId}, Target: ${message.to}, Name: ${deviceInfo.name}, Type: ${deviceInfo.type}`);
    
    // 这里可以添加发送记录逻辑
    // 例如：
    // 1. 记录注册尝试
    // 2. 更新设备状态
    // 3. 记录到数据库
    // 4. 监控注册性能
    
    // 记录设备能力
    if (deviceInfo.capabilities && deviceInfo.capabilities.length > 0) {
      this.logger.debug(`设备能力: ${deviceInfo.capabilities.join(', ')}`);
    }
    
    // 记录注册时间
    const registrationTime = Date.now();
    this.logger.debug(`设备注册发送时间: ${new Date(registrationTime).toISOString()}`);
  }
}
