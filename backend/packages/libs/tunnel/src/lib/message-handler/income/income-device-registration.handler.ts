import { Inject, Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceRegistrationMessage, DeviceRegistrationMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 设备注册消息处理器
 * 
 * 处理接收到的设备注册消息，通常来自网关或其他设备
 */
@MessageHandler({ type: 'device_registration', direction: 'income' })
@Injectable()
export class IncomeDeviceRegistrationHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeDeviceRegistrationHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
  ) {
    super();
  }

  /**
   * 处理入站设备注册消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    this.logger.debug(`收到设备注册消息: ${JSON.stringify(message)}`);

    // 验证消息格式
    const parseResult = DeviceRegistrationMessageSchema.safeParse(message);
    if (!parseResult.success) {
      this.logger.error(`设备注册消息格式无效: ${parseResult.error.message}`);
      return;
    }

    const deviceRegistrationMessage = parseResult.data as DeviceRegistrationMessage;
    
    try {
      // 处理设备注册
      await this.processDeviceRegistration(deviceRegistrationMessage);
      
    } catch (error) {
      this.logger.error(`处理设备注册消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理设备注册
   */
  private async processDeviceRegistration(message: DeviceRegistrationMessage): Promise<void> {
    const { deviceId, deviceInfo } = message.payload;
    
    this.logger.log(`处理设备注册 - DeviceID: ${deviceId}, Name: ${deviceInfo.name}, Type: ${deviceInfo.type}`);
    
    try {
      // 验证设备信息
      await this.validateDeviceInfo(deviceId, deviceInfo);
      
      // 注册设备
      await this.registerDevice(deviceId, deviceInfo, message.from);
      
      // 发送注册确认（如果需要）
      await this.sendRegistrationConfirmation(deviceId, message.from);
      
      this.logger.log(`设备注册成功: ${deviceId}`);
      
    } catch (error) {
      this.logger.error(`设备注册失败: ${error instanceof Error ? error.message : '未知错误'}`);
      await this.sendRegistrationError(deviceId, message.from, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 验证设备信息
   */
  private async validateDeviceInfo(deviceId: string, deviceInfo: any): Promise<void> {
    // 验证设备ID格式
    if (!deviceId || deviceId.trim().length === 0) {
      throw new Error('设备ID不能为空');
    }

    // 验证设备名称
    if (!deviceInfo.name || deviceInfo.name.trim().length === 0) {
      throw new Error('设备名称不能为空');
    }

    // 验证设备类型
    if (!deviceInfo.type || deviceInfo.type.trim().length === 0) {
      throw new Error('设备类型不能为空');
    }

    this.logger.debug(`设备信息验证通过: ${deviceId}`);
  }

  /**
   * 注册设备
   */
  private async registerDevice(deviceId: string, deviceInfo: any, fromDevice: string): Promise<void> {
    this.logger.debug(`注册设备 - DeviceID: ${deviceId}, From: ${fromDevice}`);
    // 记录设备注册
    this.logger.log(`设备已注册: ${deviceId} (${deviceInfo.name})`);
  }

  /**
   * 发送注册确认
   */
  private async sendRegistrationConfirmation(deviceId: string, targetDevice: string): Promise<void> {
    // 这里可以发送注册确认消息
    // 目前只记录日志
    this.logger.debug(`发送注册确认 - DeviceID: ${deviceId}, Target: ${targetDevice}`);
  }

  /**
   * 发送注册错误
   */
  private async sendRegistrationError(deviceId: string, targetDevice: string, error: string): Promise<void> {
    // 这里可以发送注册错误消息
    // 目前只记录日志
    this.logger.error(`发送注册错误 - DeviceID: ${deviceId}, Target: ${targetDevice}, Error: ${error}`);
  }
}
