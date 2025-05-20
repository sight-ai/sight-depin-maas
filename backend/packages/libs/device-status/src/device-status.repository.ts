import { Inject, Logger } from "@nestjs/common";
import * as R from 'ramda';
import { PersistentService } from "@saito/persistent";
import {
  ModelOfMiner
} from "@saito/models";

// Utility functions
const toISOString = R.curry((date: Date) => date.toISOString());
const getTimestamp = () => toISOString(new Date());
const generateUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Data transformers
const formatDeviceStatus = (row: ModelOfMiner<'DeviceStatusRow'>): ModelOfMiner<'DeviceStatusModule'> => ({
  id: row.id,
  name: row.name,
  status: row.status,
  reward_address: row.reward_address,
  gateway_address: row.gateway_address,
  key: row.key,
  code: row.code,
  up_time_start: row.up_time_start,
  up_time_end: row.up_time_end,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const formatDeviceList = (rows: ModelOfMiner<'DeviceStatusRow'>[]): ModelOfMiner<'DeviceListItem'>[] =>
  rows.map(row => ({
    id: row.id,
    name: row.name,
    status: row.status
  }));

const formatTask = (row: ModelOfMiner<'TaskRow'>): ModelOfMiner<'TaskResult'> => ({
  id: row.id,
  model: row.model,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
  total_duration: row.total_duration,
  load_duration: row.load_duration,
  prompt_eval_count: row.prompt_eval_count,
  prompt_eval_duration: row.prompt_eval_duration,
  eval_count: row.eval_count,
  eval_duration: row.eval_duration,
  source: row.source,
  device_id: row.device_id
});

const formatEarning = (row: ModelOfMiner<'EarningRow'>): ModelOfMiner<'EarningResult'> => ({
  id: row.id,
  block_rewards: row.block_rewards,
  job_rewards: row.job_rewards,
  created_at: row.created_at,
  updated_at: row.updated_at,
  source: row.source,
  device_id: row.device_id,
  task_id: row.task_id
});

const defaultDevice: ModelOfMiner<'DeviceStatusModule'> = {
  id: '24dea62e-95df-4549-b3ba-c9522cd5d5c1',
  name: 'Default Device',
  status: 'waiting' as const,
  reward_address: null,
  gateway_address: null,
  key: null,
  code: null,
  up_time_start: null,
  up_time_end: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export class DeviceStatusRepository {
  private readonly logger = new Logger(DeviceStatusRepository.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { }

  async transaction<T>(handler: (db: any) => T) {
    return this.persistentService.transaction(handler);
  }

  async updateDeviceStatus(
    db: any,
    deviceId: string,
    name: string,
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed",
    rewardAddress: string,
    gatewayAddress: string,
    key: string,
    code: string
  ) {
    const now = getTimestamp();
    const upTimeStart = status === 'connected' ? now : null;
    const upTimeEnd = status === 'disconnected' ? now : null;

    try {
      // 使用 LevelDB 原生操作
      // 首先检查设备是否存在
      let existingDevice = null;
      try {
        const deviceData = await this.persistentService.deviceStatusDb.get(deviceId);
        existingDevice = JSON.parse(deviceData);
      } catch (error) {
        if ((error as any).code !== 'LEVEL_NOT_FOUND') {
          throw error;
        }
      }

      if (existingDevice) {
        // 更新现有设备
        const updateUpTimeStart = status === 'connected' && existingDevice.status === 'disconnected' ? now : existingDevice.up_time_start;
        const updateUpTimeEnd = status === 'disconnected' && existingDevice.status === 'connected' ? now : existingDevice.up_time_end;

        const updatedDevice = {
          ...existingDevice,
          status,
          updated_at: now,
          up_time_start: updateUpTimeStart,
          up_time_end: updateUpTimeEnd,
          reward_address: rewardAddress,
          gateway_address: gatewayAddress,
          key,
          code
        };

        await this.persistentService.deviceStatusDb.put(deviceId, JSON.stringify(updatedDevice));
        return updatedDevice;
      } else {
        // 插入新设备
        const newDevice = {
          id: deviceId,
          name,
          status,
          up_time_start: upTimeStart,
          up_time_end: upTimeEnd,
          reward_address: rewardAddress,
          gateway_address: gatewayAddress,
          key,
          code,
          created_at: now,
          updated_at: now
        };

        await this.persistentService.deviceStatusDb.put(deviceId, JSON.stringify(newDevice));
        return newDevice;
      }
    } catch (error) {
      this.logger.error(`Error updating device status: ${error}`);
      throw error;
    }
  }

  async findDeviceStatus(db: any, deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null> {
    try {
      const deviceData = await this.persistentService.deviceStatusDb.get(deviceId);
      const device = JSON.parse(deviceData) as ModelOfMiner<'DeviceStatusRow'>;
      return formatDeviceStatus(device);
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Error finding device status: ${error}`);
      throw error;
    }
  }

  async markDevicesOffline(db: any, thresholdTime: Date) {
    const thresholdTimeStr = toISOString(thresholdTime);

    try {
      // 获取所有设备
      const devices: ModelOfMiner<'DeviceStatusRow'>[] = [];

      // 使用 LevelDB 的迭代器获取所有设备
      for await (const [key, value] of this.persistentService.deviceStatusDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        try {
          const device = JSON.parse(value);
          devices.push(device);
        } catch (error) {
          this.logger.error(`Failed to parse device data: ${error}`);
        }
      }

      // 找出需要标记为离线的设备
      const devicesToUpdate = devices.filter(device =>
        device.status === 'connected' &&
        device.updated_at < thresholdTimeStr
      );

      // 批量更新设备状态
      const now = getTimestamp();
      const operations = devicesToUpdate.map(device => ({
        type: 'put' as const,
        key: device.id,
        value: JSON.stringify({
          ...device,
          status: 'disconnected',
          up_time_end: now,
          updated_at: now
        })
      }));

      if (operations.length > 0) {
        await this.persistentService.deviceStatusDb.batch(operations);
      }

      return { changes: operations.length };
    } catch (error) {
      this.logger.error(`Error marking devices offline: ${error}`);
      throw error;
    }
  }

  async findDeviceList(db: any): Promise<ModelOfMiner<'DeviceListItem'>[]> {
    try {
      const devices: ModelOfMiner<'DeviceListItem'>[] = [];

      // 使用 LevelDB 的迭代器获取所有设备
      for await (const [key, value] of this.persistentService.deviceStatusDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        try {
          const device = JSON.parse(value) as ModelOfMiner<'DeviceStatusRow'>;
          if (device.status === 'connected') {
            devices.push({
              id: device.id,
              name: device.name,
              status: device.status
            });
          }
        } catch (error) {
          this.logger.error(`Failed to parse device data: ${error}`);
        }
      }

      return devices;
    } catch (error) {
      this.logger.error(`Error finding device list: ${error}`);
      throw error;
    }
  }

  async findCurrentDevice(db: any): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    try {
      let latestDevice: ModelOfMiner<'DeviceStatusRow'> | null = null;

      // 使用 LevelDB 的迭代器获取所有设备
      for await (const [key, value] of this.persistentService.deviceStatusDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        try {
          const device = JSON.parse(value) as ModelOfMiner<'DeviceStatusRow'>;
          if (device.status === 'connected') {
            if (!latestDevice || device.updated_at > latestDevice.updated_at) {
              latestDevice = device;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to parse device data: ${error}`);
        }
      }

      return latestDevice ? formatDeviceStatus(latestDevice) : defaultDevice;
    } catch (error) {
      this.logger.error(`Error finding current device: ${error}`);
      return defaultDevice;
    }
  }

  async findDevicesTasks(db: any, deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]> {
    try {
      const tasks: ModelOfMiner<'TaskResult'>[] = [];

      // 使用 LevelDB 的迭代器获取所有任务
      for await (const [key, value] of this.persistentService.tasksDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        try {
          const task = JSON.parse(value) as ModelOfMiner<'TaskRow'>;
          if (task.device_id === deviceId) {
            tasks.push(formatTask(task));
          }
        } catch (error) {
          this.logger.error(`Failed to parse task data: ${error}`);
        }
      }

      // 按创建时间降序排序
      return tasks.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (error) {
      this.logger.error(`Error finding device tasks: ${error}`);
      return [];
    }
  }

  async findDeviceEarnings(db: any, deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]> {
    try {
      const earnings: ModelOfMiner<'EarningResult'>[] = [];

      // 使用 LevelDB 的迭代器获取所有收益记录
      for await (const [key, value] of this.persistentService.earningsDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        try {
          const earning = JSON.parse(value) as ModelOfMiner<'EarningRow'>;
          if (earning.device_id === deviceId) {
            earnings.push(formatEarning(earning));
          }
        } catch (error) {
          this.logger.error(`Failed to parse earning data: ${error}`);
        }
      }

      // 按创建时间降序排序
      return earnings.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (error) {
      this.logger.error(`Error finding device earnings: ${error}`);
      return [];
    }
  }
}
