import { Injectable, Inject } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { BaseDataAccessLayer } from '../base-implementations/base-data-access';
import { MinerConfig } from '../core-contracts/miner-core.contracts';
import { MinerRepository } from '../miner.repository';

/**
 * 数据访问层服务实现
 * 继承抽象基类，实现具体的数据访问逻辑
 */
@Injectable()
export class DataAccessService extends BaseDataAccessLayer {
  constructor(
    private readonly repository: MinerRepository,
    @Inject('MINER_CONFIG') config?: MinerConfig
  ) {
    super(config || {
      maxRetries: 3,
      retryDelay: 1000,
      staleTaskThreshold: 5 * 60 * 1000,
      defaultPageSize: 20,
      enableAutoCleanup: true,
      maxConcurrentTasks: 10,
      taskTimeout: 30 * 60 * 1000,
      enableMetrics: true,
      metricsInterval: 60 * 1000,
      cleanupInterval: 24 * 60 * 60 * 1000
    });
  }

  // =============================================================================
  // 实现任务相关抽象方法
  // =============================================================================

  protected async executeCreateTask(model: string, deviceId: string): Promise<ModelOfMiner<'Task'>> {
    return this.repository.transaction(async (db) => {
      return this.repository.createTask(db, model, deviceId);
    });
  }

  protected async executeUpdateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>> {
    return this.repository.transaction(async (db) => {
      return this.repository.updateTask(db, id, updates);
    });
  }

  protected async executeGetTaskById(id: string): Promise<ModelOfMiner<'Task'> | null> {
    return this.repository.transaction(async (db) => {
      return this.repository.getTaskById(db, id);
    });
  }

  protected async executeGetTasksByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Task'>[]> {
    return this.repository.transaction(async (db) => {
      return this.repository.getTasksByDeviceId(db, deviceId, isRegistered);
    });
  }

  protected async executeGetTasksPaginated(
    page: number, 
    limit: number, 
    deviceId: string, 
    isRegistered: boolean
  ): Promise<{ count: number; tasks: ModelOfMiner<'Task'>[] }> {
    return this.repository.transaction(async (db) => {
      return this.repository.getTasks(db, page, limit, deviceId, isRegistered);
    });
  }

  // =============================================================================
  // 实现收益相关抽象方法
  // =============================================================================

  protected async executeCreateEarning(
    blockRewards: number, 
    jobRewards: number, 
    deviceId: string, 
    taskId: string
  ): Promise<void> {
    return this.repository.transaction(async (db) => {
      return this.repository.createEarning(db, blockRewards, jobRewards, deviceId, taskId);
    });
  }

  protected async executeGetEarningsByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Earning'>[]> {
    return this.repository.transaction(async (db) => {
      return this.repository.getEarningsByDeviceId(db, deviceId, isRegistered);
    });
  }

  protected async executeGetEarningInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarning'>> {
    return this.repository.transaction(async (db) => {
      return this.repository.getEarningInfo(db, deviceId, isRegistered);
    });
  }

  protected async executeGetEarningsHistory(
    deviceId: string, 
    days: number, 
    isRegistered: boolean
  ): Promise<ModelOfMiner<'MinerEarningsHistory'>[]> {
    return this.repository.transaction(async (db) => {
      return this.repository.getEarningsHistory(db, deviceId, days, isRegistered);
    });
  }

  // =============================================================================
  // 实现设备相关抽象方法
  // =============================================================================

  protected async executeGetDeviceInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerDeviceStatus'> | null> {
    return this.repository.transaction(async (db) => {
      return this.repository.getDeviceInfo(db, deviceId, isRegistered);
    });
  }

  protected async executeGetUptimePercentage(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerUptime'>> {
    return this.repository.transaction(async (db) => {
      return this.repository.getUptimePercentage(db, deviceId, isRegistered);
    });
  }

  // =============================================================================
  // 实现统计相关抽象方法
  // =============================================================================

  protected async executeGetTaskRequestData(
    deviceId: string, 
    period: 'daily' | 'weekly' | 'monthly', 
    isRegistered: boolean
  ): Promise<ModelOfMiner<'MinerDailyRequests'>[]> {
    return this.repository.transaction(async (db) => {
      return this.repository.getTaskRequestData(db, deviceId, period, isRegistered);
    });
  }

  protected async executeGetMonthlyTaskActivity(
    year: number, 
    deviceId: string, 
    isRegistered: boolean
  ): Promise<ModelOfMiner<'MinerTaskActivity'>[]> {
    return this.repository.transaction(async (db) => {
      return this.repository.getMonthlyTaskActivity(db, year, deviceId, isRegistered);
    });
  }

  protected async executeGetDailyTaskActivity(
    month: number, 
    deviceId: string, 
    isRegistered: boolean
  ): Promise<ModelOfMiner<'MinerTaskActivity'>[]> {
    return this.repository.transaction(async (db) => {
      return this.repository.getDailyTaskActivity(db, month, deviceId, isRegistered);
    });
  }

  // =============================================================================
  // 实现事务支持
  // =============================================================================

  protected async executeTransaction<T>(handler: (db: any) => Promise<T>): Promise<T> {
    return this.repository.transaction(handler);
  }

  protected async executeLoadStatistics(): Promise<any> {
    return this.repository.transaction(async (db) => {
      // 默认实现，返回基础统计信息
      return {
        totalTasks: 0,
        totalEarnings: 0,
        activeDevices: 0,
        lastUpdated: new Date()
      };
    });
  }

  // =============================================================================
  // 扩展功能方法
  // =============================================================================

  /**
   * 批量创建任务
   */
  async batchCreateTasks(tasks: Array<{ model: string; deviceId: string }>): Promise<ModelOfMiner<'Task'>[]> {
    try {
      this.logger.debug(`Batch creating ${tasks.length} tasks`);

      const createdTasks: ModelOfMiner<'Task'>[] = [];

      for (const taskData of tasks) {
        try {
          const task = await this.createTask(taskData.model, taskData.deviceId);
          createdTasks.push(task);
        } catch (error) {
          this.logger.warn(`Failed to create task for model ${taskData.model}: ${error}`);
        }
      }

      this.logger.log(`Successfully created ${createdTasks.length}/${tasks.length} tasks`);
      return createdTasks;
    } catch (error) {
      this.logger.error(`Batch create tasks failed: ${error}`);
      throw error;
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(deviceId: string, isRegistered: boolean): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byModel: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      const tasks = await this.getTasksByDeviceId(deviceId, isRegistered);

      const statistics = {
        total: tasks.length,
        byStatus: {} as Record<string, number>,
        byModel: {} as Record<string, number>,
        recentActivity: 0
      };

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const task of tasks) {
        // 按状态统计
        statistics.byStatus[task.status] = (statistics.byStatus[task.status] || 0) + 1;

        // 按模型统计
        statistics.byModel[task.model] = (statistics.byModel[task.model] || 0) + 1;

        // 最近24小时活动
        if (new Date(task.created_at) > oneDayAgo) {
          statistics.recentActivity++;
        }
      }

      this.logger.debug(`Task statistics for device ${deviceId}:`, statistics);
      return statistics;
    } catch (error) {
      this.logger.error(`Failed to get task statistics: ${error}`);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(retentionDays: number = 90): Promise<{
    tasksArchived: number;
    earningsArchived: number;
  }> {
    try {
      this.logger.debug(`Cleaning up data older than ${retentionDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // 这里可以实现实际的清理逻辑
      // 目前只是返回模拟数据
      const result = {
        tasksArchived: 0,
        earningsArchived: 0
      };

      this.logger.log(`Cleanup completed: ${result.tasksArchived} tasks, ${result.earningsArchived} earnings archived`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired data: ${error}`);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      database: boolean;
      repository: boolean;
      lastActivity?: Date;
    };
  }> {
    try {
      // 检查数据库连接
      const dbHealthy = await this.repository.transaction(async () => true).catch(() => false);

      // 检查仓库功能
      const repoHealthy = typeof this.repository.transaction === 'function';

      const status = dbHealthy && repoHealthy ? 'healthy' : 'unhealthy';

      return {
        status,
        details: {
          database: dbHealthy,
          repository: repoHealthy,
          lastActivity: new Date()
        }
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
      return {
        status: 'unhealthy',
        details: {
          database: false,
          repository: false
        }
      };
    }
  }
}
