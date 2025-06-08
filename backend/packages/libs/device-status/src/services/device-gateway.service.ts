import { Injectable, Logger, Inject } from "@nestjs/common";
import got from 'got-cjs';
import {
  TDeviceGateway,
  TDeviceConfig,
  DeviceConfig,
  SystemInfo,
  RegistrationResult,
  DEVICE_GATEWAY_SERVICE,
  DEVICE_CONFIG_SERVICE
} from "../device-status.interface";
import { TunnelService } from "@saito/tunnel";
import { DynamicConfigService } from "./dynamic-config.service";

/**
 * 设备网关服务
 * 负责与网关的所有HTTP通信
 */
@Injectable()
export class DeviceGatewayService implements TDeviceGateway {
  private readonly logger = new Logger(DeviceGatewayService.name);

  constructor(
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly deviceConfigService: TDeviceConfig,
    private readonly tunnelService: TunnelService,
    private readonly dynamicConfigService: DynamicConfigService
  ) {}

  /**
   * 向网关注册设备
   */
  async registerWithGateway(
    config: DeviceConfig,
    localModels: any[],
    systemInfo?: SystemInfo
  ): Promise<RegistrationResult> {
    try {
      const registrationUrl = `${config.gatewayAddress}/node/register`;
      
      this.logger.log(`Registering device with gateway: ${registrationUrl}`);

      // 如果没有提供系统信息，则收集系统信息
      let deviceSystemInfo = systemInfo;
      if (!deviceSystemInfo) {
        try {
          const systemService = new (await import('./device-system.service')).DeviceSystemService();
          deviceSystemInfo = await systemService.collectSystemInfo();
        } catch (error) {
          this.logger.warn('Failed to collect system info for registration:', error);
          deviceSystemInfo = {
            os: 'Unknown',
            cpu: 'Unknown',
            memory: 'Unknown',
            graphics: [],
            ipAddress: 'Unknown',
            deviceType: process.env['DEVICE_TYPE'] || 'Unknown',
            deviceModel: process.env['GPU_MODEL'] || 'Unknown'
          };
        }
      }

      const payload = {
        code: config.code,
        gateway_address: config.gatewayAddress,
        reward_address: config.rewardAddress,
        device_type: deviceSystemInfo.deviceType,
        gpu_type: deviceSystemInfo.deviceModel,
        ip: deviceSystemInfo.ipAddress,
        device_name: config.deviceName,
        local_models: localModels.map(model => ({
          name: model.name,
          size: model.size,
          digest: model.digest || ''
        }))
      };
      const response = await got.post(registrationUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key}`
        },
        json: payload,
        timeout: {
          request: 15000 // 15 seconds timeout
        },
        throwHttpErrors: false
      });
      const responseData = JSON.parse(response.body);
      if (response.statusCode === 200 || response.statusCode === 201) {
        // 从响应数据中提取设备信息
        const deviceData = responseData.data || responseData;
        const nodeId = deviceData.node_id || deviceData.device_id;

        this.logger.log(`Gateway registration successful: ${nodeId}`);

        // 注册成功，更新本地配置文件中的设备ID
        await this.updateLocalConfigAfterSuccessfulRegistration(responseData, config);

        // 获取 basePath 并创建 socket 连接
        const basePath = await this.dynamicConfigService.getBasePath();
        this.tunnelService.createSocket(config.gatewayAddress, config.key, config.code, basePath);
        await this.tunnelService.connectSocket(nodeId);

        return {
          success: true,
          node_id: nodeId,
          name: deviceData.name || deviceData.device_name || config.deviceName,
          status: deviceData.status
        };
      } else {
        this.logger.error(`Gateway registration failed with status ${response.statusCode}:`, responseData);

        // 注册失败，清理自动注册数据并提示重新注册
        await this.handleRegistrationFailure(responseData.message || responseData.error || `Gateway returned status ${response.statusCode}`);

        return {
          success: false,
          error: responseData.message || responseData.error || `Gateway returned status ${response.statusCode}`
        };
      }
    } catch (error) {
      this.logger.error('Failed to register with gateway:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gateway communication failed'
      };
    }
  }

  /**
   * 向网关发送心跳
   */
  async sendHeartbeatToGateway(
    config: DeviceConfig, 
    systemInfo: SystemInfo
  ): Promise<void> {
    try {
      const heartbeatUrl = `${config.gatewayAddress}/node/heartbeat`;
      
      const payload = {
        device_id: config.deviceId,
        status: 'online',
        timestamp: new Date().toISOString(),
        system_info: {
          os: systemInfo.os,
          cpu: systemInfo.cpu,
          memory: systemInfo.memory,
          graphics: systemInfo.graphics,
          ip_address: systemInfo.ipAddress,
          device_type: systemInfo.deviceType,
          device_model: systemInfo.deviceModel
        }
      };

      const response = await got.post(heartbeatUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key}`
        },
        json: payload,
        timeout: {
          request: 10000 // 10 seconds timeout
        },
        throwHttpErrors: false
      });

      if (response.statusCode === 200) {
        this.logger.debug('Heartbeat sent successfully to gateway');
      } else {
        this.logger.warn(`Gateway heartbeat returned status ${response.statusCode}`);
      }
    } catch (error) {
      this.logger.error('Failed to send heartbeat to gateway:', error);
      throw error;
    }
  }

  /**
   * 检查网关状态
   */
  async checkGatewayStatus(gatewayAddress: string): Promise<boolean> {
    try {
      const statusUrl = `${gatewayAddress}/`;

      const response = await got.get(statusUrl, {
        timeout: {
          request: 5000 // 5 seconds timeout
        },
        throwHttpErrors: false
      });
      return response.statusCode === 200;
    } catch (error) {
      this.logger.debug('Gateway status check failed:', error);
      return false;
    }
  }

  /**
   * 注册成功后更新本地配置文件中的设备ID
   */
  private async updateLocalConfigAfterSuccessfulRegistration(
    responseData: any,
    originalConfig: DeviceConfig
  ): Promise<void> {
    try {
      this.logger.log('Updating local configuration after successful registration...');

      // 从响应中提取设备ID（处理嵌套的data结构）
      const deviceData = responseData.data || responseData;
      const newDeviceId = deviceData.node_id || deviceData.device_id;

      if (newDeviceId && newDeviceId !== originalConfig.deviceId) {
        this.logger.log(`Updating device ID from ${originalConfig.deviceId} to ${newDeviceId}`);

        // 更新配置
        const updatedConfig: Partial<DeviceConfig> = {
          deviceId: newDeviceId,
          isRegistered: true
        };

        // 如果响应中包含其他信息，也一并更新
        if (deviceData.device_name && deviceData.device_name !== originalConfig.deviceName) {
          updatedConfig.deviceName = deviceData.device_name;
        }

        await this.deviceConfigService.updateConfig(updatedConfig);
        this.logger.log('✅ Local configuration updated successfully');
      } else {
        // 即使设备ID没变，也要确保注册状态是正确的
        await this.deviceConfigService.updateConfig({ isRegistered: true });
        this.logger.log('✅ Registration status updated in local configuration');
      }
    } catch (error) {
      this.logger.error('❌ Failed to update local configuration after registration:', error);
      // 不抛出错误，因为注册已经成功，配置更新失败不应该影响注册结果
    }
  }

  /**
   * 注册失败时清理自动注册数据并提示重新注册
   */
  private async handleRegistrationFailure(errorMessage: string): Promise<void> {
    try {
      this.logger.warn('🚨 Registration failed, cleaning up auto-registration data...');

      // 清理注册状态，但保留用户输入的配置信息
      const updatedConfig: Partial<DeviceConfig> = {
        isRegistered: false,
        deviceId: undefined // 清除设备ID，强制重新生成
      };

      await this.deviceConfigService.updateConfig(updatedConfig);

      // 记录详细的失败信息和下一步建议
      this.logger.error('❌ Device registration failed:', errorMessage);
      this.logger.log('');
      this.logger.log('📝 Next Steps:');
      this.logger.log('   1. Verify your registration credentials are correct');
      this.logger.log('   2. Check network connectivity to the gateway');
      this.logger.log('   3. Ensure the gateway is accepting new registrations');
      this.logger.log('   4. Re-register your device using the registration API');
      this.logger.log('');
      this.logger.log('💡 To re-register, use:');
      this.logger.log('   POST /api/device/register');
      this.logger.log('   {');
      this.logger.log('     "gateway_address": "your-gateway-url",');
      this.logger.log('     "reward_address": "your-reward-address",');
      this.logger.log('     "key": "your-key",');
      this.logger.log('     "code": "your-code",');
      this.logger.log('     "device_name": "your-device-name"');
      this.logger.log('   }');

    } catch (error) {
      this.logger.error('Failed to clean up registration data:', error);
    }
  }
}

const DeviceGatewayServiceProvider = {
  provide: DEVICE_GATEWAY_SERVICE,
  useClass: DeviceGatewayService
};

export default DeviceGatewayServiceProvider;
