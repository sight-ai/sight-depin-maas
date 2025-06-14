import { Logger } from '@nestjs/common';
import { ModelOfMiner } from '@saito/models';
import { 
  IDataAccessLayer, 
  MinerConfig, 
  DataAccessError 
} from '../core-contracts/miner-core.contracts';

/**
 * 数据访问层基础实现类
 * 提供通用的数据访问功能实现
 */
export abstract class BaseDataAccessLayer implements IDataAccessLayer {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly config: MinerConfig) {}

  // =============================================================================
  // 任务相关方法
  // =============================================================================

  async createTask(model: string, deviceId: string): Promise<ModelOfMiner<'Task'>> {
    try {
      this.logger.debug(`Creating task with model: ${model}, deviceId: ${deviceId}`);
      return await this.executeCreateTask(model, deviceId);
    } catch (error) {
      this.logger.error(`Failed to create task: ${error}`);
      throw new DataAccessError('Failed to create task', { model, deviceId, error });
    }
  }

  async updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>> {
    try {
      this.logger.debug(`Updating task ${id}`, updates);
      return await this.executeUpdateTask(id, updates);
    } catch (error) {
      this.logger.error(`Failed to update task ${id}: ${error}`);
      throw new DataAccessError('Failed to update task', { id, updates, error });
    }
  }

  async getTaskById(id: string): Promise<ModelOfMiner<'Task'> | null> {
    try {
      this.logger.debug(`Getting task by id: ${id}`);
      return await this.executeGetTaskById(id);
    } catch (error) {
      this.logger.error(`Failed to get task ${id}: ${error}`);
      throw new DataAccessError('Failed to get task by id', { id, error });
    }
  }

  async getTasksByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Task'>[]> {
    try {
      // this.logger.debug(`Getting tasks for device: ${deviceId}, registered: ${isRegistered}`);
      return await this.executeGetTasksByDeviceId(deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get tasks for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get tasks by device id', { deviceId, isRegistered, error });
    }
  }

  async getTasksPaginated(page: number, limit: number, deviceId: string, isRegistered: boolean): Promise<{
    count: number;
    tasks: ModelOfMiner<'Task'>[];
  }> {
    try {
      this.logger.debug(`Getting paginated tasks: page=${page}, limit=${limit}, device=${deviceId}, registered=${isRegistered}`);
      return await this.executeGetTasksPaginated(page, limit, deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get paginated tasks: ${error}`);
      throw new DataAccessError('Failed to get paginated tasks', { page, limit, deviceId, isRegistered, error });
    }
  }

  // =============================================================================
  // 收益相关方法
  // =============================================================================

  async createEarning(
    blockRewards: number, 
    jobRewards: number, 
    deviceId: string, 
    taskId: string
  ): Promise<void> {
    try {
      this.logger.debug(`Creating earning: block=${blockRewards}, job=${jobRewards}, device=${deviceId}, task=${taskId}`);
      await this.executeCreateEarning(blockRewards, jobRewards, deviceId, taskId);
    } catch (error) {
      this.logger.error(`Failed to create earning: ${error}`);
      throw new DataAccessError('Failed to create earning', { blockRewards, jobRewards, deviceId, taskId, error });
    }
  }

  async getEarningsByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Earning'>[]> {
    try {
      this.logger.debug(`Getting earnings for device: ${deviceId}, registered: ${isRegistered}`);
      return await this.executeGetEarningsByDeviceId(deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get earnings for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get earnings by device id', { deviceId, isRegistered, error });
    }
  }

  async getEarningInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarning'>> {
    try {
      this.logger.debug(`Getting earning info for device: ${deviceId}, registered: ${isRegistered}`);
      return await this.executeGetEarningInfo(deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get earning info for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get earning info', { deviceId, isRegistered, error });
    }
  }

  async getEarningsHistory(deviceId: string, days: number, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarningsHistory'>[]> {
    try {
      this.logger.debug(`Getting earnings history for device: ${deviceId}, days: ${days}, registered: ${isRegistered}`);
      return await this.executeGetEarningsHistory(deviceId, days, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get earnings history for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get earnings history', { deviceId, days, isRegistered, error });
    }
  }

  // =============================================================================
  // 设备相关方法
  // =============================================================================

  async getDeviceInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerDeviceStatus'> | null> {
    try {
      this.logger.debug(`Getting device info for: ${deviceId}, registered: ${isRegistered}`);
      return await this.executeGetDeviceInfo(deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get device info for ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get device info', { deviceId, isRegistered, error });
    }
  }

  async getUptimePercentage(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerUptime'>> {
    try {
      this.logger.debug(`Getting uptime percentage for device: ${deviceId}, registered: ${isRegistered}`);
      return await this.executeGetUptimePercentage(deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get uptime percentage for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get uptime percentage', { deviceId, isRegistered, error });
    }
  }

  // =============================================================================
  // 统计相关方法
  // =============================================================================

  async getTaskRequestData(
    deviceId: string, 
    period: 'daily' | 'weekly' | 'monthly', 
    isRegistered: boolean
  ): Promise<ModelOfMiner<'MinerDailyRequests'>[]> {
    try {
      this.logger.debug(`Getting task request data for device: ${deviceId}, period: ${period}, registered: ${isRegistered}`);
      return await this.executeGetTaskRequestData(deviceId, period, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get task request data for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get task request data', { deviceId, period, isRegistered, error });
    }
  }

  async getMonthlyTaskActivity(year: number, deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerTaskActivity'>[]> {
    try {
      this.logger.debug(`Getting monthly task activity for device: ${deviceId}, year: ${year}, registered: ${isRegistered}`);
      return await this.executeGetMonthlyTaskActivity(year, deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get monthly task activity for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get monthly task activity', { year, deviceId, isRegistered, error });
    }
  }

  async getDailyTaskActivity(month: number, deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerTaskActivity'>[]> {
    try {
      this.logger.debug(`Getting daily task activity for device: ${deviceId}, month: ${month}, registered: ${isRegistered}`);
      return await this.executeGetDailyTaskActivity(month, deviceId, isRegistered);
    } catch (error) {
      this.logger.error(`Failed to get daily task activity for device ${deviceId}: ${error}`);
      throw new DataAccessError('Failed to get daily task activity', { month, deviceId, isRegistered, error });
    }
  }

  // =============================================================================
  // 事务支持
  // =============================================================================

  async transaction<T>(handler: (db: any) => Promise<T>): Promise<T> {
    try {
      // this.logger.debug('Starting database transaction');
      return await this.executeTransaction(handler);
    } catch (error) {
      this.logger.error(`Transaction failed: ${error}`);
      throw new DataAccessError('Transaction failed', { error });
    }
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  // 任务相关
  protected abstract executeCreateTask(model: string, deviceId: string): Promise<ModelOfMiner<'Task'>>;
  protected abstract executeUpdateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>>;
  protected abstract executeGetTaskById(id: string): Promise<ModelOfMiner<'Task'> | null>;
  protected abstract executeGetTasksByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Task'>[]>;
  protected abstract executeGetTasksPaginated(page: number, limit: number, deviceId: string, isRegistered: boolean): Promise<{ count: number; tasks: ModelOfMiner<'Task'>[] }>;

  // 收益相关
  protected abstract executeCreateEarning(blockRewards: number, jobRewards: number, deviceId: string, taskId: string): Promise<void>;
  protected abstract executeGetEarningsByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Earning'>[]>;
  protected abstract executeGetEarningInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarning'>>;
  protected abstract executeGetEarningsHistory(deviceId: string, days: number, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarningsHistory'>[]>;

  // 设备相关
  protected abstract executeGetDeviceInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerDeviceStatus'> | null>;
  protected abstract executeGetUptimePercentage(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerUptime'>>;

  // 统计相关
  protected abstract executeGetTaskRequestData(deviceId: string, period: 'daily' | 'weekly' | 'monthly', isRegistered: boolean): Promise<ModelOfMiner<'MinerDailyRequests'>[]>;
  protected abstract executeGetMonthlyTaskActivity(year: number, deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerTaskActivity'>[]>;
  protected abstract executeGetDailyTaskActivity(month: number, deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerTaskActivity'>[]>;

  // 事务支持
  protected abstract executeTransaction<T>(handler: (db: any) => Promise<T>): Promise<T>;

  // =============================================================================
  // 统计数据加载
  // =============================================================================

  async loadStatistics(): Promise<any> {
    try {
      this.logger.debug('Loading statistics data');
      return await this.executeLoadStatistics();
    } catch (error) {
      this.logger.error(`Failed to load statistics: ${error}`);
      throw new DataAccessError('Failed to load statistics', { error });
    }
  }

  // 统计数据加载
  protected abstract executeLoadStatistics(): Promise<any>;
}
