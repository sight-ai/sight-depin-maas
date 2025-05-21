import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { Task, Earning } from "@saito/models";
import { z } from 'zod';
import * as R from 'ramda';

/**
 * 安全地解析 JSON 字符串
 * @param jsonString 要解析的 JSON 字符串
 * @param logger 用于记录错误的日志记录器
 * @param errorMessage 错误消息前缀
 * @returns 解析后的对象，如果解析失败则返回 null
 */
const safeJsonParse = <T>(jsonString: any, logger: Logger, errorMessage: string = 'Failed to parse JSON'): T | null => {
  if (!jsonString) {
    return null;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error(`${errorMessage}: ${error}`);
    return null;
  }
};

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
  async transaction<T>(handler: (db: any) => T) {
    return this.persistentService.transaction(handler);
  }

  /**
   * 获取当前设备ID
   */
  async getCurrentDeviceId(_db: any): Promise<string> {
    try {
      let latestDevice = null;
      let latestTimestamp = '';

      // 使用 LevelDB 的迭代器获取所有设备
      for await (const [key, value] of this.persistentService.deviceStatusDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        const device = safeJsonParse<any>(
          value,
          this.logger,
          `Failed to parse device data for key ${key}`
        );

        if (device && device.status === 'connected') {
          // 找出创建时间最新的设备
          if (!latestDevice || device.created_at > latestTimestamp) {
            latestDevice = device;
            latestTimestamp = device.created_at;
          }
        }
      }

      return latestDevice ? latestDevice.id : '24dea62e-95df-4549-b3ba-c9522cd5d5c1';
    } catch (error) {
      this.logger.error(`Error getting current device ID: ${error}`);
      return '24dea62e-95df-4549-b3ba-c9522cd5d5c1';
    }
  }

  /**
   * 查找是否存在指定任务
   */
  async findExistingTask(_db: any, taskId: string): Promise<boolean> {
    try {
      const taskData = await this.persistentService.tasksDb.get(taskId);
      const task = safeJsonParse<any>(
        taskData,
        this.logger,
        `Error finding existing task for task ID ${taskId}`
      );
      return task && task.source === 'gateway';
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return false;
      }
      this.logger.error(`Error finding existing task: ${error}`);
      return false;
    }
  }

  /**
   * 更新已存在的任务
   */
  async updateExistingTask(_db: any, task: z.infer<typeof Task>): Promise<void> {
    try {
      // 获取现有任务
      const taskData = await this.persistentService.tasksDb.get(task.id);
      const existingTask = safeJsonParse<any>(
        taskData,
        this.logger,
        `Error parsing existing task data for task ID ${task.id}`
      );

      if (!existingTask) {
        throw new Error(`无法解析任务数据: ${task.id}`);
      }

      // 确保任务来源是 gateway
      if (existingTask.source !== 'gateway') {
        throw new Error(`任务来源不是 gateway: ${task.id}`);
      }

      // 更新任务
      const updatedTask = {
        ...existingTask,
        model: task.model,
        status: task.status,
        total_duration: task.total_duration,
        load_duration: task.load_duration,
        prompt_eval_count: task.prompt_eval_count,
        prompt_eval_duration: task.prompt_eval_duration,
        eval_count: task.eval_count,
        eval_duration: task.eval_duration,
        updated_at: task.updated_at
      };

      // 保存到 LevelDB
      await this.persistentService.tasksDb.put(task.id, JSON.stringify(updatedTask));
    } catch (error) {
      this.logger.error(`更新任务失败: ${task.id}`, error);
      throw error;
    }
  }

  /**
   * 更新现有任务的状态（批量操作）
   */
  async updateExistingTaskStatuses(_db: any): Promise<void> {
    try {
      const tasksToUpdate = [];

      // 使用 LevelDB 的迭代器获取所有任务
      for await (const [key, value] of this.persistentService.tasksDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        const task = safeJsonParse<any>(
          value,
          this.logger,
          `Failed to parse task data for key ${key}`
        );

        if (task && task.status === 'succeed' && task.source === 'gateway') {
          tasksToUpdate.push({
            ...task,
            status: 'completed'
          });
        }
      }

      // 批量更新任务
      const operations = tasksToUpdate.map(task => ({
        type: 'put' as const,
        key: task.id,
        value: JSON.stringify(task)
      }));

      if (operations.length > 0) {
        await this.persistentService.tasksDb.batch(operations);
      }
    } catch (error) {
      this.logger.error('批量更新任务状态失败', error);
      throw error;
    }
  }

  /**
   * 创建新任务
   */
  async createTask(_db: any, task: z.infer<typeof Task>): Promise<void> {
    try {
      // 创建新任务对象
      const newTask = {
        id: task.id,
        model: task.model,
        created_at: task.created_at,
        status: task.status,
        total_duration: task.total_duration,
        load_duration: task.load_duration,
        prompt_eval_count: task.prompt_eval_count,
        prompt_eval_duration: task.prompt_eval_duration,
        eval_count: task.eval_count,
        eval_duration: task.eval_duration,
        updated_at: task.updated_at,
        source: 'gateway',
        device_id: task.device_id
      };

      // 保存到 LevelDB
      await this.persistentService.tasksDb.put(task.id, JSON.stringify(newTask));
    } catch (error) {
      this.logger.error(`创建任务失败: ${task.id}`, error);
      throw error;
    }
  }

  /**
   * 查找是否存在指定收益记录
   */
  async findExistingEarning(_db: any, earningId: string): Promise<boolean> {
    try {
      const earningData = await this.persistentService.earningsDb.get(earningId);
      const earning = safeJsonParse<any>(
        earningData,
        this.logger,
        `Error finding existing earning for earning ID ${earningId}`
      );
      return earning && earning.source === 'gateway';
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return false;
      }
      this.logger.error(`Error finding existing earning: ${error}`);
      return false;
    }
  }

  /**
   * 更新已存在的收益记录
   */
  async updateExistingEarning(_db: any, earning: z.infer<typeof Earning>): Promise<void> {
    try {
      // 验证任务ID是否存在（如果提供了任务ID）
      if (earning.task_id) {
        try {
          await this.persistentService.tasksDb.get(earning.task_id);
        } catch (error) {
          if ((error as any).code === 'LEVEL_NOT_FOUND') {
            this.logger.warn(`任务ID不存在: ${earning.task_id}，跳过更新收益记录`);
            throw new Error(`任务ID不存在: ${earning.task_id}，无法更新收益记录`);
          }
          throw error;
        }
      }

      // 获取现有收益记录
      const earningData = await this.persistentService.earningsDb.get(earning.id);
      const existingEarning = safeJsonParse<any>(
        earningData,
        this.logger,
        `Error parsing existing earning data for earning ID ${earning.id}`
      );

      if (!existingEarning) {
        throw new Error(`无法解析收益记录数据: ${earning.id}`);
      }

      // 确保收益记录来源是 gateway
      if (existingEarning.source !== 'gateway') {
        throw new Error(`收益记录来源不是 gateway: ${earning.id}`);
      }

      // 更新收益记录
      const updatedEarning = {
        ...existingEarning,
        block_rewards: earning.block_rewards,
        job_rewards: earning.job_rewards,
        updated_at: earning.updated_at
      };

      // 添加可选字段
      if (earning.task_id !== undefined && earning.task_id !== null) {
        updatedEarning.task_id = earning.task_id;
      }

      if (earning.amount !== undefined) {
        updatedEarning.amount = earning.amount;
      }

      if (earning.type !== undefined) {
        updatedEarning.type = earning.type;
      }

      if (earning.status !== undefined) {
        updatedEarning.status = earning.status;
      }

      if (earning.transaction_hash !== undefined) {
        updatedEarning.transaction_hash = earning.transaction_hash;
      }

      if (earning.description !== undefined) {
        updatedEarning.description = earning.description;
      }

      // 保存到 LevelDB
      await this.persistentService.earningsDb.put(earning.id, JSON.stringify(updatedEarning));
    } catch (error) {
      this.logger.error(`更新收益记录失败: ${earning.id}`, error);
      throw error;
    }
  }

  /**
   * 创建新的收益记录
   */
  /**
   * 获取所有网关任务ID
   */
  async getAllGatewayTaskIds(_db: any): Promise<Set<string>> {
    const taskIds = new Set<string>();

    try {
      // 使用 LevelDB 的迭代器获取所有任务
      for await (const [key, value] of this.persistentService.tasksDb.iterator()) {
        if (key === '__schema__') continue; // 跳过 schema 记录

        const task = safeJsonParse<any>(
          value,
          this.logger,
          `Failed to parse task data for key ${key}`
        );

        if (task && task.source === 'gateway') {
          taskIds.add(task.id);
        }
      }
    } catch (error) {
      this.logger.error(`Error getting all gateway task IDs: ${error}`);
    }

    return taskIds;
  }

  async createEarning(_db: any, earning: z.infer<typeof Earning>): Promise<void> {
    try {
      // 验证设备ID是否存在
      if (earning.device_id) {
        try {
          await this.persistentService.deviceStatusDb.get(earning.device_id);
        } catch (error) {
          if ((error as any).code === 'LEVEL_NOT_FOUND') {
            this.logger.warn(`设备ID不存在: ${earning.device_id}，无法创建收益记录`);
            throw new Error(`设备ID不存在: ${earning.device_id}`);
          }
          throw error;
        }
      }

      // 验证任务ID是否存在（如果提供了任务ID）
      if (earning.task_id) {
        try {
          await this.persistentService.tasksDb.get(earning.task_id);
        } catch (error) {
          if ((error as any).code === 'LEVEL_NOT_FOUND') {
            this.logger.warn(`任务ID不存在: ${earning.task_id}，跳过创建收益记录`);
            throw new Error(`任务ID不存在: ${earning.task_id}，无法创建收益记录`);
          }
          throw error;
        }
      }

      this.logger.debug(`Creating earning: ${JSON.stringify(earning)}`);

      // 创建新的收益记录对象
      const newEarning: any = {
        id: earning.id,
        block_rewards: earning.block_rewards,
        job_rewards: earning.job_rewards,
        device_id: earning.device_id,
        created_at: earning.created_at,
        updated_at: earning.updated_at,
        source: 'gateway'
      };

      // 添加可选字段
      if (earning.task_id !== undefined && earning.task_id !== null) {
        newEarning.task_id = earning.task_id;
      }

      if (earning.amount !== undefined) {
        newEarning.amount = earning.amount;
      }

      if (earning.type !== undefined) {
        newEarning.type = earning.type;
      }

      if (earning.status !== undefined) {
        newEarning.status = earning.status;
      }

      if (earning.transaction_hash !== undefined) {
        newEarning.transaction_hash = earning.transaction_hash;
      }

      if (earning.description !== undefined) {
        newEarning.description = earning.description;
      }

      // 保存到 LevelDB
      await this.persistentService.earningsDb.put(earning.id, JSON.stringify(newEarning));
    } catch (error) {
      this.logger.error(`创建收益记录失败: ${earning.id}`, error);
      throw error;
    }
  }
}