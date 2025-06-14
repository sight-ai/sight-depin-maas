import { Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { 
  ITaskManager, 
  IDataAccessLayer, 
  MinerConfig, 
  TaskNotFoundError,
  MinerError 
} from '../core-contracts/miner-core.contracts';

/**
 * 任务管理器基础实现类
 * 提供通用的任务管理功能实现
 */
export abstract class BaseTaskManager implements ITaskManager {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly dataAccess: IDataAccessLayer,
    protected readonly config: MinerConfig
  ) {}

  /**
   * 创建任务
   */
  async createTask(args: ModelOfMiner<'CreateTaskRequest'>): Promise<ModelOfMiner<'Task'>> {
    try {
      this.logger.debug(`Creating task with model: ${args.model}`);
      
      const deviceId = await this.getDeviceId(args);
      const task = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return this.dataAccess.createTask(args.model, deviceId);
        }),
        'create task'
      );

      this.logger.log(`Task created successfully: ${task.id}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task: ${error}`);
      throw new MinerError('Failed to create task', 'TASK_CREATION_ERROR', { args, error });
    }
  }

  /**
   * 更新任务
   */
  async updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>> {
    try {
      this.logger.debug(`Updating task ${id} with updates:`, updates);

      const task = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          const existingTask = await this.dataAccess.getTaskById(id);
          if (!existingTask) {
            throw new TaskNotFoundError(id);
          }

          return this.dataAccess.updateTask(id, updates);
        }),
        `update task ${id}`
      );

      // this.logger.log(`Task updated successfully: ${id}`);
      return task;
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw error;
      }
      this.logger.error(`Failed to update task ${id}: ${error}`);
      throw new MinerError('Failed to update task', 'TASK_UPDATE_ERROR', { id, updates, error });
    }
  }

  /**
   * 获取任务历史
   */
  async getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: ModelOfMiner<'Task'>[];
  }> {
    try {
      this.logger.debug(`Getting task history: page=${page}, limit=${limit}`);

      const deviceId = await this.getCurrentDeviceId();
      const isRegistered = await this.isDeviceRegistered();

      const result = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return this.dataAccess.getTasksPaginated(page, limit, deviceId, isRegistered);
        }),
        'get task history'
      );

      return {
        page,
        limit,
        total: result.count,
        tasks: result.tasks
      };
    } catch (error) {
      this.logger.error(`Failed to get task history: ${error}`);
      throw new MinerError('Failed to get task history', 'TASK_HISTORY_ERROR', { page, limit, error });
    }
  }

  /**
   * 获取设备任务
   */
  async getDeviceTasks(deviceId: string, limit?: number): Promise<ModelOfMiner<'Task'>[]> {
    try {
      // this.logger.debug(`Getting tasks for device: ${deviceId}`);

      const isRegistered = await this.isDeviceRegistered();
      const tasks = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          const allTasks = await this.dataAccess.getTasksByDeviceId(deviceId, isRegistered);
          return limit ? allTasks.slice(0, limit) : allTasks;
        }),
        `get device tasks for ${deviceId}`
      );

      this.logger.debug(`Found ${tasks.length} tasks for device ${deviceId}`);
      return tasks;
    } catch (error) {
      this.logger.error(`Failed to get device tasks: ${error}`);
      throw new MinerError('Failed to get device tasks', 'DEVICE_TASKS_ERROR', { deviceId, limit, error });
    }
  }

  /**
   * 处理过期的进行中任务
   */
  async handleStaleInProgressTasks(): Promise<void> {
    try {
      // this.logger.debug('Checking for stale in-progress tasks');

      const deviceId = await this.getCurrentDeviceId();
      const tasks = await this.getDeviceTasks(deviceId);
      
      const staleTasks = tasks.filter(task => 
        task.status === 'running' && 
        this.isTaskStale(task)
      );

      if (staleTasks.length === 0) {
        this.logger.debug('No stale tasks found');
        return;
      }

      this.logger.log(`Found ${staleTasks.length} stale tasks, updating to failed status`);

      for (const task of staleTasks) {
        try {
          await this.updateTask(task.id, { status: 'failed' });
        } catch (error) {
          this.logger.warn(`Failed to update stale task ${task.id}: ${error}`);
        }
      }

      this.logger.log(`Updated ${staleTasks.length} stale tasks to failed status`);
    } catch (error) {
      this.logger.error(`Failed to handle stale tasks: ${error}`);
      // 不抛出错误，因为这是定时任务，不应该中断其他操作
    }
  }

  // =============================================================================
  // 受保护的辅助方法
  // =============================================================================

  /**
   * 重试机制
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxRetries = this.config.maxRetries;
    const baseDelay = this.config.retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error(`${operationName} failed after ${maxRetries} attempts: ${error}`);
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${error}`);
        
        await this.sleep(delay);
      }
    }

    throw new Error('Unreachable code');
  }

  /**
   * 检查任务是否过期
   */
  protected isTaskStale(task: ModelOfMiner<'Task'>): boolean {
    const now = new Date().getTime();
    const taskTime = new Date(task.created_at).getTime();
    return (now - taskTime) > this.config.staleTaskThreshold;
  }

  /**
   * 睡眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  /**
   * 获取设备ID
   */
  protected abstract getDeviceId(args: ModelOfMiner<'CreateTaskRequest'>): Promise<string>;

  /**
   * 获取当前设备ID
   */
  protected abstract getCurrentDeviceId(): Promise<string>;

  /**
   * 检查设备是否已注册
   */
  protected abstract isDeviceRegistered(): Promise<boolean>;

  /**
   * 获取任务统计信息
   */
  async getTaskStats(): Promise<any> {
    try {
      this.logger.debug('Getting task statistics');
      // 默认实现，子类可以重写
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0
      };
    } catch (error) {
      this.logger.error(`Failed to get task stats: ${error}`);
      return { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    }
  }
}
