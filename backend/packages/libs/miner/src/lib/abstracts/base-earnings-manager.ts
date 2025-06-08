import { Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { 
  IEarningsManager, 
  IDataAccessLayer, 
  MinerConfig, 
  EarningsCreationError,
  MinerError 
} from './miner-core.interface';

/**
 * 收益管理器抽象基类
 * 提供通用的收益管理功能实现
 */
export abstract class BaseEarningsManager implements IEarningsManager {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly dataAccess: IDataAccessLayer,
    protected readonly config: MinerConfig
  ) {}

  /**
   * 创建收益记录
   */
  async createEarnings(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }> {
    try {
      this.logger.debug(`Creating earnings: block=${blockRewards}, job=${jobRewards}, task=${taskId}, device=${deviceId}`);

      // 验证输入参数
      this.validateEarningsInput(blockRewards, jobRewards, taskId, deviceId);

      const result = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          // 创建收益记录
          await this.dataAccess.createEarning(blockRewards, jobRewards, deviceId, taskId);

          // 获取设备总收益
          const isRegistered = await this.isDeviceRegistered();
          const earningInfo = await this.dataAccess.getEarningInfo(deviceId, isRegistered);

          return {
            total_block_rewards: earningInfo.total_block_rewards,
            total_job_rewards: earningInfo.total_job_rewards
          };
        }),
        `create earnings for task ${taskId}`
      );

      this.logger.log(`Earnings created successfully for task ${taskId}: block=${blockRewards}, job=${jobRewards}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create earnings: ${error}`);
      throw new EarningsCreationError('Failed to create earnings', { 
        blockRewards, 
        jobRewards, 
        taskId, 
        deviceId, 
        error 
      });
    }
  }

  /**
   * 获取设备收益
   */
  async getDeviceEarnings(deviceId: string, limit?: number): Promise<ModelOfMiner<'Earning'>[]> {
    try {
      this.logger.debug(`Getting earnings for device: ${deviceId}, limit: ${limit}`);

      const isRegistered = await this.isDeviceRegistered();
      const earnings = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          const allEarnings = await this.dataAccess.getEarningsByDeviceId(deviceId, isRegistered);
          return limit ? allEarnings.slice(0, limit) : allEarnings;
        }),
        `get device earnings for ${deviceId}`
      );

      this.logger.debug(`Found ${earnings.length} earnings for device ${deviceId}`);
      return earnings;
    } catch (error) {
      this.logger.error(`Failed to get device earnings: ${error}`);
      throw new MinerError('Failed to get device earnings', 'DEVICE_EARNINGS_ERROR', { deviceId, limit, error });
    }
  }

  /**
   * 获取收益历史
   */
  async getEarningsHistory(deviceId: string, days: number = 30): Promise<ModelOfMiner<'MinerEarningsHistory'>[]> {
    try {
      this.logger.debug(`Getting earnings history for device: ${deviceId}, days: ${days}`);

      const isRegistered = await this.isDeviceRegistered();
      const history = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return this.dataAccess.getEarningsHistory(deviceId, days, isRegistered);
        }),
        `get earnings history for ${deviceId}`
      );

      this.logger.debug(`Found ${history.length} earnings history entries for device ${deviceId}`);
      return history;
    } catch (error) {
      this.logger.error(`Failed to get earnings history: ${error}`);
      throw new MinerError('Failed to get earnings history', 'EARNINGS_HISTORY_ERROR', { deviceId, days, error });
    }
  }

  /**
   * 获取收益汇总
   */
  async getEarningsSummary(deviceId: string): Promise<ModelOfMiner<'MinerEarning'>> {
    try {
      this.logger.debug(`Getting earnings summary for device: ${deviceId}`);

      const isRegistered = await this.isDeviceRegistered();
      const summary = await this.withRetry(
        () => this.dataAccess.transaction(async (db) => {
          return this.dataAccess.getEarningInfo(deviceId, isRegistered);
        }),
        `get earnings summary for ${deviceId}`
      );

      this.logger.debug(`Earnings summary for device ${deviceId}: block=${summary.total_block_rewards}, job=${summary.total_job_rewards}`);
      return summary;
    } catch (error) {
      this.logger.error(`Failed to get earnings summary: ${error}`);
      throw new MinerError('Failed to get earnings summary', 'EARNINGS_SUMMARY_ERROR', { deviceId, error });
    }
  }

  // =============================================================================
  // 受保护的辅助方法
  // =============================================================================

  /**
   * 验证收益输入参数
   */
  protected validateEarningsInput(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): void {
    if (blockRewards < 0) {
      throw new EarningsCreationError('Block rewards cannot be negative', { blockRewards });
    }

    if (jobRewards < 0) {
      throw new EarningsCreationError('Job rewards cannot be negative', { jobRewards });
    }

    if (!taskId || taskId.trim() === '') {
      throw new EarningsCreationError('Task ID is required', { taskId });
    }

    if (!deviceId || deviceId.trim() === '') {
      throw new EarningsCreationError('Device ID is required', { deviceId });
    }

    if (blockRewards === 0 && jobRewards === 0) {
      this.logger.warn(`Creating earnings record with zero rewards for task ${taskId}`);
    }
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
   * 格式化收益金额
   */
  protected formatEarningsAmount(amount: number): number {
    return Math.round(amount * 100) / 100; // 保留两位小数
  }

  /**
   * 计算收益增长率
   */
  protected calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  /**
   * 验证收益数据完整性
   */
  protected validateEarningsData(earnings: ModelOfMiner<'Earning'>[]): boolean {
    return earnings.every(earning => 
      earning.device_id && 
      earning.task_id && 
      typeof earning.block_rewards === 'number' && 
      typeof earning.job_rewards === 'number' &&
      earning.block_rewards >= 0 &&
      earning.job_rewards >= 0
    );
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  /**
   * 检查设备是否已注册
   */
  protected abstract isDeviceRegistered(): Promise<boolean>;

  /**
   * 获取当前设备ID
   */
  protected abstract getCurrentDeviceId(): Promise<string>;

  /**
   * 发送收益通知（可选实现）
   */
  protected async notifyEarningsCreated?(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): Promise<void>;

  /**
   * 收益数据后处理（可选实现）
   */
  protected async postProcessEarnings?(
    earnings: ModelOfMiner<'Earning'>[]
  ): Promise<ModelOfMiner<'Earning'>[]>;
}
