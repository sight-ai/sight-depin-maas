import { Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { 
  IStatisticsAnalyzer, 
  IDataAccessLayer, 
  MinerConfig, 
  TimeRangeOptions,
  MinerError 
} from './miner-core.interface';

/**
 * 统计分析器抽象基类
 * 提供通用的统计分析功能实现
 */
export abstract class BaseStatisticsAnalyzer implements IStatisticsAnalyzer {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly dataAccess: IDataAccessLayer,
    protected readonly config: MinerConfig
  ) {}

  /**
   * 获取汇总统计信息
   */
  async getSummary(timeRange?: TimeRangeOptions): Promise<ModelOfMiner<'Summary'>> {
    try {
      this.logger.debug('Getting summary statistics', timeRange);

      const deviceId = await this.getCurrentDeviceId();
      const isRegistered = await this.isDeviceRegistered();

      const summary = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          // 解析时间范围参数
          const requestTimeRange = timeRange?.request_serials || 'daily';
          const filteredTaskActivity = timeRange?.filteredTaskActivity || {};
          
          const year = parseInt(filteredTaskActivity.year || new Date().getFullYear().toString());
          const month = this.getMonthIndex(filteredTaskActivity);
          const view = filteredTaskActivity.view || 'Month';

          // 并行获取所有统计数据
          const [
            earningData,
            deviceData,
            uptimeData,
            earningsHistory,
            dailyRequests,
            taskActivity
          ] = await Promise.all([
            this.dataAccess.getEarningInfo(deviceId, isRegistered).catch(() => null),
            this.dataAccess.getDeviceInfo(deviceId, isRegistered).catch(() => null),
            this.dataAccess.getUptimePercentage(deviceId, isRegistered).catch(() => null),
            this.dataAccess.getEarningsHistory(deviceId, 30, isRegistered).catch(() => []),
            this.dataAccess.getTaskRequestData(deviceId, requestTimeRange, isRegistered).catch(() => []),
            view === 'Year'
              ? this.dataAccess.getMonthlyTaskActivity(year, deviceId, isRegistered).catch(() => [])
              : this.dataAccess.getDailyTaskActivity(month, deviceId, isRegistered).catch(() => [])
          ]);

          // 处理和格式化数据
          const earningSerials = this.extractEarningSerials(earningsHistory);
          const requestSerials = this.extractRequestSerials(dailyRequests);
          const taskActivityData = this.extractTaskActivityData(taskActivity);

          return {
            earning_info: earningData || { total_block_rewards: 0, total_job_rewards: 0 },
            device_info: {
              name: deviceData?.name || 'Unknown Device',
              status: (deviceData?.status || 'disconnected') as 'connected' | 'disconnected'
            },
            statistics: {
              up_time_percentage: uptimeData?.uptime_percentage || 0,
              earning_serials: earningSerials,
              request_serials: requestSerials,
              task_activity: taskActivityData
            }
          };
        }),
        'get summary'
      );

      this.logger.debug('Summary statistics retrieved successfully');
      return summary;
    } catch (error) {
      this.logger.error(`Failed to get summary: ${error}`);
      throw new MinerError('Failed to get summary', 'SUMMARY_ERROR', { timeRange, error });
    }
  }

  /**
   * 获取设备运行时间百分比
   */
  async getUptimePercentage(deviceId: string): Promise<number> {
    try {
      this.logger.debug(`Getting uptime percentage for device: ${deviceId}`);

      const isRegistered = await this.isDeviceRegistered();
      const uptimeData = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return this.dataAccess.getUptimePercentage(deviceId, isRegistered);
        }),
        `get uptime percentage for ${deviceId}`
      );

      return uptimeData.uptime_percentage;
    } catch (error) {
      this.logger.error(`Failed to get uptime percentage: ${error}`);
      throw new MinerError('Failed to get uptime percentage', 'UPTIME_ERROR', { deviceId, error });
    }
  }

  /**
   * 获取任务请求数据
   */
  async getTaskRequestData(
    deviceId: string, 
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<ModelOfMiner<'MinerDailyRequests'>[]> {
    try {
      this.logger.debug(`Getting task request data for device: ${deviceId}, period: ${period}`);

      const isRegistered = await this.isDeviceRegistered();
      const requestData = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return this.dataAccess.getTaskRequestData(deviceId, period, isRegistered);
        }),
        `get task request data for ${deviceId}`
      );

      this.logger.debug(`Found ${requestData.length} request data points for device ${deviceId}`);
      return requestData;
    } catch (error) {
      this.logger.error(`Failed to get task request data: ${error}`);
      throw new MinerError('Failed to get task request data', 'REQUEST_DATA_ERROR', { deviceId, period, error });
    }
  }

  /**
   * 获取任务活动数据
   */
  async getTaskActivity(
    deviceId: string, 
    timeRange: { year?: number; month?: number; view?: 'Month' | 'Year' }
  ): Promise<ModelOfMiner<'MinerTaskActivity'>[]> {
    try {
      this.logger.debug(`Getting task activity for device: ${deviceId}`, timeRange);

      const isRegistered = await this.isDeviceRegistered();
      const year = timeRange.year || new Date().getFullYear();
      const month = timeRange.month || (new Date().getMonth() + 1);
      const view = timeRange.view || 'Month';

      const activityData = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return view === 'Year'
            ? this.dataAccess.getMonthlyTaskActivity(year, deviceId, isRegistered)
            : this.dataAccess.getDailyTaskActivity(month, deviceId, isRegistered);
        }),
        `get task activity for ${deviceId}`
      );

      this.logger.debug(`Found ${activityData.length} activity data points for device ${deviceId}`);
      return activityData;
    } catch (error) {
      this.logger.error(`Failed to get task activity: ${error}`);
      throw new MinerError('Failed to get task activity', 'TASK_ACTIVITY_ERROR', { deviceId, timeRange, error });
    }
  }

  // =============================================================================
  // 受保护的辅助方法
  // =============================================================================

  /**
   * 提取收益序列数据
   */
  protected extractEarningSerials(earningsHistory: ModelOfMiner<'MinerEarningsHistory'>[]): number[] {
    return earningsHistory.map(item => this.formatNumber(item.daily_earning || 0));
  }

  /**
   * 提取请求序列数据
   */
  protected extractRequestSerials(dailyRequests: ModelOfMiner<'MinerDailyRequests'>[]): number[] {
    return dailyRequests.map(item => this.formatNumber(item.request_count || 0));
  }

  /**
   * 提取任务活动数据
   */
  protected extractTaskActivityData(taskActivity: ModelOfMiner<'MinerTaskActivity'>[]): number[] {
    return taskActivity.map(item => this.formatNumber(item.task_count || 0));
  }

  /**
   * 格式化数字
   */
  protected formatNumber(value: any): number {
    const num = Number(value) || 0;
    return Math.round(num * 100) / 100;
  }

  /**
   * 获取月份索引
   */
  protected getMonthIndex(filteredTaskActivity: any): number {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (!filteredTaskActivity.month) {
      return new Date().getMonth() + 1;
    }

    if (typeof filteredTaskActivity.month === 'string') {
      const index = MONTHS.indexOf(filteredTaskActivity.month);
      return index >= 0 ? index + 1 : new Date().getMonth() + 1;
    }

    return parseInt(filteredTaskActivity.month) || (new Date().getMonth() + 1);
  }

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
   * 睡眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 计算统计趋势
   */
  protected calculateTrend(data: number[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-3); // 最近3个数据点
    const earlier = data.slice(-6, -3); // 之前3个数据点
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((a, b) => a + b, 0) / earlier.length : recentAvg;
    
    const threshold = 0.05; // 5% 阈值
    const change = (recentAvg - earlierAvg) / (earlierAvg || 1);
    
    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'stable';
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  /**
   * 获取当前设备ID
   */
  protected abstract getCurrentDeviceId(): Promise<string>;

  /**
   * 检查设备是否已注册
   */
  protected abstract isDeviceRegistered(): Promise<boolean>;
}
