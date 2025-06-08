import { Injectable, Inject } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { BaseEarningsManager } from '../abstracts/base-earnings-manager';
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
 * 收益管理器服务实现
 * 继承抽象基类，实现具体的收益管理逻辑
 */
@Injectable()
export class EarningsManagerService extends BaseEarningsManager {
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
      staleTaskThreshold: 5 * 60 * 1000,
      defaultPageSize: 20,
      enableAutoCleanup: true
    });
  }

  // =============================================================================
  // 实现抽象方法
  // =============================================================================

  /**
   * 检查设备是否已注册
   */
  protected async isDeviceRegistered(): Promise<boolean> {
    try {
      const registrationStatus = process.env['DEVICE_REGISTERED'];
      
      if (registrationStatus !== undefined) {
        return registrationStatus.toLowerCase() === 'true';
      }

      return true;
    } catch (error) {
      this.logger.warn(`Failed to check device registration status: ${error}`);
      return true;
    }
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
   * 发送收益通知
   */
  protected override async notifyEarningsCreated(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): Promise<void> {
    try {
      this.logger.log(`Earnings notification: Device ${deviceId} earned ${blockRewards + jobRewards} tokens for task ${taskId}`);
      
      // 这里可以实现实际的通知逻辑，比如：
      // - 发送 WebSocket 消息
      // - 发送邮件通知
      // - 调用外部 API
      // - 记录到审计日志
      
      // 示例：记录到系统日志
      const totalEarnings = blockRewards + jobRewards;
      if (totalEarnings > 0) {
        this.logger.log(`🎉 New earnings: ${totalEarnings} tokens (Block: ${blockRewards}, Job: ${jobRewards})`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send earnings notification: ${error}`);
      // 不抛出错误，因为通知失败不应该影响收益创建
    }
  }

  /**
   * 收益数据后处理
   */
  protected override async postProcessEarnings(
    earnings: ModelOfMiner<'Earning'>[]
  ): Promise<ModelOfMiner<'Earning'>[]> {
    try {
      // 对收益数据进行后处理，比如：
      // - 格式化金额
      // - 添加计算字段
      // - 排序
      // - 过滤

      const processedEarnings = earnings.map(earning => ({
        ...earning,
        // 格式化金额到两位小数
        block_rewards: this.formatEarningsAmount(earning.block_rewards),
        job_rewards: this.formatEarningsAmount(earning.job_rewards),
        // 添加总收益字段
        total_rewards: this.formatEarningsAmount(earning.block_rewards + earning.job_rewards)
      }));

      // 按创建时间降序排序
      processedEarnings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return processedEarnings;
    } catch (error) {
      this.logger.warn(`Failed to post-process earnings: ${error}`);
      return earnings; // 返回原始数据
    }
  }

  // =============================================================================
  // 扩展功能方法
  // =============================================================================

  /**
   * 获取收益统计信息
   */
  async getEarningsStatistics(deviceId?: string): Promise<{
    totalEarnings: number;
    totalBlockRewards: number;
    totalJobRewards: number;
    averageEarningsPerTask: number;
    earningsToday: number;
    earningsThisWeek: number;
    earningsThisMonth: number;
  }> {
    try {
      const targetDeviceId = deviceId || await this.getCurrentDeviceId();
      const earnings = await this.getDeviceEarnings(targetDeviceId);

      if (earnings.length === 0) {
        return {
          totalEarnings: 0,
          totalBlockRewards: 0,
          totalJobRewards: 0,
          averageEarningsPerTask: 0,
          earningsToday: 0,
          earningsThisWeek: 0,
          earningsThisMonth: 0
        };
      }

      const totalBlockRewards = earnings.reduce((sum, e) => sum + e.block_rewards, 0);
      const totalJobRewards = earnings.reduce((sum, e) => sum + e.job_rewards, 0);
      const totalEarnings = totalBlockRewards + totalJobRewards;
      const averageEarningsPerTask = totalEarnings / earnings.length;

      // 计算时间段收益
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const earningsToday = earnings
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + e.block_rewards + e.job_rewards, 0);

      const earningsThisWeek = earnings
        .filter(e => new Date(e.created_at) >= thisWeek)
        .reduce((sum, e) => sum + e.block_rewards + e.job_rewards, 0);

      const earningsThisMonth = earnings
        .filter(e => new Date(e.created_at) >= thisMonth)
        .reduce((sum, e) => sum + e.block_rewards + e.job_rewards, 0);

      const statistics = {
        totalEarnings: this.formatEarningsAmount(totalEarnings),
        totalBlockRewards: this.formatEarningsAmount(totalBlockRewards),
        totalJobRewards: this.formatEarningsAmount(totalJobRewards),
        averageEarningsPerTask: this.formatEarningsAmount(averageEarningsPerTask),
        earningsToday: this.formatEarningsAmount(earningsToday),
        earningsThisWeek: this.formatEarningsAmount(earningsThisWeek),
        earningsThisMonth: this.formatEarningsAmount(earningsThisMonth)
      };

      this.logger.debug(`Earnings statistics for device ${targetDeviceId}:`, statistics);
      return statistics;
    } catch (error) {
      this.logger.error(`Failed to get earnings statistics: ${error}`);
      throw error;
    }
  }

  /**
   * 获取收益趋势分析
   */
  async getEarningsTrend(deviceId?: string, days: number = 30): Promise<{
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
    dailyAverage: number;
    projectedMonthly: number;
  }> {
    try {
      const targetDeviceId = deviceId || await this.getCurrentDeviceId();
      const history = await this.getEarningsHistory(targetDeviceId, days);

      if (history.length < 2) {
        return {
          trend: 'stable',
          changePercentage: 0,
          dailyAverage: 0,
          projectedMonthly: 0
        };
      }

      // 计算趋势
      const recentEarnings = history.slice(0, Math.floor(history.length / 2));
      const earlierEarnings = history.slice(Math.floor(history.length / 2));

      const recentAvg = recentEarnings.reduce((sum, h) => sum + (h.daily_earning || 0), 0) / recentEarnings.length;
      const earlierAvg = earlierEarnings.reduce((sum, h) => sum + (h.daily_earning || 0), 0) / earlierEarnings.length;

      const changePercentage = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (changePercentage > 5) trend = 'up';
      else if (changePercentage < -5) trend = 'down';

      // 计算日均收益和月度预测
      const totalEarnings = history.reduce((sum, h) => sum + (h.daily_earning || 0), 0);
      const dailyAverage = totalEarnings / history.length;
      const projectedMonthly = dailyAverage * 30;

      const trendAnalysis = {
        trend,
        changePercentage: this.formatEarningsAmount(changePercentage),
        dailyAverage: this.formatEarningsAmount(dailyAverage),
        projectedMonthly: this.formatEarningsAmount(projectedMonthly)
      };

      this.logger.debug(`Earnings trend for device ${targetDeviceId}:`, trendAnalysis);
      return trendAnalysis;
    } catch (error) {
      this.logger.error(`Failed to get earnings trend: ${error}`);
      throw error;
    }
  }

  /**
   * 导出收益报告
   */
  async exportEarningsReport(
    deviceId?: string,
    format: 'json' | 'csv' = 'json',
    dateRange?: { from: Date; to: Date }
  ): Promise<string> {
    try {
      const targetDeviceId = deviceId || await this.getCurrentDeviceId();
      let earnings = await this.getDeviceEarnings(targetDeviceId);

      // 应用日期过滤
      if (dateRange) {
        earnings = earnings.filter(e => {
          const earningDate = new Date(e.created_at);
          return earningDate >= dateRange.from && earningDate <= dateRange.to;
        });
      }

      if (format === 'csv') {
        return this.generateCSVReport(earnings);
      } else {
        return JSON.stringify({
          deviceId: targetDeviceId,
          reportDate: new Date().toISOString(),
          dateRange,
          totalRecords: earnings.length,
          earnings: earnings
        }, null, 2);
      }
    } catch (error) {
      this.logger.error(`Failed to export earnings report: ${error}`);
      throw error;
    }
  }

  /**
   * 生成CSV报告
   */
  private generateCSVReport(earnings: ModelOfMiner<'Earning'>[]): string {
    const headers = ['Date', 'Task ID', 'Block Rewards', 'Job Rewards', 'Total Rewards'];
    const rows = earnings.map(e => [
      new Date(e.created_at).toISOString().split('T')[0],
      e.task_id,
      e.block_rewards.toString(),
      e.job_rewards.toString(),
      (e.block_rewards + e.job_rewards).toString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
