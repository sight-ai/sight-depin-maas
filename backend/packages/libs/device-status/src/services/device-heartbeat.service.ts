import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';
import {
  TDeviceHeartbeat,
  TDeviceGateway,
  TDeviceConfig,
  TDeviceSystem,
  DeviceConfig,
  SystemInfo,
  DEVICE_HEARTBEAT_SERVICE,
  DEVICE_GATEWAY_SERVICE,
  DEVICE_CONFIG_SERVICE,
  DEVICE_SYSTEM_SERVICE
} from "../device-status.interface";
interface ITunnelCommunicationService {
  sendHeartbeatReport(fromPeerId: string, toPeerId: string, heartbeatData: any): Promise<boolean>;
}

const TUNNEL_COMMUNICATION_SERVICE = Symbol('TUNNEL_COMMUNICATION_SERVICE');

/**
 * 设备心跳服务
 * 负责心跳的发送和管理
 * 使用定时任务检查注册状态并发送心跳
 */
@Injectable()
export class DeviceHeartbeatService implements TDeviceHeartbeat {
  private readonly logger = new Logger(DeviceHeartbeatService.name);
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(
    @Optional() @Inject(DEVICE_GATEWAY_SERVICE)
    private readonly gatewayService: TDeviceGateway | null,

    @Optional() @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig | null,

    @Optional() @Inject(DEVICE_SYSTEM_SERVICE)
    private readonly systemService: TDeviceSystem | null,

    @Optional() @Inject(TUNNEL_COMMUNICATION_SERVICE)
    private readonly tunnelCommunicationService: ITunnelCommunicationService | null
  ) {}

  /**
   * 定时心跳任务 - 每30秒执行一次
   * 检查设备注册状态并发送心跳
   */
  @Cron('*/30 * * * * *')
  async scheduledHeartbeat(): Promise<void> {
    try {
      // 检查服务是否可用
      if (!this.configService || !this.systemService) {
        this.logger.debug('Required services not available, skipping heartbeat');
        return;
      }

      // 获取当前设备配置
      const config = this.configService.getCurrentConfig();

      // 检查设备是否已注册
      if (!config.isRegistered || !config.gatewayAddress || !config.deviceId) {
        this.logger.debug('Device not registered or missing configuration, skipping heartbeat');
        return;
      }

      // 收集系统信息
      const systemInfo = await this.systemService.collectSystemInfo();

      // 发送心跳
      await this.sendHeartbeatViaTunnel(config, systemInfo);


    } catch (error) {
      this.logger.error('定时心跳发送失败:', error);
      // 不抛出错误，避免中断定时任务
    }
  }

  /**
   * 发送心跳 (兼容接口)
   */
  async sendHeartbeat(config: DeviceConfig, systemInfo: SystemInfo): Promise<void> {
    await this.sendHeartbeatViaTunnel(config, systemInfo);
  }

  /**
   * 通过 Tunnel 发送心跳
   */
  private async sendHeartbeatViaTunnel(config: DeviceConfig, systemInfo: SystemInfo): Promise<void> {
    if (!config.isRegistered || !config.gatewayAddress) {
      this.logger.debug('Device not registered, skipping heartbeat');
      return;
    }

    try {
      // 优先使用 tunnel 通信服务
      if (this.tunnelCommunicationService) {
        const heartbeatData = {
          code: config.code || '',
          cpu_usage: 0, // TODO: 从 systemInfo.cpu 解析使用率
          memory_usage: 0, // TODO: 从 systemInfo.memory 解析使用率
          gpu_usage: 0, // TODO: 从 systemInfo.graphics 获取GPU使用率
          ip: systemInfo.ipAddress || '127.0.0.1',
          timestamp: Date.now(),
          type: 'heartbeat',
          model: systemInfo.graphics?.[0]?.model || 'unknown',
          device_info: {
            cpu_cores: 1, // TODO: 从 systemInfo.cpu 解析核心数
            memory_total: 0, // TODO: 从 systemInfo.memory 解析总内存
            gpu_memory: systemInfo.graphics?.[0]?.vram ? parseInt(systemInfo.graphics[0].vram) : 0,
            disk_total: 0, // TODO: 添加磁盘信息到 SystemInfo
            os_info: systemInfo.os || 'Unknown OS'
          }
        };

        const success = await this.tunnelCommunicationService.sendHeartbeatReport(
          config.deviceId!,
          'gateway',
          heartbeatData
        );

        if (success) {
          this.logger.debug('Heartbeat sent successfully via tunnel');
        } else {
          this.logger.warn('Failed to send heartbeat via tunnel');
        }
      }
      // 回退到网关服务
      else if (this.gatewayService) {
        await this.gatewayService.sendHeartbeatToGateway(config, systemInfo);
        this.logger.debug('Heartbeat sent successfully via gateway service');
      } else {
        this.logger.warn('No heartbeat service available');
      }
    } catch (error) {
      this.logger.error('Failed to send heartbeat:', error);
      // Don't throw error to prevent heartbeat from stopping
    }
  }

  /**
   * 启动心跳
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      this.logger.debug('Heartbeat already running');
      return;
    }

    this.logger.log('Starting heartbeat service');
    
    // Note: The actual heartbeat sending is handled by the main service
    // This method is for future use if we need independent heartbeat management
    this.heartbeatInterval = setInterval(() => {
      this.logger.debug('Heartbeat interval tick');
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.log('Heartbeat service stopped');
    }
  }
}

const DeviceHeartbeatServiceProvider = {
  provide: DEVICE_HEARTBEAT_SERVICE,
  useClass: DeviceHeartbeatService
};

export default DeviceHeartbeatServiceProvider;
