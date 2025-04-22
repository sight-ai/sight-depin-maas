import { Inject } from "@nestjs/common";
import * as R from 'ramda';
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { 
  DeviceStatus, 
  DeviceListItem, 
  TaskResult, 
  EarningResult,
  TDeviceStatus,
  TDeviceListItem,
  TTaskResult,
  TEarningResult
} from "@saito/models";

// Utility functions
const toISOString = R.curry((date: Date) => date.toISOString());
const getTimestamp = () => toISOString(new Date());

// Database row types
type DeviceStatusRow = {
  id: string;
  name: string;
  status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed";
  reward_address: string | null;
  gateway_address: string | null;
  key: string | null;
  code: string | null;
  up_time_start: string | null;
  up_time_end: string | null;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  model: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  created_at: string;
};

type EarningRow = {
  id: string;
  block_rewards: number;
  job_rewards: number;
  created_at: string;
  task_id: string | null;
};

// Data transformers
const formatDeviceStatus = (row: DeviceStatusRow): TDeviceStatus => ({
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

const formatDeviceList = (rows: DeviceStatusRow[]): TDeviceListItem[] => 
  rows.map(row => ({
    id: row.id,
    name: row.name,
    status: row.status
  }));

const formatTask = (row: TaskRow): TTaskResult => ({
  id: row.id,
  model: row.model,
  status: row.status,
  created_at: row.created_at
});

const formatEarning = (row: EarningRow): TEarningResult => ({
  id: row.id,
  block_rewards: row.block_rewards,
  job_rewards: row.job_rewards,
  created_at: row.created_at,
  task_id: row.task_id
});

const defaultDevice: TDeviceStatus = {
  id: 'default_device',
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
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed",
    rewardAddress: string,
    gatewayAddress: string,
    key: string,
    code: string
  ) {
    const now = getTimestamp();
    const upTimeStart = status === 'connected' ? now : null;
    const upTimeEnd = status === 'disconnected' ? now : null;

    return conn.query(SQL.type(DeviceStatus)`
      INSERT INTO saito_miner.device_status (
        id, name, status, up_time_start, up_time_end, 
        reward_address, gateway_address, key, code, created_at, updated_at
      )
      VALUES (
        ${deviceId}, ${name}, ${status}, ${upTimeStart}, ${upTimeEnd}, 
        ${rewardAddress}, ${gatewayAddress}, ${key}, ${code}, ${now}, ${now}
      )
      ON CONFLICT (id) 
      DO UPDATE SET 
        status = ${status}, 
        updated_at = ${now}, 
        up_time_start = CASE WHEN ${status} = 'connected' AND saito_miner.device_status.status = 'disconnected' THEN ${now} ELSE saito_miner.device_status.up_time_start END,
        up_time_end = CASE WHEN ${status} = 'disconnected' AND saito_miner.device_status.status = 'connected' THEN ${now} ELSE saito_miner.device_status.up_time_end END,
        reward_address = ${rewardAddress}, 
        gateway_address = ${gatewayAddress}, 
        key = ${key}, 
        code = ${code}
    `);
  }

  async findDeviceStatus(conn: DatabaseTransactionConnection, deviceId: string): Promise<TDeviceStatus | null> {
    const result = await conn.query(SQL.type(DeviceStatus)`
      SELECT *
      FROM saito_miner.device_status
      WHERE id = ${deviceId};
    `);
    
    const row = result.rows[0] as DeviceStatusRow | undefined;
    return row ? formatDeviceStatus(row) : null;
  }

  async markDevicesOffline(conn: DatabaseTransactionConnection, thresholdTime: Date) {
    const thresholdTimeStr = toISOString(thresholdTime);
    return conn.query(SQL.type(DeviceStatus)`
      UPDATE saito_miner.device_status 
      SET status = 'disconnected', up_time_end = NOW()
      WHERE updated_at < ${thresholdTimeStr} AND status = 'connected';
    `);
  }

  async findDeviceList(conn: DatabaseTransactionConnection): Promise<TDeviceListItem[]> {
    const result = await conn.query(SQL.type(DeviceListItem)`
      SELECT id, name, status 
      FROM saito_miner.device_status 
      WHERE status = 'connected';
    `);
    
    return formatDeviceList(result.rows as DeviceStatusRow[]);
  }

  async findCurrentDevice(conn: DatabaseTransactionConnection): Promise<TDeviceStatus> {  
    const result = await conn.query(SQL.type(DeviceStatus)`
      SELECT *
      FROM saito_miner.device_status 
      WHERE status = 'connected' 
      ORDER BY updated_at DESC 
      LIMIT 1;
    `);
    
    const row = result.rows[0] as DeviceStatusRow | undefined;
    return row ? formatDeviceStatus(row) : defaultDevice;
  }
  
  async findDevicesTasks(conn: DatabaseTransactionConnection, deviceId: string): Promise<TTaskResult[]> {
    const result = await conn.query(SQL.type(TaskResult)`
      SELECT id, model, status, created_at
      FROM saito_miner.tasks
      WHERE device_id = ${deviceId}
      ORDER BY created_at DESC;
    `);
    
    return (result.rows as TaskRow[]).map(formatTask);
  }
  
  async findDeviceEarnings(conn: DatabaseTransactionConnection, deviceId: string): Promise<TEarningResult[]> {
    const result = await conn.query(SQL.type(EarningResult)`
      SELECT 
        id, 
        block_rewards, 
        job_rewards, 
        created_at,
        task_id
      FROM saito_miner.earnings
      WHERE device_id = ${deviceId}
      ORDER BY created_at DESC;
    `);
    
    return (result.rows as EarningRow[]).map(formatEarning);
  }
}
