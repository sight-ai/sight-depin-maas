import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceRegisterAckMessage, DeviceRegisterAckMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 设备注册确认消息处理器
 * 
 * 处理接收到的设备注册确认消息，通常来自网关
 */
@MessageHandler({ type: 'device_register_ack', direction: 'income' })
@Injectable()
export class IncomeDeviceRegisterAckHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeDeviceRegisterAckHandler.name);

  constructor(
  ) {
    super();
  }

  /**
   * 处理入站设备注册确认消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`收到设备注册确认消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = DeviceRegisterAckMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`设备注册确认消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const deviceRegisterAckMessage = parseResult.data as DeviceRegisterAckMessage;
    
    try {
      // 处理设备注册确认
      await this.processDeviceRegisterAck(deviceRegisterAckMessage);
      
    } catch (error) {
      this.logger.error(`处理设备注册确认消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理设备注册确认
   */
  private async processDeviceRegisterAck(message: DeviceRegisterAckMessage): Promise<void> {
    const { success, deviceId, message: ackMessage, error } = message.payload;
    
    if (success) {
      this.logger.log(`✅ 设备注册确认成功 - DeviceID: ${deviceId}`);
      if (ackMessage) {
        this.logger.debug(`确认消息: ${ackMessage}`);
      }
      
      // 这里可以添加注册成功后的处理逻辑
      // 例如：
      // 1. 更新本地设备状态
      // 2. 启动心跳服务
      // 3. 记录注册成功事件
      // 4. 通知其他服务
      
      await this.handleRegistrationSuccess(deviceId, ackMessage);
      
    } else {
      this.logger.error(`❌ 设备注册确认失败 - DeviceID: ${deviceId}`);
      if (error) {
        this.logger.error(`错误信息: ${error}`);
      }
      
      // 处理注册失败
      await this.handleRegistrationFailure(deviceId, error);
    }
  }

  /**
   * 处理注册成功
   */
  private async handleRegistrationSuccess(deviceId: string, message?: string): Promise<void> {
    this.logger.log(`处理设备注册成功 - DeviceID: ${deviceId}`);
    
    // 记录注册成功时间
    const registrationTime = Date.now();
    this.logger.debug(`设备注册成功时间: ${new Date(registrationTime).toISOString()}`);
    
    // 这里可以添加具体的成功处理逻辑
    // 例如：更新设备状态、启动服务等
  }

  /**
   * 处理注册失败
   */
  private async handleRegistrationFailure(deviceId: string, error?: string): Promise<void> {
    this.logger.error(`处理设备注册失败 - DeviceID: ${deviceId}, Error: ${error || '未知错误'}`);
    
    // 记录注册失败时间
    const failureTime = Date.now();
    this.logger.debug(`设备注册失败时间: ${new Date(failureTime).toISOString()}`);
    
    // 这里可以添加具体的失败处理逻辑
    // 例如：重试注册、通知用户、记录错误等
  }
}
