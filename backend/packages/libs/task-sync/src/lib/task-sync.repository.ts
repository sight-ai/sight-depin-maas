import { Inject } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";

export class TaskSyncRepository {
  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) {}

  async transaction<T>(handler: (conn: DatabaseTransactionConnection) => Promise<T>) {
    return this.persistentService.pgPool.transaction(handler);
  }

  async getCurrentDeviceId(conn: DatabaseTransactionConnection): Promise<string> {
    const result = await conn.maybeOne(SQL.unsafe`
      SELECT device_id
      FROM saito_miner.device_status 
      WHERE status = 'online' 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);
    
    return result?.device_id || 'default_device';
  }
} 