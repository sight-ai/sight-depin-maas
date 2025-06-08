import { Injectable, Inject } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { BaseTaskManager } from '../abstracts/base-task-manager';
import {
  IDataAccessLayer,
  MinerConfig,
  DATA_ACCESS_LAYER
} from '../abstracts/miner-core.interface';
import {
  TDeviceConfig,
  DEVICE_CONFIG_SERVICE
} from '@saito/device-status';

/**
 * 任务管理器服务实现
 * 继承抽象基类，实现具体的任务管理逻辑
 */
@Injectable()
export class TaskManagerService extends BaseTaskManager {
  constructor(
    @Inject(DATA_ACCESS_LAYER)
    dataAccess: IDataAccessLayer,
    @Inject('MINER_CONFIG') config: MinerConfig,
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly deviceConfigService: TDeviceConfig
  ) {
    super(dataAccess, config || {
      maxRetries: 3,
      retryDelay: 1000,
      staleTaskThreshold: 5 * 60 * 1000, // 5分钟
      defaultPageSize: 20,
      enableAutoCleanup: true
    });
  }

  // =============================================================================
  // 实现抽象方法
  // =============================================================================

  /**
   * 获取设备ID
   */
  protected async getDeviceId(args: ModelOfMiner<'CreateTaskRequest'>): Promise<string> {
    // 从请求参数中获取设备ID，如果没有则使用当前设备ID
    if (args.device_id) {
      return args.device_id;
    }
    
    return this.getCurrentDeviceId();
  }

  /**
   * 获取当前设备ID
   */
  protected async getCurrentDeviceId(): Promise<string> {
    try {
      // 优先从设备配置服务获取设备ID
      const config = this.deviceConfigService.getCurrentConfig();
      if (config.deviceId) {
        return config.deviceId;
      }
    } catch (error) {
      this.logger.warn('Failed to get device ID from config service:', error);
    }

    // 回退到环境变量
    const deviceId = process.env['DEVICE_ID'] || process.env['MINER_DEVICE_ID'];

    if (deviceId) {
      return deviceId;
    }

    // 如果都没有，生成一个默认的设备ID
    const defaultDeviceId = `device_${Date.now()}`;
    this.logger.warn(`No device ID configured, using generated ID: ${defaultDeviceId}`);
    return defaultDeviceId;
  }

  /**
   * 检查设备是否已注册
   */
  protected async isDeviceRegistered(): Promise<boolean> {
    try {
      // 检查设备注册状态的逻辑
      const registrationStatus = process.env['DEVICE_REGISTERED'];
      
      if (registrationStatus !== undefined) {
        return registrationStatus.toLowerCase() === 'true';
      }

      // 默认假设设备已注册
      return true;
    } catch (error) {
      this.logger.warn(`Failed to check device registration status: ${error}`);
      return true; // 默认返回已注册状态
    }
  }

  // =============================================================================
  // 扩展功能方法
  // =============================================================================

  /**
   * 批量更新任务状态
   */
  async batchUpdateTaskStatus(
    taskIds: string[],
    status: 'completed' | 'failed' | 'pending' | 'running' | 'cancelled'
  ): Promise<ModelOfMiner<'Task'>[]> {
    try {
      this.logger.debug(`Batch updating ${taskIds.length} tasks to status: ${status}`);

      const updatedTasks: ModelOfMiner<'Task'>[] = [];

      for (const taskId of taskIds) {
        try {
          const updatedTask = await this.updateTask(taskId, { status });
          updatedTasks.push(updatedTask);
        } catch (error) {
          this.logger.warn(`Failed to update task ${taskId}: ${error}`);
        }
      }

      this.logger.log(`Successfully updated ${updatedTasks.length}/${taskIds.length} tasks`);
      return updatedTasks;
    } catch (error) {
      this.logger.error(`Batch update failed: ${error}`);
      throw error;
    }
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(deviceId?: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  }> {
    try {
      const targetDeviceId = deviceId || await this.getCurrentDeviceId();
      const tasks = await this.getDeviceTasks(targetDeviceId);

      const statistics = {
        total: tasks.length,
        completed: 0,
        failed: 0,
        running: 0,
        pending: 0
      };

      for (const task of tasks) {
        switch (task.status) {
          case 'completed':
            statistics.completed++;
            break;
          case 'failed':
            statistics.failed++;
            break;
          case 'running':
            statistics.running++;
            break;
          case 'pending':
            statistics.pending++;
            break;
        }
      }

      this.logger.debug(`Task statistics for device ${targetDeviceId}:`, statistics);
      return statistics;
    } catch (error) {
      this.logger.error(`Failed to get task statistics: ${error}`);
      throw error;
    }
  }

  /**
   * 清理过期任务
   */
  async cleanupExpiredTasks(olderThanDays: number = 30): Promise<number> {
    try {
      this.logger.debug(`Cleaning up tasks older than ${olderThanDays} days`);

      const deviceId = await this.getCurrentDeviceId();
      const tasks = await this.getDeviceTasks(deviceId);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const expiredTasks = tasks.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate < cutoffDate && (task.status === 'completed' || task.status === 'failed');
      });

      if (expiredTasks.length === 0) {
        this.logger.debug('No expired tasks found for cleanup');
        return 0;
      }

      // 这里可以实现实际的删除逻辑
      // 目前只是标记为已清理（使用 cancelled 状态）
      const cleanedTasks = await this.batchUpdateTaskStatus(
        expiredTasks.map(t => t.id),
        'cancelled'
      );

      this.logger.log(`Cleaned up ${cleanedTasks.length} expired tasks`);
      return cleanedTasks.length;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired tasks: ${error}`);
      throw error;
    }
  }

  /**
   * 获取任务性能指标
   */
  async getTaskPerformanceMetrics(deviceId?: string): Promise<{
    averageCompletionTime: number;
    successRate: number;
    tasksPerHour: number;
    lastTaskTime?: Date;
  }> {
    try {
      const targetDeviceId = deviceId || await this.getCurrentDeviceId();
      const tasks = await this.getDeviceTasks(targetDeviceId);

      if (tasks.length === 0) {
        return {
          averageCompletionTime: 0,
          successRate: 0,
          tasksPerHour: 0
        };
      }

      const completedTasks = tasks.filter(t => t.status === 'completed');
      const totalTasks = tasks.length;
      const successRate = (completedTasks.length / totalTasks) * 100;

      // 计算平均完成时间（使用 updated_at 作为完成时间）
      let averageCompletionTime = 0;
      if (completedTasks.length > 0) {
        const totalCompletionTime = completedTasks.reduce((sum, task) => {
          if (task.status === 'completed') {
            const startTime = new Date(task.created_at).getTime();
            const endTime = new Date(task.updated_at).getTime();
            return sum + (endTime - startTime);
          }
          return sum;
        }, 0);
        averageCompletionTime = totalCompletionTime / completedTasks.length;
      }

      // 计算每小时任务数
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentTasks = tasks.filter(t => new Date(t.created_at) > oneDayAgo);
      const tasksPerHour = recentTasks.length / 24;

      // 最后一个任务时间
      const lastTaskTime = tasks.length > 0 
        ? new Date(Math.max(...tasks.map(t => new Date(t.created_at).getTime())))
        : undefined;

      const metrics = {
        averageCompletionTime: Math.round(averageCompletionTime),
        successRate: Math.round(successRate * 100) / 100,
        tasksPerHour: Math.round(tasksPerHour * 100) / 100,
        lastTaskTime
      };

      this.logger.debug(`Task performance metrics for device ${targetDeviceId}:`, metrics);
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get task performance metrics: ${error}`);
      throw error;
    }
  }
}
