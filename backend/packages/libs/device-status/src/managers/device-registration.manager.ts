import { Injectable, Logger } from '@nestjs/common';
import got from 'got-cjs';
import { ModelOfMiner } from '@saito/models';
import { SystemInfoCollector } from '../collectors/system-info.collector';
import { DeviceConfigManager } from './device-config.manager';
import { ErrorHandler } from '../utils/error-handler';

/**
 * 扩展的注册响应接口
 */
export interface ExtendedRegistrationResponse extends ModelOfMiner<'RegistrationResponse'> {
  config?: ModelOfMiner<'DeviceConfig'>;
}

/**
 * 设备注册管理器
 * 
 * 负责：
 * 1. 设备注册流程
 * 2. 自动重连逻辑
 * 3. 注册状态管理
 */
@Injectable()
export class DeviceRegistrationManager {
  private readonly logger = new Logger(DeviceRegistrationManager.name);
  private readonly errorHandler = new ErrorHandler(DeviceRegistrationManager.name);

  constructor(
    private readonly systemInfoCollector: SystemInfoCollector,
    private readonly configManager: DeviceConfigManager
  ) {}

  /**
   * 注册设备
   */
  async registerDevice(
    credentials: ModelOfMiner<'DeviceCredentials'>,
    localModels: any,
    isAutoReconnect: boolean = false
  ): Promise<ExtendedRegistrationResponse> {
    return this.errorHandler.safeExecute(
      async () => {
        const [ipAddress, deviceType, deviceModel] = await Promise.all([
          this.systemInfoCollector.getIpAddress(),
          this.systemInfoCollector.getDeviceType(),
          this.systemInfoCollector.getDeviceModel()
        ]);

        const response = await got.post(`${credentials.gateway_address}/node/register`, {
          headers: { 'Content-Type': 'application/json' },
          json: {
            code: credentials.code,
            gateway_address: credentials.gateway_address,
            reward_address: credentials.reward_address,
            device_type: deviceType,
            gpu_type: deviceModel,
            ip: ipAddress,
            local_models: localModels
          },
        }).json() as any;

        if (response.success && response.data) {
          const newConfig: ModelOfMiner<'DeviceConfig'> = {
            deviceId: response.data.node_id || '',
            deviceName: response.data.name || 'Device',
            rewardAddress: credentials.reward_address,
            gatewayAddress: credentials.gateway_address,
            key: credentials.key,
            code: credentials.code,
            isRegistered: true
          };

          // 保存配置（只在非自动重连时保存）
          if (!isAutoReconnect) {
            await this.configManager.saveConfigToStorage(newConfig, credentials.basePath);
          }

          return {
            success: true,
            error: '',
            node_id: response.data.node_id,
            name: response.data.name,
            config: newConfig
          };
        }

        return {
          success: false,
          error: response.message || 'Registration failed',
          node_id: undefined,
          name: undefined
        };
      },
      'device-registration',
      {
        success: false,
        error: 'Registration failed due to system error',
        node_id: undefined,
        name: undefined
      }
    );
  }

  /**
   * 检查是否可以自动重连
   */
  canAutoReconnect(): boolean {
    const config = this.configManager.getCurrentConfig();
    return config.isRegistered && !!config.gatewayAddress && !!config.key;
  }

  /**
   * 创建重连凭据
   */
  createReconnectCredentials(): ModelOfMiner<'DeviceCredentials'> | null {
    if (!this.canAutoReconnect()) {
      return null;
    }

    const config = this.configManager.getCurrentConfig();
    return {
      gateway_address: config.gatewayAddress,
      reward_address: config.rewardAddress,
      key: config.key,
      code: config.code,
      basePath: this.configManager.getBasePath()
    };
  }

  /**
   * 清除注册信息
   */
  async clearRegistration(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        return await this.configManager.resetConfig();
      },
      'clear-registration',
      false
    );
  }

  /**
   * 获取注册状态
   */
  getRegistrationStatus(): {
    isRegistered: boolean;
    deviceId: string;
    deviceName: string;
    gatewayAddress: string;
  } {
    const config = this.configManager.getCurrentConfig();
    return {
      isRegistered: config.isRegistered,
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      gatewayAddress: config.gatewayAddress
    };
  }
}
