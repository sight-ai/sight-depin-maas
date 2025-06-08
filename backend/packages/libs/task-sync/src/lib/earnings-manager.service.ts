import { Injectable, Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { TEarningsManager, EarningType, EARNINGS_MANAGER_SERVICE } from "./task-sync.interface";

/**
 * 抽象收益管理器
 * 负责收益记录的 CRUD 操作和验证
 */
@Injectable()
export class EarningsManagerService implements TEarningsManager {
  private readonly logger = new Logger(EarningsManagerService.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) {}

  /**
   * 安全解析 JSON
   */
  private safeJsonParse<T>(jsonString: any, errorContext: string): T | null {
    if (!jsonString) return null;
    
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.error(`${errorContext}: ${error}`);
      return null;
    }
  }

  /**
   * 验证任务引用
   */
  async validateTaskReference(taskId: string): Promise<boolean> {
    if (!taskId) return true; // 允许没有任务ID的收益记录

    try {
      await this.persistentService.tasksDb.get(taskId);
      return true;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        this.logger.warn(`Task reference not found: ${taskId}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * 验证设备引用
   */
  private async validateDeviceReference(deviceId: string): Promise<boolean> {
    if (!deviceId) return false;

    try {
      await this.persistentService.deviceStatusDb.get(deviceId);
      return true;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        this.logger.warn(`Device reference not found: ${deviceId}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * 标准化日期格式
   */
  private normalizeDate(date: any): string {
    if (!date) return new Date().toISOString();
    
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
      return date;
    }
    
    return new Date(date).toISOString();
  }

  /**
   * 创建收益记录
   */
  async createEarning(earning: EarningType): Promise<void> {
    try {
      // 验证设备引用
      if (!earning.device_id || !(await this.validateDeviceReference(earning.device_id))) {
        throw new Error(`Invalid device reference: ${earning.device_id}`);
      }

      // 验证任务引用（如果提供）
      if (earning.task_id && !(await this.validateTaskReference(earning.task_id))) {
        throw new Error(`Invalid task reference: ${earning.task_id}`);
      }

      const earningData = {
        ...earning,
        source: 'gateway',
        created_at: this.normalizeDate(earning.created_at),
        updated_at: this.normalizeDate(earning.updated_at)
      };

      await this.persistentService.earningsDb.put(earning.id, JSON.stringify(earningData));
      this.logger.debug(`Earning created: ${earning.id}`);
    } catch (error) {
      this.logger.error(`Failed to create earning ${earning.id}:`, error);
      throw error;
    }
  }

  /**
   * 更新收益记录
   */
  async updateEarning(earningId: string, updates: Partial<EarningType>): Promise<void> {
    try {
      const existingData = await this.persistentService.earningsDb.get(earningId);
      const existingEarning = this.safeJsonParse<EarningType>(existingData, `Parsing earning ${earningId}`);
      
      if (!existingEarning) {
        throw new Error(`Earning not found: ${earningId}`);
      }

      if (existingEarning.source !== 'gateway') {
        throw new Error(`Cannot update non-gateway earning: ${earningId}`);
      }

      // 验证任务引用（如果更新了任务ID）
      if (updates.task_id && !(await this.validateTaskReference(updates.task_id))) {
        throw new Error(`Invalid task reference: ${updates.task_id}`);
      }

      const updatedEarning = {
        ...existingEarning,
        ...updates,
        updated_at: this.normalizeDate(updates.updated_at)
      };

      await this.persistentService.earningsDb.put(earningId, JSON.stringify(updatedEarning));
      // this.logger.debug(`Earning updated: ${earningId}`);
    } catch (error) {
      this.logger.error(`Failed to update earning ${earningId}:`, error);
      throw error;
    }
  }

  /**
   * 查找收益记录
   */
  async findEarning(earningId: string): Promise<EarningType | null> {
    try {
      const earningData = await this.persistentService.earningsDb.get(earningId);
      const earning = this.safeJsonParse<EarningType>(earningData, `Finding earning ${earningId}`);
      
      return earning && earning.source === 'gateway' ? earning : null;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Error finding earning ${earningId}:`, error);
      return null;
    }
  }
}

const EarningsManagerServiceProvider = {
  provide: EARNINGS_MANAGER_SERVICE,
  useClass: EarningsManagerService
};

export default EarningsManagerServiceProvider;
