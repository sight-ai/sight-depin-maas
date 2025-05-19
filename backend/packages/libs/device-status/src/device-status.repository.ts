import { Inject, Logger } from "@nestjs/common";
import * as R from 'ramda';
import { PersistentService } from "@saito/persistent";
import { Database } from "better-sqlite3";
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
  private readonly logger = new Logger(DeviceStatusRepository.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { }

  async transaction<T>(handler: (db: Database) => T) {
    return this.persistentService.transaction(handler);
  }

  async updateDeviceStatus(
    db: Database,
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

    // First check if the device exists
    const existingDevice = db.prepare(`
      SELECT id, status FROM saito_miner_device_status WHERE id = ?
    `).get(deviceId) as { id: string, status: string } | undefined;

    if (existingDevice) {
      // Update existing device
      const updateUpTimeStart = status === 'connected' && existingDevice.status === 'disconnected' ? now : null;
      const updateUpTimeEnd = status === 'disconnected' && existingDevice.status === 'connected' ? now : null;

      return db.prepare(`
        UPDATE saito_miner_device_status SET
          status = ?,
          updated_at = ?,
          up_time_start = CASE
            WHEN ? IS NOT NULL THEN ?
            ELSE up_time_start
          END,
          up_time_end = CASE
            WHEN ? IS NOT NULL THEN ?
            ELSE up_time_end
          END,
          reward_address = ?,
          gateway_address = ?,
          key = ?,
          code = ?
        WHERE id = ?
      `).run(
        status,
        now,
        updateUpTimeStart, updateUpTimeStart,
        updateUpTimeEnd, updateUpTimeEnd,
        rewardAddress,
        gatewayAddress,
        key,
        code,
        deviceId
      );
    } else {
      // Insert new device
      return db.prepare(`
        INSERT INTO saito_miner_device_status (
          id, name, status, up_time_start, up_time_end,
          reward_address, gateway_address, key, code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        deviceId, name, status, upTimeStart, upTimeEnd,
        rewardAddress, gatewayAddress, key, code, now, now
      );
    }
  }

  async findDeviceStatus(db: Database, deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null> {
    const row = db.prepare(`
      SELECT * FROM saito_miner_device_status WHERE id = ?
    `).get(deviceId) as ModelOfMiner<'DeviceStatusRow'> | undefined;

    return row ? formatDeviceStatus(row) : null;
  }

  async markDevicesOffline(db: Database, thresholdTime: Date) {
    const thresholdTimeStr = toISOString(thresholdTime);
    return db.prepare(`
      UPDATE saito_miner_device_status
      SET status = 'disconnected', up_time_end = datetime('now')
      WHERE updated_at < ? AND status = 'connected'
    `).run(thresholdTimeStr);
  }

  async findDeviceList(db: Database): Promise<ModelOfMiner<'DeviceListItem'>[]> {
    const rows = db.prepare(`
      SELECT id, name, status
      FROM saito_miner_device_status
      WHERE status = 'connected'
    `).all() as ModelOfMiner<'DeviceStatusRow'>[];

    return rows.map(row => formatDeviceList([row])[0]);
  }

  async findCurrentDevice(db: Database): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    const row = db.prepare(`
      SELECT *
      FROM saito_miner_device_status
      WHERE status = 'connected'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get() as ModelOfMiner<'DeviceStatusRow'> | undefined;

    return row ? formatDeviceStatus(row) : defaultDevice;
  }

  async findDevicesTasks(db: Database, deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]> {
    const rows = db.prepare(`
      SELECT *
      FROM saito_miner_tasks
      WHERE device_id = ?
      ORDER BY created_at DESC
    `).all(deviceId) as ModelOfMiner<'TaskRow'>[];

    return rows.map(row => formatTask(row));
  }

  async findDeviceEarnings(db: Database, deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]> {
    const rows = db.prepare(`
      SELECT *
      FROM saito_miner_earnings
      WHERE device_id = ?
      ORDER BY created_at DESC
    `).all(deviceId) as ModelOfMiner<'EarningRow'>[];

    return rows.map(row => formatEarning(row));
  }
}
