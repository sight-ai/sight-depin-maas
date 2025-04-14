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

  async findExistingTask(conn: DatabaseTransactionConnection, taskId: string): Promise<boolean> {
    const result = await conn.maybeOne(SQL.unsafe`
      SELECT id FROM saito_miner.tasks 
      WHERE id = ${taskId} AND source = 'gateway'
    `);
    return !!result;
  }

  async createTask(conn: DatabaseTransactionConnection, task: {
    id: string;
    model: string;
    created_at: string;
    status: string;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
    updated_at: string;
  }): Promise<void> {
    await conn.query(SQL.unsafe`
      INSERT INTO saito_miner.tasks (
        id, model, created_at, status, total_duration,
        load_duration, prompt_eval_count, prompt_eval_duration,
        eval_count, eval_duration, updated_at, source
      ) VALUES (
        ${task.id}, ${task.model}, ${task.created_at}, ${task.status},
        ${task.total_duration}, ${task.load_duration}, ${task.prompt_eval_count},
        ${task.prompt_eval_duration}, ${task.eval_count}, ${task.eval_duration},
        ${task.updated_at}, 'gateway'
      )
    `);
  }

  async findExistingEarning(conn: DatabaseTransactionConnection, earningId: string): Promise<boolean> {
    const result = await conn.maybeOne(SQL.unsafe`
      SELECT id FROM saito_miner.earnings 
      WHERE id = ${earningId} AND source = 'gateway'
    `);
    return !!result;
  }

  async createEarning(conn: DatabaseTransactionConnection, earning: {
    id: string;
    block_rewards: number;
    job_rewards: number;
    created_at: string;
    updated_at: string;
  }): Promise<void> {
    await conn.query(SQL.unsafe`
      INSERT INTO saito_miner.earnings (
        id, block_rewards, job_rewards, created_at, updated_at, source
      ) VALUES (
        ${earning.id}, ${earning.block_rewards}, ${earning.job_rewards},
        ${earning.created_at}, ${earning.updated_at}, 'gateway'
      )
    `);
  }
} 