import { Injectable, Inject, Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { MinerRepository } from '../miner.repository';
import { DeviceStatusService } from '@saito/device-status';

export interface TaskCountAggregation {
  totalTasks: number;
  todayTasks: number;
  weekTasks: number;
  monthTasks: number;
  statusBreakdown: {
    completed: number;
    failed: number;
    running: number;
    pending: number;
    cancelled: number;
  };
  sourceBreakdown: {
    local: number;
    gateway: number;
  };
  modelBreakdown: Record<string, number>;
}

export interface TaskCountByPeriod {
  period: 'today' | 'week' | 'month' | 'all';
  count: number;
  breakdown: {
    completed: number;
    failed: number;
    running: number;
    pending: number;
    cancelled: number;
  };
  models: Record<string, number>;
}

export interface TaskActivitySummary {
  totalTasks: number;
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  averageTasksPerDay: number;
  peakDay: {
    date: string;
    count: number;
  };
  statusDistribution: Record<string, number>;
}

/**
 * 任务计数聚合服务
 * 专门处理任务数据的聚合和统计
 */
@Injectable()
export class TaskAggregationService {
  private readonly logger = new Logger(TaskAggregationService.name);

  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
  ) {}

  /**
   * 获取完整的任务计数聚合数据
   */
  async getTaskCountAggregation(): Promise<TaskCountAggregation> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        // 获取所有任务
        const allTasks = await this.repository.getTasksByDeviceId(db, deviceId, isRegistered);

        // 计算时间边界
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);

        // 过滤任务
        const todayTasks = allTasks.filter(task => new Date(task.created_at) >= todayStart);
        const weekTasks = allTasks.filter(task => new Date(task.created_at) >= weekStart);
        const monthTasks = allTasks.filter(task => new Date(task.created_at) >= monthStart);

        // 状态统计
        const statusBreakdown = {
          completed: allTasks.filter(t => t.status === 'completed').length,
          failed: allTasks.filter(t => t.status === 'failed').length,
          running: allTasks.filter(t => t.status === 'running').length,
          pending: allTasks.filter(t => t.status === 'pending').length,
          cancelled: allTasks.filter(t => t.status === 'cancelled').length,
        };

        // 来源统计
        const sourceBreakdown = {
          local: allTasks.filter(t => t.source === 'local').length,
          gateway: allTasks.filter(t => t.source === 'gateway').length,
        };

        // 模型统计
        const modelBreakdown: Record<string, number> = {};
        allTasks.forEach(task => {
          modelBreakdown[task.model] = (modelBreakdown[task.model] || 0) + 1;
        });

        return {
          totalTasks: allTasks.length,
          todayTasks: todayTasks.length,
          weekTasks: weekTasks.length,
          monthTasks: monthTasks.length,
          statusBreakdown,
          sourceBreakdown,
          modelBreakdown,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting task count aggregation: ${error}`);
      throw error;
    }
  }

  /**
   * 根据时间段获取任务计数
   */
  async getTaskCountByPeriod(period: 'today' | 'week' | 'month' | 'all'): Promise<TaskCountByPeriod> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        const allTasks = await this.repository.getTasksByDeviceId(db, deviceId, isRegistered);
        
        let filteredTasks = allTasks;
        
        if (period !== 'all') {
          const now = new Date();
          let startDate: Date;
          
          switch (period) {
            case 'today':
              startDate = new Date(now);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              startDate = new Date(now);
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 1);
              break;
            default:
              startDate = new Date(0);
          }
          
          filteredTasks = allTasks.filter(task => new Date(task.created_at) >= startDate);
        }

        // 状态统计
        const breakdown = {
          completed: filteredTasks.filter(t => t.status === 'completed').length,
          failed: filteredTasks.filter(t => t.status === 'failed').length,
          running: filteredTasks.filter(t => t.status === 'running').length,
          pending: filteredTasks.filter(t => t.status === 'pending').length,
          cancelled: filteredTasks.filter(t => t.status === 'cancelled').length,
        };

        // 模型统计
        const models: Record<string, number> = {};
        filteredTasks.forEach(task => {
          models[task.model] = (models[task.model] || 0) + 1;
        });

        return {
          period,
          count: filteredTasks.length,
          breakdown,
          models,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting task count by period: ${error}`);
      throw error;
    }
  }

  /**
   * 获取任务活动摘要
   */
  async getTaskActivitySummary(): Promise<TaskActivitySummary> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        const allTasks = await this.repository.getTasksByDeviceId(db, deviceId, isRegistered);
        
        if (allTasks.length === 0) {
          return {
            totalTasks: 0,
            recentActivity: { last24Hours: 0, last7Days: 0, last30Days: 0 },
            averageTasksPerDay: 0,
            peakDay: { date: '', count: 0 },
            statusDistribution: {},
          };
        }

        const now = new Date();
        
        // 计算最近活动
        const last24Hours = allTasks.filter(task => 
          new Date(task.created_at) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
        ).length;
        
        const last7Days = allTasks.filter(task => 
          new Date(task.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        ).length;
        
        const last30Days = allTasks.filter(task => 
          new Date(task.created_at) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        ).length;

        // 计算平均每日任务数
        const oldestTask = allTasks[allTasks.length - 1];
        const daysSinceFirst = Math.max(1, Math.ceil(
          (now.getTime() - new Date(oldestTask.created_at).getTime()) / (24 * 60 * 60 * 1000)
        ));
        const averageTasksPerDay = Math.round((allTasks.length / daysSinceFirst) * 100) / 100;

        // 找到峰值日期
        const dailyCounts: Record<string, number> = {};
        allTasks.forEach(task => {
          const date = new Date(task.created_at).toISOString().split('T')[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

        const peakDay = Object.entries(dailyCounts).reduce(
          (peak, [date, count]) => count > peak.count ? { date, count } : peak,
          { date: '', count: 0 }
        );

        // 状态分布
        const statusDistribution: Record<string, number> = {};
        allTasks.forEach(task => {
          statusDistribution[task.status] = (statusDistribution[task.status] || 0) + 1;
        });

        return {
          totalTasks: allTasks.length,
          recentActivity: { last24Hours, last7Days, last30Days },
          averageTasksPerDay,
          peakDay,
          statusDistribution,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting task activity summary: ${error}`);
      throw error;
    }
  }

  /**
   * 获取任务趋势数据（按日期分组）
   */
  async getTaskTrends(days: number = 30): Promise<Array<{ date: string; count: number; completed: number; failed: number }>> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        const allTasks = await this.repository.getTasksByDeviceId(db, deviceId, isRegistered);
        
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const recentTasks = allTasks.filter(task => new Date(task.created_at) >= startDate);
        
        const dailyData: Record<string, { count: number; completed: number; failed: number }> = {};
        
        // 初始化所有日期
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          dailyData[dateStr] = { count: 0, completed: 0, failed: 0 };
        }
        
        // 填充实际数据
        recentTasks.forEach(task => {
          const date = new Date(task.created_at).toISOString().split('T')[0];
          if (dailyData[date]) {
            dailyData[date].count++;
            if (task.status === 'completed') dailyData[date].completed++;
            if (task.status === 'failed') dailyData[date].failed++;
          }
        });

        return Object.entries(dailyData)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (error) {
      this.logger.error(`Error getting task trends: ${error}`);
      throw error;
    }
  }
}
