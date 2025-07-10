import { Injectable, Inject, Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { MinerRepository } from '../miner.repository';
import { DeviceStatusService } from '@saito/device-status';

export interface EarningsAggregation {
  totalEarnings: number;
  totalBlockRewards: number;
  totalJobRewards: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  averageEarningsPerDay: number;
  earningsHistory: Array<{
    date: string;
    blockRewards: number;
    jobRewards: number;
    totalEarnings: number;
  }>;
}

export interface EarningsByPeriod {
  period: 'today' | 'week' | 'month' | 'all';
  totalBlockRewards: number;
  totalJobRewards: number;
  totalEarnings: number;
  count: number;
  averagePerTask: number;
  dailyBreakdown: Array<{
    date: string;
    blockRewards: number;
    jobRewards: number;
    totalEarnings: number;
    taskCount: number;
  }>;
}

export interface EarningsTrend {
  period: number; // days
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  dailyAverage: number;
  projectedMonthly: number;
  data: Array<{
    date: string;
    earnings: number;
    blockRewards: number;
    jobRewards: number;
  }>;
}

/**
 * 收益聚合服务
 * 专门处理收益数据的聚合、过滤和统计
 */
@Injectable()
export class EarningsAggregationService {
  private readonly logger = new Logger(EarningsAggregationService.name);

  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
  ) {}

  /**
   * 获取完整的收益聚合数据
   */
  async getEarningsAggregation(): Promise<EarningsAggregation> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        // 获取所有收益记录
        const allEarnings = await this.repository.getEarningsByDeviceId(db, deviceId, isRegistered);

        if (allEarnings.length === 0) {
          return {
            totalEarnings: 0,
            totalBlockRewards: 0,
            totalJobRewards: 0,
            todayEarnings: 0,
            weekEarnings: 0,
            monthEarnings: 0,
            averageEarningsPerDay: 0,
            earningsHistory: [],
          };
        }

        // 计算总收益
        const totalBlockRewards = allEarnings.reduce((sum, e) => sum + (e.block_rewards || 0), 0);
        const totalJobRewards = allEarnings.reduce((sum, e) => sum + (e.job_rewards || 0), 0);
        const totalEarnings = totalBlockRewards + totalJobRewards;

        // 计算时间边界
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);

        // 过滤收益
        const todayEarningsData = allEarnings.filter(e => new Date(e.created_at) >= todayStart);
        const weekEarningsData = allEarnings.filter(e => new Date(e.created_at) >= weekStart);
        const monthEarningsData = allEarnings.filter(e => new Date(e.created_at) >= monthStart);

        const todayEarnings = todayEarningsData.reduce((sum, e) => sum + (e.block_rewards || 0) + (e.job_rewards || 0), 0);
        const weekEarnings = weekEarningsData.reduce((sum, e) => sum + (e.block_rewards || 0) + (e.job_rewards || 0), 0);
        const monthEarnings = monthEarningsData.reduce((sum, e) => sum + (e.block_rewards || 0) + (e.job_rewards || 0), 0);

        // 计算平均每日收益
        const oldestEarning = allEarnings[allEarnings.length - 1];
        const daysSinceFirst = Math.max(1, Math.ceil(
          (now.getTime() - new Date(oldestEarning.created_at).getTime()) / (24 * 60 * 60 * 1000)
        ));
        const averageEarningsPerDay = totalEarnings / daysSinceFirst;

        // 生成收益历史（最近30天）
        const earningsHistory = await this.generateEarningsHistory(allEarnings, 30);

        return {
          totalEarnings: Number(totalEarnings.toFixed(4)),
          totalBlockRewards: Number(totalBlockRewards.toFixed(4)),
          totalJobRewards: Number(totalJobRewards.toFixed(4)),
          todayEarnings: Number(todayEarnings.toFixed(4)),
          weekEarnings: Number(weekEarnings.toFixed(4)),
          monthEarnings: Number(monthEarnings.toFixed(4)),
          averageEarningsPerDay: Number(averageEarningsPerDay.toFixed(4)),
          earningsHistory,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting earnings aggregation: ${error}`);
      throw error;
    }
  }

  /**
   * 根据时间段获取收益数据
   */
  async getEarningsByPeriod(period: 'today' | 'week' | 'month' | 'all'): Promise<EarningsByPeriod> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        const allEarnings = await this.repository.getEarningsByDeviceId(db, deviceId, isRegistered);
        
        let filteredEarnings = allEarnings;
        
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
          
          filteredEarnings = allEarnings.filter(e => new Date(e.created_at) >= startDate);
        }

        const totalBlockRewards = filteredEarnings.reduce((sum, e) => sum + (e.block_rewards || 0), 0);
        const totalJobRewards = filteredEarnings.reduce((sum, e) => sum + (e.job_rewards || 0), 0);
        const totalEarnings = totalBlockRewards + totalJobRewards;
        const averagePerTask = filteredEarnings.length > 0 ? totalEarnings / filteredEarnings.length : 0;

        // 生成每日分解
        const dailyBreakdown = await this.generateDailyBreakdown(filteredEarnings);

        return {
          period,
          totalBlockRewards: Number(totalBlockRewards.toFixed(4)),
          totalJobRewards: Number(totalJobRewards.toFixed(4)),
          totalEarnings: Number(totalEarnings.toFixed(4)),
          count: filteredEarnings.length,
          averagePerTask: Number(averagePerTask.toFixed(4)),
          dailyBreakdown,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting earnings by period: ${error}`);
      throw error;
    }
  }

  /**
   * 获取收益趋势分析
   */
  async getEarningsTrend(days: number = 30): Promise<EarningsTrend> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        const allEarnings = await this.repository.getEarningsByDeviceId(db, deviceId, isRegistered);
        
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const recentEarnings = allEarnings.filter(e => new Date(e.created_at) >= startDate);
        
        // 生成每日数据
        const data = await this.generateDailyEarningsData(recentEarnings, days);
        
        // 计算趋势
        const { trend, changePercentage } = this.calculateTrend(data);
        
        // 计算平均值和预测
        const totalEarnings = data.reduce((sum, d) => sum + d.earnings, 0);
        const dailyAverage = totalEarnings / days;
        const projectedMonthly = dailyAverage * 30;

        return {
          period: days,
          trend,
          changePercentage,
          dailyAverage: Number(dailyAverage.toFixed(4)),
          projectedMonthly: Number(projectedMonthly.toFixed(4)),
          data,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting earnings trend: ${error}`);
      throw error;
    }
  }

  /**
   * 获取今日收益详情
   */
  async getTodayEarnings(): Promise<{
    totalBlockRewards: number;
    totalJobRewards: number;
    totalEarnings: number;
    taskCount: number;
    averagePerTask: number;
    hourlyBreakdown: Array<{
      hour: number;
      earnings: number;
      taskCount: number;
    }>;
  }> {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      return this.repository.transaction(async (db) => {
        const allEarnings = await this.repository.getEarningsByDeviceId(db, deviceId, isRegistered);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayEarnings = allEarnings.filter(e => new Date(e.created_at) >= today);
        
        const totalBlockRewards = todayEarnings.reduce((sum, e) => sum + (e.block_rewards || 0), 0);
        const totalJobRewards = todayEarnings.reduce((sum, e) => sum + (e.job_rewards || 0), 0);
        const totalEarnings = totalBlockRewards + totalJobRewards;
        const taskCount = todayEarnings.length;
        const averagePerTask = taskCount > 0 ? totalEarnings / taskCount : 0;

        // 生成小时分解
        const hourlyBreakdown = this.generateHourlyBreakdown(todayEarnings);

        return {
          totalBlockRewards: Number(totalBlockRewards.toFixed(4)),
          totalJobRewards: Number(totalJobRewards.toFixed(4)),
          totalEarnings: Number(totalEarnings.toFixed(4)),
          taskCount,
          averagePerTask: Number(averagePerTask.toFixed(4)),
          hourlyBreakdown,
        };
      });
    } catch (error) {
      this.logger.error(`Error getting today's earnings: ${error}`);
      throw error;
    }
  }

  // 私有辅助方法

  private async generateEarningsHistory(
    earnings: ModelOfMiner<'Earning'>[],
    days: number
  ): Promise<Array<{ date: string; blockRewards: number; jobRewards: number; totalEarnings: number }>> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const dailyData: Record<string, { blockRewards: number; jobRewards: number; totalEarnings: number }> = {};
    
    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { blockRewards: 0, jobRewards: 0, totalEarnings: 0 };
    }
    
    // 填充实际数据
    earnings.forEach(earning => {
      const date = new Date(earning.created_at).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].blockRewards += earning.block_rewards || 0;
        dailyData[date].jobRewards += earning.job_rewards || 0;
        dailyData[date].totalEarnings += (earning.block_rewards || 0) + (earning.job_rewards || 0);
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        blockRewards: Number(data.blockRewards.toFixed(4)),
        jobRewards: Number(data.jobRewards.toFixed(4)),
        totalEarnings: Number(data.totalEarnings.toFixed(4)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async generateDailyBreakdown(
    earnings: ModelOfMiner<'Earning'>[]
  ): Promise<Array<{ date: string; blockRewards: number; jobRewards: number; totalEarnings: number; taskCount: number }>> {
    const dailyData: Record<string, { blockRewards: number; jobRewards: number; totalEarnings: number; taskCount: number }> = {};
    
    earnings.forEach(earning => {
      const date = new Date(earning.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { blockRewards: 0, jobRewards: 0, totalEarnings: 0, taskCount: 0 };
      }
      
      dailyData[date].blockRewards += earning.block_rewards || 0;
      dailyData[date].jobRewards += earning.job_rewards || 0;
      dailyData[date].totalEarnings += (earning.block_rewards || 0) + (earning.job_rewards || 0);
      dailyData[date].taskCount++;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        blockRewards: Number(data.blockRewards.toFixed(4)),
        jobRewards: Number(data.jobRewards.toFixed(4)),
        totalEarnings: Number(data.totalEarnings.toFixed(4)),
        taskCount: data.taskCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async generateDailyEarningsData(
    earnings: ModelOfMiner<'Earning'>[],
    days: number
  ): Promise<Array<{ date: string; earnings: number; blockRewards: number; jobRewards: number }>> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const dailyData: Record<string, { earnings: number; blockRewards: number; jobRewards: number }> = {};
    
    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { earnings: 0, blockRewards: 0, jobRewards: 0 };
    }
    
    // 填充实际数据
    earnings.forEach(earning => {
      const date = new Date(earning.created_at).toISOString().split('T')[0];
      if (dailyData[date]) {
        const blockRewards = earning.block_rewards || 0;
        const jobRewards = earning.job_rewards || 0;
        dailyData[date].blockRewards += blockRewards;
        dailyData[date].jobRewards += jobRewards;
        dailyData[date].earnings += blockRewards + jobRewards;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        earnings: Number(data.earnings.toFixed(4)),
        blockRewards: Number(data.blockRewards.toFixed(4)),
        jobRewards: Number(data.jobRewards.toFixed(4)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateTrend(data: Array<{ earnings: number }>): { trend: 'up' | 'down' | 'stable'; changePercentage: number } {
    if (data.length < 2) {
      return { trend: 'stable', changePercentage: 0 };
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.earnings, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.earnings, 0) / secondHalf.length;

    const changePercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'up' : 'down';
    }

    return { trend, changePercentage: Number(changePercentage.toFixed(2)) };
  }

  private generateHourlyBreakdown(earnings: ModelOfMiner<'Earning'>[]): Array<{ hour: number; earnings: number; taskCount: number }> {
    const hourlyData: Record<number, { earnings: number; taskCount: number }> = {};
    
    // 初始化24小时
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { earnings: 0, taskCount: 0 };
    }
    
    earnings.forEach(earning => {
      const hour = new Date(earning.created_at).getHours();
      const earningAmount = (earning.block_rewards || 0) + (earning.job_rewards || 0);
      
      hourlyData[hour].earnings += earningAmount;
      hourlyData[hour].taskCount++;
    });

    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        earnings: Number(data.earnings.toFixed(4)),
        taskCount: data.taskCount,
      }))
      .sort((a, b) => a.hour - b.hour);
  }
}
