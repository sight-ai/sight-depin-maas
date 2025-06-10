import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';
import {
  TDeviceStatusService,
  TDeviceRegistry,
  TDeviceConfig,
  TDeviceDatabase,
  TDeviceHeartbeat,
  TDeviceSystem,
  DeviceCredentials,
  RegistrationResponse,
  DeviceStatusData,
  DeviceListItem,
  TaskResult,
  EarningResult,
  DeviceStatus,
  DEVICE_REGISTRY_SERVICE,
  DEVICE_CONFIG_SERVICE,
  DEVICE_DATABASE_SERVICE,
  DEVICE_HEARTBEAT_SERVICE,
  DEVICE_SYSTEM_SERVICE,
  DeviceStatusService
} from "./device-status.interface";

/**
 * 优化的设备状态服务
 */
@Injectable()
export class DefaultDeviceStatusService implements TDeviceStatusService {
  private readonly logger = new Logger(DefaultDeviceStatusService.name);

  constructor(
    @Inject(DEVICE_REGISTRY_SERVICE)
    private readonly registryService: TDeviceRegistry,
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig,
    @Inject(DEVICE_DATABASE_SERVICE)
    private readonly databaseService: TDeviceDatabase,
    @Inject(DEVICE_HEARTBEAT_SERVICE)
    private readonly heartbeatService: TDeviceHeartbeat,
    @Inject(DEVICE_SYSTEM_SERVICE)
    private readonly systemService: TDeviceSystem
  ) {
    this.initializeService();
  }

  /**
   * 初始化服务
   */
  private async initializeService(): Promise<void> {
    try {
      await this.configService.initialize();
      this.logger.debug('Device status service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize device status service:', error);
    }
  }

  // ========================================
  // 核心业务方法
  // ========================================

  /**
   * 注册设备
   */
  async register(credentials: DeviceCredentials): Promise<RegistrationResponse> {
    try {
      const localModels = await this.systemService.getLocalModels();
      const result = await this.registryService.register(credentials, localModels);

      if (result.success && result.config) {
        // 更新数据库状态
        await this.databaseService.updateDeviceStatus(
          result.config.deviceId,
          result.config.deviceName,
          'connected',
          result.config.rewardAddress
        );

        // 启动心跳
        this.heartbeat();
      }

      return {
        success: result.success,
        error: result.error || 'Unknown error',
        node_id: result.node_id,
        name: result.name
      };
    } catch (error) {
      this.logger.error('Registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * 发送心跳
   */
  async heartbeat(): Promise<void> {
    try {
      const config = this.configService.getCurrentConfig();

      if (!config.isRegistered) {
        return;
      }

      const systemInfo = await this.systemService.collectSystemInfo();
      await this.heartbeatService.sendHeartbeat(config, systemInfo);
    } catch (error) {
      this.logger.error('Heartbeat failed:', error);
    }
  }

  /**
   * 清除注册信息
   */
  async clearRegistration(): Promise<boolean> {
    return this.registryService.clearRegistration();
  }

  // ========================================
  // 状态检查方法
  // ========================================

  async checkStatus(): Promise<boolean> {
    return this.systemService.checkFrameworkStatus();
  }

  async isOllamaOnline(): Promise<boolean> {
    return this.checkStatus();
  }

  async isFrameworkOnline(): Promise<boolean> {
    return this.isOllamaOnline();
  }

  async getLocalModels() {
    return this.systemService.getLocalModels();
  }

  // ========================================
  // 数据库操作方法
  // ========================================

  async updateDeviceStatus(
    deviceId: string,
    name: string,
    status: DeviceStatus,
    rewardAddress: string
  ): Promise<DeviceStatusData> {
    return this.databaseService.updateDeviceStatus(deviceId, name, status, rewardAddress);
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatusData | null> {
    return this.databaseService.getDeviceStatus(deviceId);
  }

  async markInactiveDevicesOffline(inactiveDuration: number): Promise<DeviceStatusData[]> {
    return this.databaseService.markInactiveDevicesOffline(inactiveDuration);
  }

  async getDeviceList(): Promise<DeviceListItem[]> {
    return this.databaseService.getDeviceList();
  }

  async getCurrentDevice(): Promise<DeviceStatusData | null> {
    return this.databaseService.getCurrentDevice();
  }

  async getDeviceTasks(deviceId: string): Promise<TaskResult[]> {
    return this.databaseService.getDeviceTasks(deviceId);
  }

  async getDeviceEarnings(deviceId: string): Promise<EarningResult[]> {
    return this.databaseService.getDeviceEarnings(deviceId);
  }

  // ========================================
  // 配置访问方法
  // ========================================

  async getGatewayStatus(): Promise<{ isRegistered: boolean }> {
    return { isRegistered: this.configService.isRegistered() };
  }

  async getDeviceId(): Promise<string> {
    return this.configService.getDeviceId();
  }

  async getDeviceName(): Promise<string> {
    return this.configService.getDeviceName();
  }

  async getRewardAddress(): Promise<string> {
    return this.configService.getRewardAddress();
  }

  async getGatewayAddress(): Promise<string> {
    return this.configService.getGatewayAddress();
  }

  async getKey(): Promise<string> {
    return this.configService.getKey();
  }

  async isRegistered(): Promise<boolean> {
    return this.configService.isRegistered();
  }

  async getDeviceType(): Promise<string> {
    return this.systemService.getDeviceType();
  }

  async getDeviceModel(): Promise<string> {
    return this.systemService.getDeviceModel();
  }

  async getDeviceInfo(): Promise<string> {
    return this.systemService.getDeviceInfo();
  }

  // ========================================
  // 定时任务
  // ========================================

  /**
   * 定时检查设备状态 (每30秒执行一次)
   */
  @Cron('*/30 * * * * *')
  async checkDeviceStatus(): Promise<void> {
    try {
      const config = this.configService.getCurrentConfig();

      if (!config.deviceId || !config.deviceName) {
        return;
      }

      const isOnline = await this.checkStatus();
      const status: DeviceStatus = isOnline ? "connected" : "disconnected";

      if (isOnline) {
        await this.updateDeviceStatus(
          config.deviceId,
          config.deviceName,
          status,
          config.rewardAddress
        );
      } else {
        const inactiveDuration = 1000 * 60; // 1分钟
        await this.markInactiveDevicesOffline(inactiveDuration);
      }
    } catch (error) {
      this.logger.error('Periodic status check failed:', error);
    }
  }
}

const DeviceStatusServiceProvider = {
  provide: DeviceStatusService,
  useClass: DefaultDeviceStatusService,
};

export default DeviceStatusServiceProvider;
