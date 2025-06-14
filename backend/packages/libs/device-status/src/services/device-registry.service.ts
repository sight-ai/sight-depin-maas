import { Injectable, Inject, Logger } from "@nestjs/common";
import { 
  TDeviceRegistry, 
  TDeviceConfig, 
  TDeviceGateway,
  DeviceCredentials, 
  RegistrationResult,
  DeviceConfig,
  DEVICE_REGISTRY_SERVICE,
  DEVICE_CONFIG_SERVICE,
  DEVICE_GATEWAY_SERVICE
} from "../device-status.interface";

/**
 * 设备注册服务
 * 负责设备的注册、验证和注册状态管理
 */
@Injectable()
export class DeviceRegistryService implements TDeviceRegistry {
  private readonly logger = new Logger(DeviceRegistryService.name);

  constructor(
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig,
    @Inject(DEVICE_GATEWAY_SERVICE)
    private readonly gatewayService: TDeviceGateway
  ) {}

  /**
   * 注册设备
   */
  async register(
    credentials: DeviceCredentials, 
    localModels: any[] = []
  ): Promise<RegistrationResult> {
    try {
      // 验证必需参数
      if (!this.validateCredentials(credentials)) {
        return {
          success: false,
          error: 'Invalid credentials provided'
        };
      }

      // 创建设备配置
      const deviceConfig = this.createDeviceConfig(credentials);

      // 向网关注册
      const gatewayResult = await this.gatewayService.registerWithGateway(
        deviceConfig, 
        localModels
      );

      if (!gatewayResult.success) {
        return gatewayResult;
      }

      // 更新配置
      const finalConfig = {
        ...deviceConfig,
        deviceId: gatewayResult.node_id || deviceConfig.deviceId,
        deviceName: gatewayResult.name || deviceConfig.deviceName,
        isRegistered: true
      };

      await this.configService.updateConfig(finalConfig);

      this.logger.log(`Device registered successfully: ${finalConfig.deviceId}`);

      return {
        success: true,
        node_id: finalConfig.deviceId,
        name: finalConfig.deviceName,
        config: finalConfig
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
   * 清除注册信息
   */
  async clearRegistration(): Promise<boolean> {
    try {
      const currentConfig = this.configService.getCurrentConfig();
      
      await this.configService.updateConfig({
        ...currentConfig,
        isRegistered: false,
        deviceId: '',
        deviceName: '',
        gatewayAddress: '',
        rewardAddress: '',
        key: ''
      });

      this.logger.log('Registration cleared successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear registration:', error);
      return false;
    }
  }

  /**
   * 验证注册状态
   */
  async validateRegistration(config: DeviceConfig): Promise<boolean> {
    if (!config.isRegistered) {
      return false;
    }

    const requiredFields = ['deviceId', 'deviceName', 'gatewayAddress', 'key'];
    return requiredFields.every(field => config[field as keyof DeviceConfig]);
  }

  /**
   * 验证凭据
   */
  private validateCredentials(credentials: DeviceCredentials): boolean {
    return !!(
      credentials.gateway_address &&
      credentials.key &&
      credentials.code &&
      credentials.reward_address
    );
  }

  /**
   * 创建设备配置
   */
  private createDeviceConfig(credentials: DeviceCredentials): DeviceConfig {
    return {
      deviceId: `device_${Date.now()}`,
      deviceName: 'SightAI Device',
      gatewayAddress: credentials.gateway_address,
      rewardAddress: credentials.reward_address,
      key: credentials.key,
      code: credentials.code,
      isRegistered: false
    };
  }
}

const DeviceRegistryServiceProvider = {
  provide: DEVICE_REGISTRY_SERVICE,
  useClass: DeviceRegistryService
};

export default DeviceRegistryServiceProvider;
