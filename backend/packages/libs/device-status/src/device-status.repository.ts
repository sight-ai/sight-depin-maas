import { Inject } from "@nestjs/common";
import * as R from 'ramda';

const toISOString = R.curry((date: Date) => date.toISOString());
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { DeviceStatus, DeviceStatusSchema, m, DeviceListItem, TaskResult, EarningResult, FindDeviceStatusSchema, FindDeviceListSchema, TaskResultSchema, EarningResultSchema, FindCurrentDeviceSchema } from "@saito/models";

export class DeviceStatusRepository {
  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { }

  async transaction<T>(handler: (conn: DatabaseTransactionConnection) => Promise<T>) {
    return this.persistentService.pgPool.transaction(handler);
  }

  async updateDeviceStatus(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    name: string,
    status: "online" | "offline",
    rewardAddress: string,
    gatewayAddress: string,
    key: string,
    code: string
  ) {
    const now = toISOString(new Date());
    const upTimeStart = status === 'online' ? now : null;
    const upTimeEnd = status === 'offline' ? now : null;

    return conn.query(SQL.type(m.deviceStatus('UpdateDeviceStatusSchema'))`
      INSERT INTO saito_miner.device_status (
        device_id, name, status, up_time_start, up_time_end, 
        reward_address, gateway_address, key, code, created_at, updated_at
      )
      VALUES (
        ${deviceId}, ${name}, ${status}, ${upTimeStart}, ${upTimeEnd}, 
        ${rewardAddress}, ${gatewayAddress}, ${key}, ${code}, ${now}, ${now}
      )
      ON CONFLICT (device_id) 
      DO UPDATE SET 
        status = ${status}, 
        updated_at = ${now}, 
        up_time_start = CASE WHEN ${status} = 'online' AND saito_miner.device_status.status = 'offline' THEN ${now} ELSE saito_miner.device_status.up_time_start END,
        up_time_end = CASE WHEN ${status} = 'offline' AND saito_miner.device_status.status = 'online' THEN ${now} ELSE saito_miner.device_status.up_time_end END,
        reward_address = ${rewardAddress}, 
        gateway_address = ${gatewayAddress}, 
        key = ${key}, 
        code = ${code}
    `);
  }

  async findDeviceStatus(conn: DatabaseTransactionConnection, deviceId: string): Promise<{
    name: string,
    status: "online" | "offline",
    rewardAddress: string,
    gatewayAddress: string
  } | null> {
    const result = await conn.query(SQL.type(FindDeviceStatusSchema)`
      SELECT name, status, reward_address as "rewardAddress", gateway_address as "gatewayAddress"
      FROM saito_miner.device_status
      WHERE device_id = ${deviceId};
    `);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async markDevicesOffline(conn: DatabaseTransactionConnection, thresholdTime: Date) {
    const thresholdTimeStr = toISOString(thresholdTime);
    return conn.query(SQL.type((m.deviceStatus('MarkDevicesOfflineSchema')))`
      UPDATE saito_miner.device_status 
      SET status = 'offline', up_time_end = NOW()
      WHERE updated_at < ${thresholdTimeStr} AND status = 'online';
    `);
  }

  async findDeviceList(conn: DatabaseTransactionConnection): Promise<DeviceListItem[]> {
    const result = await conn.query(SQL.type(FindDeviceListSchema.array())`
      SELECT device_id as "deviceId", name, status 
      FROM saito_miner.device_status 
      WHERE status = 'online';
    `);
    
    return Array.from(result.rows.flat()) as DeviceListItem[];
  }

  async findCurrentDevice(conn: DatabaseTransactionConnection): Promise<{
    deviceId: string,
    name: string,
    status: "online" | "offline",
    rewardAddress: string | null,
    gatewayAddress: string | null
  }> {  
    const result = await conn.query(SQL.type(FindCurrentDeviceSchema)`
      SELECT 
        device_id as "deviceId", 
        name, 
        status, 
        reward_address as "rewardAddress",
        gateway_address as "gatewayAddress"
      FROM saito_miner.device_status 
      WHERE status = 'online' 
      ORDER BY updated_at DESC 
      LIMIT 1;
    `);
    
    return result.rows.length > 0 ? result.rows[0] : {
      deviceId: 'default_device',
      name: 'Default Device',
      status: 'offline' as const,
      rewardAddress: null,
      gatewayAddress: null
    };
  }
  
  // async findDevicesTasks(conn: DatabaseTransactionConnection, deviceId: string): Promise<TaskResult[]> {
  //   const result = await conn.query(SQL.type(TaskResultSchema.array())`
  //     SELECT id, model, status, created_at as "createdAt"
  //     FROM saito_miner.tasks
  //     WHERE device_id = ${deviceId}
  //     ORDER BY created_at DESC;
  //   `);
    
  //   return Array.from(result.rows.flat()) as TaskResult[];
  // }
  
  // async findDeviceEarnings(conn: DatabaseTransactionConnection, deviceId: string): Promise<EarningResult[]> {
  //   const result = await conn.query(SQL.type(EarningResultSchema.array())`
  //     SELECT 
  //       id, 
  //       block_rewards as "blockRewards", 
  //       job_rewards as "jobRewards", 
  //       created_at as "createdAt",
  //       task_id as "taskId"
  //     FROM saito_miner.earnings
  //     WHERE device_id = ${deviceId}
  //     ORDER BY created_at DESC;
  //   `);
    
  //   return Array.from(result.rows.flat()) as EarningResult[];
  // }
}
