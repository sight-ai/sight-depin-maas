import { Injectable, Logger } from "@nestjs/common";
import { RegistrationStorage, RegistrationStatus } from "../registration-storage";
import {
  TDeviceConfig,
  DeviceConfig,
  DEVICE_CONFIG_SERVICE
} from "../device-status.interface";

/**
 * 设备配置服务
 * 负责设备配置的存储、读取和管理
 */
@Injectable()
export class DeviceConfigService implements TDeviceConfig {
  private readonly logger = new Logger(DeviceConfigService.name);
  private readonly storage = new RegistrationStorage();
  private currentConfig: DeviceConfig;

  constructor() {
    this.currentConfig = this.loadConfig();
  }

  /**
   * 初始化配置服务
   */
  async initialize(): Promise<void> {
    try {
      this.currentConfig = this.loadConfig();
      this.logger.debug('Device config initialized');
    } catch (error) {
      this.logger.error('Failed to initialize device config:', error);
      this.currentConfig = this.getDefaultConfig();
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): DeviceConfig {
    return { ...this.currentConfig };
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<DeviceConfig>): Promise<void> {
    try {
      this.currentConfig = {
        ...this.currentConfig,
        ...updates
      };

      this.saveConfig(this.currentConfig);
      this.logger.debug('Device config updated');
    } catch (error) {
      this.logger.error('Failed to update device config:', error);
      throw error;
    }
  }

  /**
   * 获取设备ID
   */
  getDeviceId(): string {
    return this.currentConfig.deviceId || '';
  }

  /**
   * 获取设备名称
   */
  getDeviceName(): string {
    return this.currentConfig.deviceName || '';
  }

  /**
   * 获取网关地址
   */
  getGatewayAddress(): string {
    return this.currentConfig.gatewayAddress || '';
  }

  /**
   * 获取奖励地址
   */
  getRewardAddress(): string {
    return this.currentConfig.rewardAddress || '';
  }

  /**
   * 获取设备密钥/代码
   */
  getCode(): string {
    return this.currentConfig.code || '';
  }

  /**
   * 检查是否已注册
   */
  isRegistered(): boolean {
    return this.currentConfig.isRegistered || false;
  }

  /**
   * 从存储加载配置
   */
  private loadConfig(): DeviceConfig {
    try {
      const storedConfig = this.storage.loadRegistrationInfo();
      
      if (storedConfig) {
        return {
          deviceId: storedConfig.deviceId || '',
          deviceName: storedConfig.deviceName || '',
          gatewayAddress: storedConfig.gatewayAddress || '',
          rewardAddress: storedConfig.rewardAddress || '',
          basePath: storedConfig.basePath || '',
          code: storedConfig.code || '',
          isRegistered: storedConfig.isRegistered || false
        };
      }

      return this.getDefaultConfig();
    } catch (error) {
      this.logger.error('Failed to load config from storage:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 保存配置到存储（带 basePath 和 DID 文档支持）
   */
  async saveConfigToStorage(config: DeviceConfig, basePath?: string, didDoc?: any): Promise<void> {
    try {
      this.storage.saveRegistrationInfo({
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        gatewayAddress: config.gatewayAddress,
        rewardAddress: config.rewardAddress,
        code: config.code || '',
        isRegistered: config.isRegistered,
        basePath,
        didDoc
      });
      this.logger.debug('Config saved to storage with basePath:', basePath, 'and DID doc:', !!didDoc);
    } catch (error) {
      this.logger.error('Failed to save config to storage:', error);
      throw error;
    }
  }

  /**
   * 保存配置到存储
   */
  private saveConfig(config: DeviceConfig): void {
    try {
      // 先尝试加载现有的注册信息，保留DID文档
      const existingInfo = this.storage.loadRegistrationInfo();

      this.storage.saveRegistrationInfo({
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        gatewayAddress: config.gatewayAddress,
        basePath: config.basePath,
        rewardAddress: config.rewardAddress,
        code: config.code || '',
        isRegistered: config.isRegistered,
        // 保留现有的DID文档
        didDoc: existingInfo?.didDoc
      });
    } catch (error) {
      this.logger.error('Failed to save config to storage:', error);
      throw error;
    }
  }

  /**
   * 更新注册状态
   */
  updateRegistrationStatus(status: RegistrationStatus, error?: string): boolean {
    return this.storage.updateRegistrationStatus(status, error);
  }

  /**
   * 获取注册状态
   */
  getRegistrationStatus(): RegistrationStatus {
    return this.storage.getRegistrationStatus();
  }

  /**
   * 获取详细的注册状态信息
   */
  getRegistrationStatusInfo(): {
    status: RegistrationStatus;
    error?: string;
    lastAttempt?: string;
  } {
    const info = this.storage.loadRegistrationInfo();
    return {
      status: info?.registrationStatus || RegistrationStatus.NOT_STARTED,
      error: info?.registrationError,
      lastAttempt: info?.lastRegistrationAttempt
    };
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): DeviceConfig {
    return {
      deviceId: '',
      deviceName: '',
      gatewayAddress: '',
      rewardAddress: '',
      basePath: '',
      code: '',
      isRegistered: false
    };
  }
}

const DeviceConfigServiceProvider = {
  provide: DEVICE_CONFIG_SERVICE,
  useClass: DeviceConfigService
};

export default DeviceConfigServiceProvider;
