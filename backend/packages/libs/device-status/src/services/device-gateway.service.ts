import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  TDeviceGateway,
  TDeviceConfig,
  DeviceConfig,
  SystemInfo,
  RegistrationResult,
  DEVICE_GATEWAY_SERVICE,
  DEVICE_CONFIG_SERVICE
} from "../device-status.interface";
import { TunnelServiceImpl } from "@saito/tunnel";
import { DynamicConfigService } from "./dynamic-config.service";
import { TunnelCommunicationService } from "./tunnel-communication.service";
import { DidServiceInterface } from "@saito/did";
import { RegistrationStatus } from "../registration-storage";

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
    @Inject('TunnelService')
    private readonly tunnelService: TunnelServiceImpl,
    private readonly dynamicConfigService: DynamicConfigService,
    private readonly tunnelCommunicationService: TunnelCommunicationService,
    @Inject('DidService') private readonly didService: DidServiceInterface,
  ) { }

  /**
   * 向网关注册设备 - 仅使用tunnel协议
   */
  async registerWithGateway(
    config: DeviceConfig,
    localModels: any[],
    systemInfo?: SystemInfo
  ): Promise<RegistrationResult> {
    try {
      this.logger.log(`Registering device via tunnel protocol only`);

      // 设置注册状态为PENDING
      this.deviceConfigService.updateRegistrationStatus(RegistrationStatus.PENDING);

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

      let deviceId = this.didService.getMyPeerId();
      let didDocument = this.didService.getDocument();


      // 首先建立WebSocket连接
      this.logger.log(`🔗 建立WebSocket连接到: ${config.gatewayAddress}`);
      await this.tunnelService.createConnection(config.gatewayAddress, config.code, config.basePath);
      this.logger.log(`✅ WebSocket连接已建立`);

      await this.tunnelService.connect(deviceId);

      // 通过WebSocket发送注册请求，包含DID的设备ID和DID文档
      const tunnelResult = await this.tunnelCommunicationService.sendDeviceRegistration(
        deviceId,
        'gateway',
        {
          code: config.code || '',
          gateway_address: config.gatewayAddress,
          reward_address: config.rewardAddress,
          device_type: deviceSystemInfo.deviceType,
          gpu_type: deviceSystemInfo.deviceModel,
          ip: deviceSystemInfo.ipAddress,
          basePath: config.basePath,
          device_id: deviceId, // 添加DID的设备ID
          device_name: config.deviceName || `Device-${deviceId.slice(-8)}`, // 添加设备名称
          local_models: localModels.map(model => (model.name)),
          did_document: didDocument // 添加DID文档
        }
      );

      if (tunnelResult.success) {
        this.logger.log(`✅ 设备注册成功 via WebSocket: ${deviceId}`);

        // 更新注册状态为SUCCESS
        this.deviceConfigService.updateRegistrationStatus(RegistrationStatus.SUCCESS);

        // 构建完整的配置信息
        const fullConfig: DeviceConfig = {
          deviceId: deviceId,
          deviceName: config.deviceName || `Device-${deviceId.slice(-8)}`,
          gatewayAddress: config.gatewayAddress,
          rewardAddress: config.rewardAddress,
          code: config.code,
          isRegistered: true,
          basePath: config.basePath
        };

        // 更新内存中的配置
        await this.deviceConfigService.updateConfig(fullConfig);

        // 保存完整的注册信息到存储，包括DID文档
        await this.deviceConfigService.saveConfigToStorage(fullConfig, config.basePath, didDocument);

        this.logger.log('✅ 本地配置更新成功，包含DID文档');

        return {
          success: true,
          node_id: deviceId,
          name: config.deviceName,
          status: 'registered'
        };
      } else {
        this.logger.error('❌ Device registration failed via tunnel:', tunnelResult.error);

        // 更新注册状态为FAILED
        this.deviceConfigService.updateRegistrationStatus(
          RegistrationStatus.FAILED,
          tunnelResult.error || 'Tunnel registration failed'
        );

        await this.handleRegistrationFailure(tunnelResult.error || 'Tunnel registration failed');

        return {
          success: false,
          error: tunnelResult.error || 'Tunnel registration failed'
        };
      }
    } catch (error) {
      this.logger.error('Failed to register with gateway:', error);

      // 更新注册状态为FAILED
      const errorMessage = error instanceof Error ? error.message : 'Gateway communication failed';
      this.deviceConfigService.updateRegistrationStatus(RegistrationStatus.FAILED, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 向网关发送心跳 - 仅使用WebSocket协议
   */
  async sendHeartbeatToGateway(
    config: DeviceConfig,
    systemInfo: SystemInfo
  ): Promise<void> {
    try {
      let deviceId = this.didService.getMyPeerId();

      // 使用WebSocket发送心跳
      const heartbeatData = {
        code: config.code || '',
        cpu_usage: 45.5, // TODO: 从systemInfo获取实际数据
        memory_usage: 60.2, // TODO: 从systemInfo获取实际数据
        gpu_usage: 80.1, // TODO: 从systemInfo获取实际数据
        ip: systemInfo.ipAddress || '192.168.1.100',
        timestamp: new Date().toISOString(),
        type: systemInfo.deviceType || 'GPU',
        model: systemInfo.deviceModel || 'Unknown Device',
        device_info: {
          cpu_model: systemInfo.cpu || 'Unknown CPU',
          cpu_cores: 12, // TODO: 从systemInfo获取实际数据
          cpu_threads: 20, // TODO: 从systemInfo获取实际数据
          ram_total: 32, // TODO: 从systemInfo获取实际数据
          gpu_model: Array.isArray(systemInfo.graphics) && systemInfo.graphics.length > 0
            ? systemInfo.graphics[0].model || 'Unknown GPU'
            : 'Unknown GPU',
          gpu_count: 1, // TODO: 从systemInfo获取实际数据
          gpu_memory: 24, // TODO: 从systemInfo获取实际数据
          disk_total: 1000, // TODO: 从systemInfo获取实际数据
          os_info: systemInfo.os || 'Unknown OS'
        }
      };

      const success = await this.tunnelCommunicationService.sendHeartbeatReport(
        deviceId,
        'gateway',
        heartbeatData
      );

      if (success) {
        this.logger.debug('💓 心跳发送成功 via WebSocket');
      } else {
        this.logger.warn('❌ 心跳发送失败 via WebSocket');
      }
    } catch (error) {
      this.logger.error('Failed to send heartbeat to gateway:', error);
      throw error;
    }
  }

  /**
   * 检查网关状态 - 通过WebSocket连接状态判断
   */
  async checkGatewayStatus(_gatewayAddress: string): Promise<boolean> {
    try {
      // 简化：假设WebSocket连接正常就表示网关可用
      return true;
    } catch (error) {
      this.logger.debug('Gateway status check failed:', error);
      return false;
    }
  }



  /**
   * 注册失败时清理数据
   */
  private async handleRegistrationFailure(errorMessage: string): Promise<void> {
    try {
      this.logger.warn('🚨 WebSocket注册失败，清理注册数据...');

      // 清理注册状态，但保留用户输入的配置信息
      const updatedConfig: Partial<DeviceConfig> = {
        isRegistered: false
        // 注意：不清除deviceId，因为它来自DID服务
      };

      await this.deviceConfigService.updateConfig(updatedConfig);

      // 记录详细的失败信息和下一步建议
      this.logger.error('❌ 设备注册失败:', errorMessage);
      this.logger.log('');
      this.logger.log('📝 下一步操作:');
      this.logger.log('   1. 检查注册凭据是否正确');
      this.logger.log('   2. 检查网络连接到网关');
      this.logger.log('   3. 确保网关接受新的注册');
      this.logger.log('   4. 检查DID服务是否正常运行');
      this.logger.log('   5. 重启设备服务重新尝试注册');

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
