import { Injectable, Inject, Logger } from "@nestjs/common";
import { 
  TDeviceHeartbeat, 
  TDeviceGateway,
  DeviceConfig,
  SystemInfo,
  DEVICE_HEARTBEAT_SERVICE,
  DEVICE_GATEWAY_SERVICE
} from "../device-status.interface";

/**
 * 设备心跳服务
 * 负责心跳的发送和管理
 */
@Injectable()
export class DeviceHeartbeatService implements TDeviceHeartbeat {
  private readonly logger = new Logger(DeviceHeartbeatService.name);
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(
    @Inject(DEVICE_GATEWAY_SERVICE)
    private readonly gatewayService: TDeviceGateway
  ) {}

  /**
   * 发送心跳
   */
  async sendHeartbeat(config: DeviceConfig, systemInfo: SystemInfo): Promise<void> {
    if (!config.isRegistered || !config.gatewayAddress) {
      this.logger.debug('Device not registered, skipping heartbeat');
      return;
    }

    try {
      await this.gatewayService.sendHeartbeatToGateway(config, systemInfo);
      this.logger.debug('Heartbeat sent successfully');
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
