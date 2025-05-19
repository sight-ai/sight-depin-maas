import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { Database } from "better-sqlite3";
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
  async transaction<T>(handler: (db: Database) => T) {
    return this.persistentService.transaction(handler);
  }

  /**
   * 获取当前设备ID
   */
  async getCurrentDeviceId(db: Database): Promise<string> {
    const result = db.prepare(`
      SELECT id
      FROM saito_miner_device_status
      WHERE status = 'connected'
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    return R.propOr('24dea62e-95df-4549-b3ba-c9522cd5d5c1', 'id', result);
  }

  /**
   * 查找是否存在指定任务
   */
  async findExistingTask(db: Database, taskId: string): Promise<boolean> {
    const result = db.prepare(`
      SELECT id, status FROM saito_miner_tasks
      WHERE id = ? AND source = 'gateway'
    `).get(taskId);

    return !!result;
  }

  /**
   * 更新已存在的任务
   */
  async updateExistingTask(db: Database, task: z.infer<typeof Task>): Promise<void> {
    try {
      db.prepare(`
        UPDATE saito_miner_tasks
        SET
          model = ?,
          status = ?,
          total_duration = ?,
          load_duration = ?,
          prompt_eval_count = ?,
          prompt_eval_duration = ?,
          eval_count = ?,
          eval_duration = ?,
          updated_at = ?
        WHERE id = ? AND source = 'gateway'
      `).run(
        task.model,
        task.status,
        task.total_duration,
        task.load_duration,
        task.prompt_eval_count,
        task.prompt_eval_duration,
        task.eval_count,
        task.eval_duration,
        task.updated_at,
        task.id
      );
    } catch (error) {
      this.logger.error(`更新任务失败: ${task.id}`, error);
      throw error;
    }
  }

  /**
   * 更新现有任务的状态（批量操作）
   */
  async updateExistingTaskStatuses(db: Database): Promise<void> {
    try {
      db.prepare(`
        UPDATE saito_miner_tasks
        SET status = 'completed'
        WHERE status = 'succeed' AND source = 'gateway'
      `).run();
    } catch (error) {
      this.logger.error('批量更新任务状态失败', error);
      throw error;
    }
  }

  /**
   * 创建新任务
   */
  async createTask(db: Database, task: z.infer<typeof Task>): Promise<void> {
    try {
      db.prepare(`
        INSERT INTO saito_miner_tasks (
          id, model, created_at, status, total_duration,
          load_duration, prompt_eval_count, prompt_eval_duration,
          eval_count, eval_duration, updated_at, source, device_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gateway', ?
        )
      `).run(
        task.id,
        task.model,
        task.created_at,
        task.status,
        task.total_duration,
        task.load_duration,
        task.prompt_eval_count,
        task.prompt_eval_duration,
        task.eval_count,
        task.eval_duration,
        task.updated_at,
        task.device_id
      );
    } catch (error) {
      this.logger.error(`创建任务失败: ${task.id}`, error);
      throw error;
    }
  }

  /**
   * 查找是否存在指定收益记录
   */
  async findExistingEarning(db: Database, earningId: string): Promise<boolean> {
    const result = db.prepare(`
      SELECT id FROM saito_miner_earnings
      WHERE id = ? AND source = 'gateway'
    `).get(earningId);
    return !!result;
  }

  /**
   * 更新已存在的收益记录
   */
  async updateExistingEarning(db: Database, earning: z.infer<typeof Earning>): Promise<void> {
    try {
      // 验证任务ID是否存在（如果提供了任务ID）
      if (earning.task_id) {
        const taskExists = db.prepare(`
          SELECT id FROM saito_miner_tasks
          WHERE id = ?
        `).get(earning.task_id);

        if (!taskExists) {
          this.logger.warn(`任务ID不存在: ${earning.task_id}，跳过更新收益记录`);
          // 如果任务不存在，不更新收益记录
          throw new Error(`任务ID不存在: ${earning.task_id}，无法更新收益记录`);
        }
      }

      // 构建基本更新语句
      let sql = `
        UPDATE saito_miner_earnings
        SET
          block_rewards = ?,
          job_rewards = ?,
          updated_at = ?
      `;

      // 准备参数数组
      const params = [
        earning.block_rewards,
        earning.job_rewards,
        earning.updated_at
      ];

      // 添加可选字段
      if (earning.task_id !== undefined && earning.task_id !== null) {
        sql += `, task_id = ?`;
        params.push(earning.task_id);
      }

      if (earning.amount !== undefined) {
        sql += `, amount = ?`;
        params.push(earning.amount);
      }

      if (earning.type !== undefined) {
        sql += `, type = ?`;
        params.push(earning.type);
      }

      if (earning.status !== undefined) {
        sql += `, status = ?`;
        params.push(earning.status);
      }

      if (earning.transaction_hash !== undefined) {
        sql += `, transaction_hash = ?`;
        params.push(earning.transaction_hash);
      }

      if (earning.description !== undefined) {
        sql += `, description = ?`;
        params.push(earning.description);
      }

      // 添加WHERE条件
      sql += ` WHERE id = ? AND source = 'gateway'`;
      params.push(earning.id);

      // 执行更新
      db.prepare(sql).run(...params);
    } catch (error) {
      this.logger.error(`更新收益记录失败: ${earning.id}`, error);
      throw error;
    }
  }

  /**
   * 创建新的收益记录
   */
  async createEarning(db: Database, earning: z.infer<typeof Earning>): Promise<void> {
    try {
      // 验证设备ID是否存在
      if (earning.device_id) {
        const deviceExists = db.prepare(`
          SELECT id FROM saito_miner_device_status
          WHERE id = ?
        `).get(earning.device_id);

        if (!deviceExists) {
          this.logger.warn(`设备ID不存在: ${earning.device_id}，无法创建收益记录`);
          throw new Error(`设备ID不存在: ${earning.device_id}`);
        }
      }

      // 验证任务ID是否存在（如果提供了任务ID）
      if (earning.task_id) {
        const taskExists = db.prepare(`
          SELECT id FROM saito_miner_tasks
          WHERE id = ?
        `).get(earning.task_id);

        if (!taskExists) {
          this.logger.warn(`任务ID不存在: ${earning.task_id}，跳过创建收益记录`);
          // 如果任务不存在，不创建收益记录
          throw new Error(`任务ID不存在: ${earning.task_id}，无法创建收益记录`);
        }
      }

      // 构建基础SQL语句和参数
      let fields = 'id, block_rewards, job_rewards, created_at, updated_at, source, device_id';
      let placeholders = '?, ?, ?, ?, ?, \'gateway\', ?';
      const params = [
        earning.id,
        earning.block_rewards,
        earning.job_rewards,
        earning.created_at,
        earning.updated_at,
        earning.device_id
      ];

      this.logger.debug(`Creating earning: ${JSON.stringify(earning)}`);

      // 添加task_id字段（如果存在）
      if (earning.task_id !== undefined && earning.task_id !== null) {
        fields += ', task_id';
        placeholders += ', ?';
        params.push(earning.task_id);
      }

      // 添加新字段（如果存在）
      if (earning.amount !== undefined) {
        fields += ', amount';
        placeholders += ', ?';
        params.push(earning.amount);
      }

      if (earning.type !== undefined) {
        fields += ', type';
        placeholders += ', ?';
        params.push(earning.type);
      }

      if (earning.status !== undefined) {
        fields += ', status';
        placeholders += ', ?';
        params.push(earning.status);
      }

      if (earning.transaction_hash !== undefined) {
        fields += ', transaction_hash';
        placeholders += ', ?';
        params.push(earning.transaction_hash);
      }

      if (earning.description !== undefined) {
        fields += ', description';
        placeholders += ', ?';
        params.push(earning.description);
      }

      // 执行插入
      db.prepare(`
        INSERT INTO saito_miner_earnings (${fields})
        VALUES (${placeholders})
      `).run(...params);
    } catch (error) {
      this.logger.error(`创建收益记录失败: ${earning.id}`, error);
      throw error;
    }
  }
}