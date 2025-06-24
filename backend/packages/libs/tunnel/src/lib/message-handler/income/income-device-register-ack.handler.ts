import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceRegisterAckMessage, DeviceRegisterAckMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import {
  TDeviceHeartbeat,
  TDeviceConfig,
  TDeviceSystem,
  DEVICE_HEARTBEAT_SERVICE,
  DEVICE_CONFIG_SERVICE,
  DEVICE_SYSTEM_SERVICE
} from '@saito/device-status';

/**
 * 设备注册确认消息处理器
 * 
 * 处理接收到的设备注册确认消息，通常来自网关
 */
@MessageHandler({ type: 'device_register_ack', direction: 'income' })
@Injectable()
export class IncomeDeviceRegisterAckHandler extends IncomeBaseMessageHandler implements OnModuleDestroy {
  private readonly logger = new Logger(IncomeDeviceRegisterAckHandler.name);
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒

  constructor(
    @Inject('PEER_ID') private readonly injectedPeerId: string,
    @Inject(DEVICE_HEARTBEAT_SERVICE)
    private readonly heartbeatService: TDeviceHeartbeat,
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig,
    @Inject(DEVICE_SYSTEM_SERVICE)
    private readonly systemService: TDeviceSystem
  ) {
    super();
  }

  protected override get peerId(): string {
    return this.injectedPeerId;
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

    try {
      // 1. 启动定时心跳服务
      await this.startHeartbeatService();

      // 2. 立即发送一次心跳
      await this.sendImmediateHeartbeat();

      this.logger.log(`✅ 注册成功后处理完成 - 心跳服务已启动`);
    } catch (error) {
      this.logger.error(`注册成功后处理失败:`, error);
    }
  }

  /**
   * 处理注册失败
   */
  private async handleRegistrationFailure(deviceId: string, error?: string): Promise<void> {
    this.logger.error(`处理设备注册失败 - DeviceID: ${deviceId}, Error: ${error || '未知错误'}`);

    // 记录注册失败时间
    const failureTime = Date.now();
    this.logger.debug(`设备注册失败时间: ${new Date(failureTime).toISOString()}`);

    // 停止心跳服务（如果正在运行）
    this.stopHeartbeatService();

    // 这里可以添加具体的失败处理逻辑
    // 例如：重试注册、通知用户、记录错误等
  }

  /**
   * 启动心跳服务
   */
  private async startHeartbeatService(): Promise<void> {
    // 如果已经有心跳在运行，先停止
    if (this.heartbeatInterval) {
      this.stopHeartbeatService();
    }

    this.logger.log(`🚀 启动定时心跳服务 - 间隔: ${this.HEARTBEAT_INTERVAL}ms`);

    // 启动定时心跳
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        this.logger.error('定时心跳发送失败:', error);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.logger.log(`✅ 心跳服务已启动`);
  }

  /**
   * 停止心跳服务
   */
  private stopHeartbeatService(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.log(`⏹️ 心跳服务已停止`);
    }
  }

  /**
   * 立即发送一次心跳
   */
  private async sendImmediateHeartbeat(): Promise<void> {
    this.logger.log(`💓 发送立即心跳`);
    await this.sendHeartbeat();
  }

  /**
   * 发送心跳
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      // 获取当前设备配置
      const config = this.configService.getCurrentConfig();

      if (!config.isRegistered || !config.gatewayAddress) {
        this.logger.debug('设备未注册或网关地址为空，跳过心跳发送');
        return;
      }

      // 收集系统信息
      const systemInfo = await this.systemService.collectSystemInfo();

      // 发送心跳
      await this.heartbeatService.sendHeartbeat(config, systemInfo);

      this.logger.debug(`💓 心跳发送成功 - DeviceID: ${config.deviceId}`);
    } catch (error) {
      this.logger.error('心跳发送失败:', error);
      // 不抛出错误，避免中断心跳服务
    }
  }

  /**
   * 清理资源
   */
  onModuleDestroy(): void {
    this.stopHeartbeatService();
  }
}
