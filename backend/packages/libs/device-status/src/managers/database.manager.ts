import { Injectable, Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { DeviceStatusRepository } from '../device-status.repository';
import { DeviceConfigManager } from './device-config.manager';
import { ErrorHandler } from '../utils/error-handler';

/**
 * 数据库管理器
 * 
 * 负责：
 * 1. 设备状态数据库操作
 * 2. 设备列表管理
 * 3. 任务和收益查询
 */
@Injectable()
export class DatabaseManager {
  private readonly logger = new Logger(DatabaseManager.name);
  private readonly errorHandler = new ErrorHandler(DatabaseManager.name);

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    private readonly configManager: DeviceConfigManager
  ) {}

  /**
   * 更新设备状态
   */
  async updateDeviceStatus(
    deviceId: string,
    name: string,
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed",
    rewardAddress: string
  ): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          const config = this.configManager.getCurrentConfig();
          await this.deviceStatusRepository.updateDeviceStatus(
            db, deviceId, name, status, rewardAddress,
            config.gatewayAddress, config.key, config.code
          );
          const updatedDevice = await this.deviceStatusRepository.findDeviceStatus(db, deviceId);
          if (!updatedDevice) {
            throw new Error('Failed to update device status');
          }
          return updatedDevice;
        });
      },
      'update-device-status',
      {} as ModelOfMiner<'DeviceStatusModule'>
    );
  }

  /**
   * 获取设备状态
   */
  async getDeviceStatus(deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          return this.deviceStatusRepository.findDeviceStatus(db, deviceId);
        });
      },
      'get-device-status',
      null
    );
  }

  /**
   * 标记不活跃设备为离线
   */
  async markInactiveDevicesOffline(inactiveDuration: number): Promise<ModelOfMiner<'DeviceStatusModule'>[]> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          const thresholdTime = new Date(Date.now() - inactiveDuration);
          await this.deviceStatusRepository.markDevicesOffline(db, thresholdTime);
          const devices = await this.deviceStatusRepository.findDeviceList(db);
          return devices.map(device => ({
            ...device,
            code: null, gateway_address: null, reward_address: null, key: null,
            up_time_start: null, up_time_end: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString()
          }));
        });
      },
      'mark-inactive-devices-offline',
      []
    );
  }

  /**
   * 获取设备列表
   */
  async getDeviceList(): Promise<ModelOfMiner<'DeviceListItem'>[]> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          return this.deviceStatusRepository.findDeviceList(db);
        });
      },
      'get-device-list',
      []
    );
  }

  /**
   * 获取当前设备
   */
  async getCurrentDevice(): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          const device = await this.deviceStatusRepository.findCurrentDevice(db);
          if (!device) {
            // 返回默认设备信息而不是 null
            const config = this.configManager.getCurrentConfig();
            return {
              id: config.deviceId,
              name: config.deviceName,
              status: 'disconnected' as const,
              up_time_start: null,
              up_time_end: null,
              reward_address: config.rewardAddress || null,
              gateway_address: config.gatewayAddress || null,
              key: config.key || null,
              code: config.code || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
          return device;
        });
      },
      'get-current-device',
      {
        id: 'default-device',
        name: 'Default Device',
        status: 'disconnected' as const,
        up_time_start: null,
        up_time_end: null,
        reward_address: null,
        gateway_address: null,
        key: null,
        code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );
  }

  /**
   * 获取设备任务
   */
  async getDeviceTasks(deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          return this.deviceStatusRepository.findDevicesTasks(db, deviceId);
        });
      },
      'get-device-tasks',
      []
    );
  }

  /**
   * 获取设备收益
   */
  async getDeviceEarnings(deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          return this.deviceStatusRepository.findDeviceEarnings(db, deviceId);
        });
      },
      'get-device-earnings',
      []
    );
  }

  /**
   * 批量更新设备状态
   */
  async batchUpdateDeviceStatus(
    updates: Array<{
      deviceId: string;
      name: string;
      status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed";
      rewardAddress: string;
    }>
  ): Promise<ModelOfMiner<'DeviceStatusModule'>[]> {
    return this.errorHandler.safeExecute(
      async () => {
        const results: ModelOfMiner<'DeviceStatusModule'>[] = [];
        
        for (const update of updates) {
          const result = await this.updateDeviceStatus(
            update.deviceId,
            update.name,
            update.status,
            update.rewardAddress
          );
          results.push(result);
        }
        
        return results;
      },
      'batch-update-device-status',
      []
    );
  }

  /**
   * 获取设备统计信息
   */
  async getDeviceStats(): Promise<{
    totalDevices: number;
    connectedDevices: number;
    disconnectedDevices: number;
  }> {
    return this.errorHandler.safeExecute(
      async () => {
        const devices = await this.getDeviceList();
        const connected = devices.filter(d => d.status === 'connected').length;
        const disconnected = devices.filter(d => d.status === 'disconnected').length;
        
        return {
          totalDevices: devices.length,
          connectedDevices: connected,
          disconnectedDevices: disconnected
        };
      },
      'get-device-stats',
      {
        totalDevices: 0,
        connectedDevices: 0,
        disconnectedDevices: 0
      }
    );
  }

  /**
   * 清理过期设备记录
   */
  async cleanupExpiredDevices(expireDuration: number): Promise<number> {
    return this.errorHandler.safeExecute(
      async () => {
        return this.deviceStatusRepository.transaction(async (db: any) => {
          const thresholdTime = new Date(Date.now() - expireDuration);
          // 这里需要添加实际的清理逻辑
          // 目前返回0表示没有清理任何记录
          return 0;
        });
      },
      'cleanup-expired-devices',
      0
    );
  }

  /**
   * 同步配置到数据库
   */
  async syncConfigToDatabase(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        const config = this.configManager.getCurrentConfig();
        
        if (!config.isRegistered) {
          return false;
        }

        await this.updateDeviceStatus(
          config.deviceId,
          config.deviceName,
          'connected',
          config.rewardAddress
        );

        return true;
      },
      'sync-config-to-database',
      false
    );
  }
}
