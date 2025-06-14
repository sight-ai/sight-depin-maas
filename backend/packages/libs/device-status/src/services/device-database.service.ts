import { Injectable, Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { 
  TDeviceDatabase, 
  TDeviceConfig,
  DeviceStatus,
  DeviceStatusData,
  DeviceListItem,
  TaskResult,
  EarningResult,
  DEVICE_DATABASE_SERVICE,
  DEVICE_CONFIG_SERVICE
} from "../device-status.interface";

/**
 * 设备数据库服务
 * 负责设备状态、任务和收益的数据库操作
 */
@Injectable()
export class DeviceDatabaseService implements TDeviceDatabase {
  private readonly logger = new Logger(DeviceDatabaseService.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig
  ) {}

  /**
   * 更新设备状态
   */
  async updateDeviceStatus(
    deviceId: string,
    name: string,
    status: DeviceStatus,
    rewardAddress: string
  ): Promise<DeviceStatusData> {
    try {
      const deviceData: DeviceStatusData = {
        id: deviceId,
        name,
        status,
        reward_address: rewardAddress,
        gateway_address: this.configService.getGatewayAddress(),
        key: this.configService.getKey(),
        code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        up_time_start: new Date().toISOString(),
        up_time_end: null
      };

      await this.persistentService.deviceStatusDb.put(deviceId, JSON.stringify(deviceData));
      this.logger.debug(`Device status updated: ${deviceId} -> ${status}`);

      return deviceData;
    } catch (error) {
      this.logger.error(`Failed to update device status for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 获取设备状态
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatusData | null> {
    try {
      const data = await this.persistentService.deviceStatusDb.get(deviceId);
      return JSON.parse(data) as DeviceStatusData;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Failed to get device status for ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * 获取设备列表
   */
  async getDeviceList(): Promise<DeviceListItem[]> {
    const devices: DeviceListItem[] = [];

    try {
      for await (const [key, value] of this.persistentService.deviceStatusDb.iterator()) {
        if (key === '__schema__') continue;

        try {
          const device = JSON.parse(value) as DeviceStatusData;
          devices.push({
            id: device.id,
            name: device.name,
            status: device.status
          });
        } catch (parseError) {
          this.logger.warn(`Failed to parse device data for key ${key}:`, parseError);
        }
      }
    } catch (error) {
      this.logger.error('Failed to get device list:', error);
    }

    return devices;
  }

  /**
   * 获取当前设备
   */
  async getCurrentDevice(): Promise<DeviceStatusData | null> {
    try {
      const config = this.configService.getCurrentConfig();
      
      if (!config.isRegistered || !config.deviceId) {
        return null;
      }

      const deviceData = await this.getDeviceStatus(config.deviceId);
      
      if (deviceData) {
        return deviceData;
      }

      // 如果数据库中没有记录，创建一个基本记录
      return {
        id: config.deviceId,
        name: config.deviceName,
        status: 'connected' as DeviceStatus,
        reward_address: config.rewardAddress,
        gateway_address: config.gatewayAddress,
        key: config.key,
        code: config.code || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        up_time_start: new Date().toISOString(),
        up_time_end: null
      };
    } catch (error) {
      this.logger.error('Failed to get current device:', error);
      return null;
    }
  }

  /**
   * 获取设备任务
   */
  async getDeviceTasks(deviceId: string): Promise<TaskResult[]> {
    const tasks: TaskResult[] = [];

    try {
      for await (const [key, value] of this.persistentService.tasksDb.iterator()) {
        if (key === '__schema__') continue;

        try {
          const task = JSON.parse(value);
          if (task.device_id === deviceId) {
            tasks.push(task as TaskResult);
          }
        } catch (parseError) {
          this.logger.warn(`Failed to parse task data for key ${key}:`, parseError);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get tasks for device ${deviceId}:`, error);
    }

    return tasks;
  }

  /**
   * 获取设备收益
   */
  async getDeviceEarnings(deviceId: string): Promise<EarningResult[]> {
    const earnings: EarningResult[] = [];

    try {
      for await (const [key, value] of this.persistentService.earningsDb.iterator()) {
        if (key === '__schema__') continue;

        try {
          const earning = JSON.parse(value);
          if (earning.device_id === deviceId) {
            earnings.push(earning as EarningResult);
          }
        } catch (parseError) {
          this.logger.warn(`Failed to parse earning data for key ${key}:`, parseError);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get earnings for device ${deviceId}:`, error);
    }

    return earnings;
  }

  /**
   * 标记非活跃设备为离线
   */
  async markInactiveDevicesOffline(inactiveDuration: number): Promise<DeviceStatusData[]> {
    const updatedDevices: DeviceStatusData[] = [];
    const cutoffTime = new Date(Date.now() - inactiveDuration);

    try {
      for await (const [key, value] of this.persistentService.deviceStatusDb.iterator()) {
        if (key === '__schema__') continue;

        try {
          const device = JSON.parse(value) as DeviceStatusData;
          const lastUpdate = new Date(device.updated_at);

          if (lastUpdate < cutoffTime && device.status !== 'disconnected') {
            const updatedDevice = await this.updateDeviceStatus(
              device.id,
              device.name,
              'disconnected',
              device.reward_address || ''
            );
            updatedDevices.push(updatedDevice);
          }
        } catch (parseError) {
          this.logger.warn(`Failed to process device for key ${key}:`, parseError);
        }
      }
    } catch (error) {
      this.logger.error('Failed to mark inactive devices offline:', error);
    }

    return updatedDevices;
  }
}

const DeviceDatabaseServiceProvider = {
  provide: DEVICE_DATABASE_SERVICE,
  useClass: DeviceDatabaseService
};

export default DeviceDatabaseServiceProvider;
