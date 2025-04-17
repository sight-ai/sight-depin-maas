import { Inject } from "@nestjs/common";
import * as R from 'ramda';

const toISOString = R.curry((date: Date) => date.toISOString());
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { z } from "zod";
import { DeviceStatus, DeviceStatusSchema, m } from "@saito/models";

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
    console.log('deviceId', deviceId);
    const now = toISOString(new Date()); // Convert date to ISO string for SQL compatibility
    return conn.query(SQL.type(m.deviceStatus('UpdateDeviceStatusSchema'))`
 WITH latest AS (
    SELECT * 
    FROM saito_miner.device_status
    WHERE device_id = ${deviceId}
    ORDER BY created_at DESC
    LIMIT 1
),
updated AS (
    UPDATE saito_miner.device_status
    SET status = ${status}, updated_at = ${now}, reward_address = ${rewardAddress}, gateway_address = ${gatewayAddress}, key = ${key}, code = ${code}
    WHERE device_id = ${deviceId}
    RETURNING * -- Return the updated row
)
INSERT INTO saito_miner.device_status (device_id, name, status, up_time_start, created_at, updated_at, reward_address, gateway_address, key, code)
SELECT COALESCE(${deviceId}, 'default_id'), 
       COALESCE(${name}, 'default_name'), 
       COALESCE(${status}, 'unknown_status'), 
       ${now}, ${now}, ${now}, ${rewardAddress}, ${gatewayAddress}, ${key}, ${code}
WHERE NOT EXISTS (SELECT 1 FROM updated);
    `);
  }

  async findDeviceStatus(conn: DatabaseTransactionConnection, deviceId: string): Promise<{
    name: string,
    status: "online" | "offline",
  } | null> {
    console.log('deviceId', deviceId);
    const result = await conn.query(SQL.type(m.deviceStatus('FindDeviceStatusSchema'))`
      SELECT name, status
      FROM saito_miner.device_status
      WHERE device_id = ${deviceId};
    `);
    console.log('result', result);
    return result.rows[0];
  }

  async markDevicesOffline(conn: DatabaseTransactionConnection, thresholdTime: Date) {
    const thresholdTimeStr = toISOString(thresholdTime); // Convert to string for SQL compatibility
    return conn.query(SQL.type((m.deviceStatus('MarkDevicesOfflineSchema')))`
      UPDATE saito_miner.device_status 
      SET status = 'offline', up_time_end = NOW()
      WHERE updated_at < ${thresholdTimeStr} AND status = 'online';
    `);
  }

  async findDeviceList(conn: DatabaseTransactionConnection): Promise<{
    deviceId: string,
    name: string,
    status: "online" | "offline"
  }[]> {
    const result = await conn.query(SQL.type(m.deviceStatus('FindDeviceListSchema'))`
      SELECT device_id as "deviceId", name, status FROM saito_miner.device_status WHERE status = 'online';
    `);
    return [...result.rows];
  }

  async findCurrentDevice(conn: DatabaseTransactionConnection): Promise<{
    deviceId: string,
    name: string,
    status: "online" | "offline",
    rewardAddress: string | null
  }> {  
    const result = await conn.query(SQL.type(m.deviceStatus('FindCurrentDeviceSchema'))`
      SELECT device_id as "deviceId", name, status, reward_address as "rewardAddress"
      FROM saito_miner.device_status 
      WHERE status = 'online' 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);
    
    if (!result.rows.length) {
      return {
        deviceId: 'default_device',
        name: 'Default Device',
        status: 'offline' as const,
        rewardAddress: null
      };
    }
    
    return result.rows[0];
  }
}
