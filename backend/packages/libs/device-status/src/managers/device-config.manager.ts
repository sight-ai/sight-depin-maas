import { Injectable, Logger } from '@nestjs/common';
import { RegistrationStorage, RegistrationInfo } from '../registration-storage';
import { ModelOfMiner } from '@saito/models';

/**
 * 设备配置管理器
 * 
 * 负责：
 * 1. 统一设备配置管理
 * 2. 整合注册信息存储
 * 3. 自动配置同步
 * 4. 配置验证和校正
 */
@Injectable()
export class DeviceConfigManager {
  private readonly logger = new Logger(DeviceConfigManager.name);
  private readonly registrationStorage = new RegistrationStorage();
  
  private deviceConfig: ModelOfMiner<'DeviceConfig'> = {
    deviceId: '24dea62e-95df-4549-b3ba-c9522cd5d5c1',
    deviceName: 'local_device_name',
    rewardAddress: '',
    gatewayAddress: '',
    key: '',
    code: '',
    isRegistered: false
  };

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfigFromStorage();
    } catch (error) {
      this.logger.error(`Failed to initialize device config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 从存储加载配置
   */
  async loadConfigFromStorage(): Promise<ModelOfMiner<'DeviceConfig'>> {
    try {
      // 首先尝试从注册存储加载
      const savedInfo = this.registrationStorage.loadRegistrationInfo();
      if (savedInfo && savedInfo.isRegistered) {
        this.logger.log('Loading device configuration from registration storage');
        this.deviceConfig = this.convertRegistrationInfoToConfig(savedInfo);
      } else {
        this.logger.log('No valid registration information found, using default configuration');
      }

      return this.deviceConfig;
    } catch (error) {
      this.logger.error(`Failed to load config from storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.deviceConfig;
    }
  }

  /**
   * 保存配置到存储
   */
  async saveConfigToStorage(config: ModelOfMiner<'DeviceConfig'>, basePath?: string): Promise<boolean> {
    try {
      // 更新内存中的配置
      this.deviceConfig = { ...config };

      // 转换为注册信息格式并保存
      const registrationInfo: RegistrationInfo = {
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        rewardAddress: config.rewardAddress,
        gatewayAddress: config.gatewayAddress,
        key: config.key,
        code: config.code,
        isRegistered: config.isRegistered,
        basePath
      };

      const success = this.registrationStorage.saveRegistrationInfo(registrationInfo);
      
      if (success) {
        this.logger.log('Device configuration saved successfully');
      } else {
        this.logger.error('Failed to save device configuration');
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): ModelOfMiner<'DeviceConfig'> {
    return { ...this.deviceConfig };
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<ModelOfMiner<'DeviceConfig'>>): Promise<boolean> {
    try {
      const newConfig = { ...this.deviceConfig, ...updates };
      
      // 验证配置
      if (!this.validateConfig(newConfig)) {
        this.logger.error('Invalid configuration provided');
        return false;
      }

      // 保存配置
      return await this.saveConfigToStorage(newConfig);
    } catch (error) {
      this.logger.error(`Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 检查设备是否已注册
   */
  isRegistered(): boolean {
    return this.deviceConfig.isRegistered && 
           !!this.deviceConfig.deviceId && 
           !!this.deviceConfig.gatewayAddress;
  }

  /**
   * 获取设备ID
   */
  getDeviceId(): string {
    return this.deviceConfig.deviceId;
  }

  /**
   * 获取设备名称
   */
  getDeviceName(): string {
    return this.deviceConfig.deviceName;
  }

  /**
   * 获取奖励地址
   */
  getRewardAddress(): string {
    return this.deviceConfig.rewardAddress;
  }

  /**
   * 获取网关地址
   */
  getGatewayAddress(): string {
    return this.deviceConfig.gatewayAddress;
  }

  /**
   * 获取认证密钥
   */
  getKey(): string {
    return this.deviceConfig.key;
  }

  /**
   * 获取注册码
   */
  getCode(): string {
    return this.deviceConfig.code;
  }

  /**
   * 重置配置为默认值
   */
  async resetConfig(): Promise<boolean> {
    try {
      this.deviceConfig = {
        deviceId: '24dea62e-95df-4549-b3ba-c9522cd5d5c1',
        deviceName: 'local_device_name',
        rewardAddress: '',
        gatewayAddress: '',
        key: '',
        code: '',
        isRegistered: false
      };

      // 删除存储的注册信息
      this.registrationStorage.deleteRegistrationInfo();
      
      this.logger.log('Device configuration reset to default');
      return true;
    } catch (error) {
      this.logger.error(`Failed to reset config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 从数据库同步配置
   */
  async syncFromDatabase(currentDevice: ModelOfMiner<'DeviceStatusModule'>): Promise<boolean> {
    try {
      if (currentDevice && currentDevice.status === 'connected') {
        const dbConfig: ModelOfMiner<'DeviceConfig'> = {
          deviceId: currentDevice.id,
          deviceName: currentDevice.name,
          rewardAddress: currentDevice.reward_address || '',
          gatewayAddress: currentDevice.gateway_address || '',
          key: currentDevice.key || '',
          code: currentDevice.code || '',
          isRegistered: true
        };

        return await this.saveConfigToStorage(dbConfig);
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to sync from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 获取已上报的模型列表
   */
  getReportedModels(): string[] {
    return this.registrationStorage.getReportedModels();
  }

  /**
   * 更新已上报的模型列表
   */
  updateReportedModels(models: string[]): boolean {
    return this.registrationStorage.updateReportedModels(models);
  }

  /**
   * 检查是否有保存的注册信息
   */
  hasRegistrationInfo(): boolean {
    return this.registrationStorage.hasRegistrationInfo();
  }

  /**
   * 获取基础路径（用于 WebSocket 连接）
   */
  getBasePath(): string | undefined {
    const savedInfo = this.registrationStorage.loadRegistrationInfo();
    return savedInfo?.basePath;
  }

  /**
   * 验证配置有效性
   */
  private validateConfig(config: ModelOfMiner<'DeviceConfig'>): boolean {
    // 基本字段检查
    if (!config.deviceId || !config.deviceName) {
      this.logger.warn('Device ID and name are required');
      return false;
    }

    // 如果标记为已注册，检查必要的注册信息
    if (config.isRegistered) {
      if (!config.gatewayAddress || !config.key || !config.code) {
        this.logger.warn('Gateway address, key, and code are required for registered devices');
        return false;
      }

      // 验证网关地址格式
      try {
        new URL(config.gatewayAddress);
      } catch {
        this.logger.warn('Invalid gateway address format');
        return false;
      }
    }

    return true;
  }

  /**
   * 将注册信息转换为设备配置
   */
  private convertRegistrationInfoToConfig(info: RegistrationInfo): ModelOfMiner<'DeviceConfig'> {
    return {
      deviceId: info.deviceId,
      deviceName: info.deviceName,
      rewardAddress: info.rewardAddress,
      gatewayAddress: info.gatewayAddress,
      key: info.key,
      code: info.code,
      isRegistered: info.isRegistered
    };
  }

  /**
   * 获取配置摘要（用于日志记录，不包含敏感信息）
   */
  getConfigSummary(): any {
    return {
      deviceId: this.deviceConfig.deviceId,
      deviceName: this.deviceConfig.deviceName,
      isRegistered: this.deviceConfig.isRegistered,
      hasGatewayAddress: !!this.deviceConfig.gatewayAddress,
      hasKey: !!this.deviceConfig.key,
      hasCode: !!this.deviceConfig.code,
      hasRewardAddress: !!this.deviceConfig.rewardAddress
    };
  }
}
