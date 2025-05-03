import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { Task, Earning } from "@saito/models";
import { z } from 'zod';
import * as R from 'ramda';

/**
 * 任务同步仓库
 * 负责与数据库的交互
 */
export class TaskSyncRepository {
  private readonly logger = new Logger(TaskSyncRepository.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) {}

  /**
   * 创建数据库事务
   */
  async transaction<T>(handler: (conn: DatabaseTransactionConnection) => Promise<T>) {
    return this.persistentService.pgPool.transaction(handler);
  }

  /**
   * 获取当前设备ID
   */
  async getCurrentDeviceId(conn: DatabaseTransactionConnection): Promise<string> {
    const result = await conn.maybeOne(SQL.unsafe`
      SELECT id
      FROM saito_miner.device_status
      WHERE status = 'connected'
      ORDER BY created_at DESC
      LIMIT 1;
    `);

    return R.propOr('24dea62e-95df-4549-b3ba-c9522cd5d5c1', 'id', result);
  }

  /**
   * 查找是否存在指定任务
   */
  async findExistingTask(conn: DatabaseTransactionConnection, taskId: string): Promise<boolean> {
    const result = await conn.maybeOne(SQL.unsafe`
      SELECT id, status FROM saito_miner.tasks
      WHERE id = ${taskId} AND source = 'gateway'
    `);

    return !!result;
  }

  /**
   * 更新已存在的任务
   */
  async updateExistingTask(conn: DatabaseTransactionConnection, task: z.infer<typeof Task>): Promise<void> {
    try {
      await conn.query(SQL.unsafe`
        UPDATE saito_miner.tasks
        SET
          model = ${task.model},
          status = ${task.status},
          total_duration = ${task.total_duration},
          load_duration = ${task.load_duration},
          prompt_eval_count = ${task.prompt_eval_count},
          prompt_eval_duration = ${task.prompt_eval_duration},
          eval_count = ${task.eval_count},
          eval_duration = ${task.eval_duration},
          updated_at = ${task.updated_at}
        WHERE id = ${task.id} AND source = 'gateway'
      `);
    } catch (error) {
      this.logger.error(`更新任务失败: ${task.id}`, error);
      throw error;
    }
  }

  /**
   * 更新现有任务的状态（批量操作）
   */
  async updateExistingTaskStatuses(conn: DatabaseTransactionConnection): Promise<void> {
    try {
      await conn.query(SQL.unsafe`
        UPDATE saito_miner.tasks
        SET status = 'completed'
        WHERE status = 'succeed' AND source = 'gateway'
      `);
    } catch (error) {
      this.logger.error('批量更新任务状态失败', error);
      throw error;
    }
  }

  /**
   * 创建新任务
   */
  async createTask(conn: DatabaseTransactionConnection, task: z.infer<typeof Task>): Promise<void> {
    try {
      await conn.query(SQL.unsafe`
        INSERT INTO saito_miner.tasks (
          id, model, created_at, status, total_duration,
          load_duration, prompt_eval_count, prompt_eval_duration,
          eval_count, eval_duration, updated_at, source, device_id
        ) VALUES (
          ${task.id}, ${task.model}, ${task.created_at}, ${task.status},
          ${task.total_duration}, ${task.load_duration}, ${task.prompt_eval_count},
          ${task.prompt_eval_duration}, ${task.eval_count}, ${task.eval_duration},
          ${task.updated_at}, 'gateway', ${task.device_id}
        )
      `);
    } catch (error) {
      this.logger.error(`创建任务失败: ${task.id}`, error);
      throw error;
    }
  }

  /**
   * 查找是否存在指定收益记录
   */
  async findExistingEarning(conn: DatabaseTransactionConnection, earningId: string): Promise<boolean> {
    const result = await conn.maybeOne(SQL.unsafe`
      SELECT id FROM saito_miner.earnings
      WHERE id = ${earningId} AND source = 'gateway'
    `);
    return !!result;
  }

  /**
   * 更新已存在的收益记录
   */
  async updateExistingEarning(conn: DatabaseTransactionConnection, earning: z.infer<typeof Earning>): Promise<void> {
    try {
      // 构建动态更新SQL
      let updateFields = SQL.unsafe`
        block_rewards = ${earning.block_rewards},
        job_rewards = ${earning.job_rewards},
        updated_at = ${earning.updated_at}
      `;

      // 添加新字段（如果存在）
      if (earning.amount !== undefined) {
        updateFields = SQL.unsafe`${updateFields}, amount = ${earning.amount}`;
      }
      if (earning.type !== undefined) {
        updateFields = SQL.unsafe`${updateFields}, type = ${earning.type}`;
      }
      if (earning.status !== undefined) {
        updateFields = SQL.unsafe`${updateFields}, status = ${earning.status}`;
      }
      if (earning.transaction_hash !== undefined) {
        updateFields = SQL.unsafe`${updateFields}, transaction_hash = ${earning.transaction_hash}`;
      }
      if (earning.description !== undefined) {
        updateFields = SQL.unsafe`${updateFields}, description = ${earning.description}`;
      }

      await conn.query(SQL.unsafe`
        UPDATE saito_miner.earnings
        SET ${updateFields}
        WHERE id = ${earning.id} AND source = 'gateway'
      `);
    } catch (error) {
      this.logger.error(`更新收益记录失败: ${earning.id}`, error);
      throw error;
    }
  }

  /**
   * 创建新的收益记录
   */
  async createEarning(conn: DatabaseTransactionConnection, earning: z.infer<typeof Earning>): Promise<void> {
    try {
      // 构建字段和值列表
      let fields = SQL.unsafe`id, block_rewards, job_rewards, created_at, updated_at, source, device_id, task_id`;
      let values = SQL.unsafe`${earning.id}, ${earning.block_rewards}, ${earning.job_rewards},
          ${earning.created_at}, ${earning.updated_at}, 'gateway', ${earning.device_id}, ${earning.task_id}`;

      // 添加新字段（如果存在）
      if (earning.amount !== undefined) {
        fields = SQL.unsafe`${fields}, amount`;
        values = SQL.unsafe`${values}, ${earning.amount}`;
      }
      if (earning.type !== undefined) {
        fields = SQL.unsafe`${fields}, type`;
        values = SQL.unsafe`${values}, ${earning.type}`;
      }
      if (earning.status !== undefined) {
        fields = SQL.unsafe`${fields}, status`;
        values = SQL.unsafe`${values}, ${earning.status}`;
      }
      if (earning.transaction_hash !== undefined) {
        fields = SQL.unsafe`${fields}, transaction_hash`;
        values = SQL.unsafe`${values}, ${earning.transaction_hash}`;
      }
      if (earning.description !== undefined) {
        fields = SQL.unsafe`${fields}, description`;
        values = SQL.unsafe`${values}, ${earning.description}`;
      }

      await conn.query(SQL.unsafe`
        INSERT INTO saito_miner.earnings (${fields})
        VALUES (${values})
      `);
    } catch (error) {
      this.logger.error(`创建收益记录失败: ${earning.id}`, error);
      throw error;
    }
  }
}