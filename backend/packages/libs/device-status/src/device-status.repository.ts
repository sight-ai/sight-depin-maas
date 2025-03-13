import { Inject } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { z } from "zod";
import { DeviceStatus, DeviceStatusSchema } from "@saito/models";

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
    status: "online" | "offline"
  ) {
    const now = new Date().toISOString(); // Convert date to ISO string for SQL compatibility
    console.log(111, deviceId, name, status, now);
    return conn.query(SQL.type(z.object(
      {
        deviceId: z.string(),
        name: z.string(),
        status: z.enum(["online", "offline"]),
        now: z.string()
      }
    ))`
 WITH latest AS (
    SELECT * 
    FROM saito_miner.device_status
    WHERE device_id = ${deviceId}
    ORDER BY created_at DESC
    LIMIT 1
),
updated AS (
    UPDATE saito_miner.device_status
    SET status = ${status}, updated_at = ${now}
    WHERE device_id = ${deviceId}
    RETURNING * -- Return the updated row
)
INSERT INTO saito_miner.device_status (device_id, name, status, up_time_start, created_at, updated_at)
SELECT COALESCE(${deviceId}, 'default_id'), 
       COALESCE(${name}, 'default_name'), 
       COALESCE(${status}, 'unknown_status'), 
       ${now}, ${now}, ${now}
WHERE NOT EXISTS (SELECT 1 FROM updated);
    `);
  }

  async findDeviceStatus(conn: DatabaseTransactionConnection, deviceId: string): Promise<{
    name: string,
    status: "online" | "offline",
  } | null> {
    const result = await conn.maybeOne(SQL.type(z.object({
      name: z.string(),
      status: z.enum(["online", "offline"]),
    }))`
      SELECT name, status
      FROM saito_miner.device_status
      WHERE device_id = ${deviceId};
    `);
    return result;
  }

  async markDevicesOffline(conn: DatabaseTransactionConnection, thresholdTime: Date) {
    const thresholdTimeStr = thresholdTime.toISOString(); // Convert to string for SQL compatibility
    return conn.query(SQL.type(z.object({
      thresholdTimeStr: z.string()
    }))`
      UPDATE saito_miner.device_status 
      SET status = 'offline', up_time_end = NOW()
      WHERE updated_at < ${thresholdTimeStr} AND status = 'online';
    `);
  }
}
