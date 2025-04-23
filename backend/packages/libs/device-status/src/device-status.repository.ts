import { Inject } from "@nestjs/common";
import * as R from 'ramda';
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { 
  ModelOfMiner
} from "@saito/models";

// Utility functions
const toISOString = R.curry((date: Date) => date.toISOString());
const getTimestamp = () => toISOString(new Date());

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

    return conn.query(SQL.unsafe`
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

  async findDeviceStatus(conn: DatabaseTransactionConnection, deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null> {
    const result = await conn.query(SQL.unsafe`
      SELECT *
      FROM saito_miner.device_status
      WHERE id = ${deviceId};
    `);
    
    const row = result.rows[0] as ModelOfMiner<'DeviceStatusRow'> | undefined;
    return row ? formatDeviceStatus(row) : null;
  }

  async markDevicesOffline(conn: DatabaseTransactionConnection, thresholdTime: Date) {
    const thresholdTimeStr = toISOString(thresholdTime);
    return conn.query(SQL.unsafe`
      UPDATE saito_miner.device_status 
      SET status = 'disconnected', up_time_end = NOW()
      WHERE updated_at < ${thresholdTimeStr} AND status = 'connected';
    `);
  }

  async findDeviceList(conn: DatabaseTransactionConnection): Promise<ModelOfMiner<'DeviceListItem'>[]> {
    const result = await conn.query(SQL.unsafe`
      SELECT id, name, status 
      FROM saito_miner.device_status 
      WHERE status = 'connected';
    `);
    
    return result.rows.map(row => formatDeviceList([row as ModelOfMiner<'DeviceStatusRow'>])[0]);
  }

  async findCurrentDevice(conn: DatabaseTransactionConnection): Promise<ModelOfMiner<'DeviceStatusModule'>> {  
    const result = await conn.query(SQL.unsafe`
      SELECT *
      FROM saito_miner.device_status 
      WHERE status = 'connected' 
      ORDER BY updated_at DESC 
      LIMIT 1;
    `);
    
    const row = result.rows[0] as ModelOfMiner<'DeviceStatusRow'> | undefined;
    return row ? formatDeviceStatus(row) : defaultDevice;
  }
  
  async findDevicesTasks(conn: DatabaseTransactionConnection, deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]> {
    const result = await conn.query(SQL.unsafe`
      SELECT *
      FROM saito_miner.tasks
      WHERE device_id = ${deviceId}
      ORDER BY created_at DESC;
    `);
    
    return result.rows.map(row => formatTask(row as ModelOfMiner<'TaskRow'>));
  }
  
  async findDeviceEarnings(conn: DatabaseTransactionConnection, deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]> {
    const result = await conn.query(SQL.unsafe`
      SELECT *
      FROM saito_miner.earnings
      WHERE device_id = ${deviceId}
      ORDER BY created_at DESC;
    `);
    
    return result.rows.map(row => formatEarning(row as ModelOfMiner<'EarningRow'>));
  }
}
