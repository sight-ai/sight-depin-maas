import { Injectable, Logger, Inject } from '@nestjs/common';
import { 
  TDeviceConfig,
  TDeviceRegistry,
  TDeviceSystem,
  TDeviceHeartbeat,
  DEVICE_CONFIG_SERVICE,
  DEVICE_REGISTRY_SERVICE,
  DEVICE_SYSTEM_SERVICE,
  DEVICE_HEARTBEAT_SERVICE,
  DeviceStatus,
  RegistrationResult
} from '../device-status.interface';
import { ErrorHandlerService, OperationResult } from '@saito/common';

/**
 * 设备状态协调器 
 * 只负责协调各个设备状态相关的服务，不直接处理具体业务逻辑
 */
@Injectable()
export class DeviceStatusOrchestratorService {
  private readonly logger = new Logger(DeviceStatusOrchestratorService.name);

  constructor(
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig,
    
    @Inject(DEVICE_REGISTRY_SERVICE)
    private readonly registryService: TDeviceRegistry,
    
    @Inject(DEVICE_SYSTEM_SERVICE)
    private readonly systemService: TDeviceSystem,
    
    @Inject(DEVICE_HEARTBEAT_SERVICE)
    private readonly heartbeatService: TDeviceHeartbeat,
    
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * 协调设备注册流程
   */
  async orchestrateRegistration(
    gatewayAddress: string,
    rewardAddress: string,
    key: string,
    deviceName?: string
  ): Promise<OperationResult<RegistrationResult>> {
    try {
      this.logger.log('Starting device registration orchestration');

      // 1. 收集系统信息
      const systemInfo = await this.systemService.collectSystemInfo();
      
      // 2. 准备注册数据
      const registrationData = {
        gatewayAddress,
        rewardAddress,
        key,
        deviceName: deviceName || `Device-${Date.now()}`,
        systemInfo
      };

      // 3. 执行注册
      const credentials = {
        gateway_address: registrationData.gatewayAddress,
        reward_address: registrationData.rewardAddress,
        key: registrationData.key,
        code: registrationData.key // 假设 code 和 key 相同，或者需要从其他地方获取
      };

      const result = await this.registryService.register(credentials);

      if (result.success) {
        // 4. 更新配置
        await this.configService.updateConfig({
          deviceId: result.node_id || result.name,
          deviceName: registrationData.deviceName,
          gatewayAddress: registrationData.gatewayAddress,
          rewardAddress: registrationData.rewardAddress,
          isRegistered: true
        });

        this.logger.log(`Device registration orchestration completed successfully: ${result.node_id || result.name}`);
      }

      return this.errorHandler.createSuccessResult(result);
    } catch (error) {
      this.logger.error('Device registration orchestration failed:', error);
      return this.errorHandler.createErrorResultFromException(error, {
        operation: 'orchestrateRegistration',
        gatewayAddress,
        rewardAddress
      });
    }
  }

  /**
   * 协调心跳发送流程
   */
  async orchestrateHeartbeat(): Promise<OperationResult<void>> {
    try {
      // 1. 检查注册状态
      const config = this.configService.getCurrentConfig();
      if (!config.isRegistered) {
        return this.errorHandler.createErrorResult(
          this.errorHandler.createError(
            'VALIDATION' as any,
            'DEVICE_NOT_REGISTERED',
            'Device is not registered, cannot send heartbeat'
          )
        );
      }

      // 2. 收集系统信息
      const systemInfo = await this.systemService.collectSystemInfo();

      // 3. 发送心跳
      await this.heartbeatService.sendHeartbeat(config, systemInfo);

      this.logger.debug('Heartbeat orchestration completed successfully');
      return this.errorHandler.createSuccessResult(undefined);
    } catch (error) {
      this.logger.error('Heartbeat orchestration failed:', error);
      return this.errorHandler.createErrorResultFromException(error, {
        operation: 'orchestrateHeartbeat'
      });
    }
  }

  /**
   * 协调设备状态更新流程
   */
  async orchestrateStatusUpdate(
    deviceId: string,
    deviceName: string,
    status: DeviceStatus,
    rewardAddress?: string
  ): Promise<OperationResult<void>> {
    try {
      this.logger.debug(`Orchestrating status update for device: ${deviceId}`);

      // 1. 收集当前系统信息
      const systemInfo = await this.systemService.collectSystemInfo();

      // 2. 检查框架状态
      const frameworkStatus = await this.systemService.checkFrameworkStatus();

      // 3. 更新设备状态（这里需要调用相应的服务方法）
      // 注意：这里假设有一个更新设备状态的方法，实际实现中需要添加
      
      this.logger.debug(`Status update orchestration completed for device: ${deviceId}`);
      return this.errorHandler.createSuccessResult(undefined);
    } catch (error) {
      this.logger.error('Status update orchestration failed:', error);
      return this.errorHandler.createErrorResultFromException(error, {
        operation: 'orchestrateStatusUpdate',
        deviceId,
        deviceName,
        status
      });
    }
  }

  /**
   * 协调设备健康检查流程
   */
  async orchestrateHealthCheck(): Promise<OperationResult<{
    isHealthy: boolean;
    systemStatus: any;
    frameworkStatus: boolean;
    configStatus: any;
  }>> {
    try {
      this.logger.debug('Starting health check orchestration');

      // 1. 检查系统状态
      const systemInfo = await this.systemService.collectSystemInfo();

      // 2. 检查框架状态
      const frameworkStatus = await this.systemService.checkFrameworkStatus();

      // 3. 检查配置状态
      const config = this.configService.getCurrentConfig();

      // 4. 综合评估健康状态
      const isHealthy = frameworkStatus && config.isRegistered;

      const healthData = {
        isHealthy,
        systemStatus: systemInfo,
        frameworkStatus,
        configStatus: {
          isRegistered: config.isRegistered,
          hasDeviceId: !!config.deviceId,
          hasGatewayAddress: !!config.gatewayAddress
        }
      };

      this.logger.debug(`Health check orchestration completed. Healthy: ${isHealthy}`);
      return this.errorHandler.createSuccessResult(healthData);
    } catch (error) {
      this.logger.error('Health check orchestration failed:', error);
      return this.errorHandler.createErrorResultFromException(error, {
        operation: 'orchestrateHealthCheck'
      });
    }
  }

  /**
   * 协调设备注销流程
   */
  async orchestrateUnregistration(): Promise<OperationResult<boolean>> {
    try {
      this.logger.log('Starting device unregistration orchestration');

      // 1. 清除注册信息
      const success = await this.registryService.clearRegistration();

      if (success) {
        // 2. 重置配置
        await this.configService.updateConfig({
          isRegistered: false,
          deviceId: '',
          gatewayAddress: '',
          rewardAddress: ''
        });

        this.logger.log('Device unregistration orchestration completed successfully');
      }

      return this.errorHandler.createSuccessResult(success);
    } catch (error) {
      this.logger.error('Device unregistration orchestration failed:', error);
      return this.errorHandler.createErrorResultFromException(error, {
        operation: 'orchestrateUnregistration'
      });
    }
  }

  /**
   * 协调设备信息获取流程
   */
  async orchestrateDeviceInfoRetrieval(): Promise<OperationResult<{
    config: any;
    systemInfo: any;
    status: {
      isRegistered: boolean;
      isOnline: boolean;
      frameworkStatus: boolean;
    };
  }>> {
    try {
      this.logger.debug('Starting device info retrieval orchestration');

      // 1. 获取配置信息
      const config = this.configService.getCurrentConfig();

      // 2. 获取系统信息
      const systemInfo = await this.systemService.collectSystemInfo();

      // 3. 检查各种状态
      const frameworkStatus = await this.systemService.checkFrameworkStatus();

      const deviceInfo = {
        config: {
          deviceId: config.deviceId,
          deviceName: config.deviceName,
          gatewayAddress: config.gatewayAddress,
          rewardAddress: config.rewardAddress,
          isRegistered: config.isRegistered
        },
        systemInfo,
        status: {
          isRegistered: config.isRegistered,
          isOnline: frameworkStatus,
          frameworkStatus
        }
      };

      this.logger.debug('Device info retrieval orchestration completed');
      return this.errorHandler.createSuccessResult(deviceInfo);
    } catch (error) {
      this.logger.error('Device info retrieval orchestration failed:', error);
      return this.errorHandler.createErrorResultFromException(error, {
        operation: 'orchestrateDeviceInfoRetrieval'
      });
    }
  }
}
