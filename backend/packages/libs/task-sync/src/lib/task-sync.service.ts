import { Injectable, Inject, forwardRef, Logger } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { TaskSyncService, TASK_SYNC_SERVICE, GatewayResponse } from "./task-sync.interface";
import { Task, Earning } from "@saito/models";
import got from "got-cjs";
import { env } from "../../env";
import { TaskSyncRepository } from "./task-sync.repository";
import { DeviceStatusService } from "@saito/device-status";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import * as R from 'ramda';
import { z } from 'zod';

/**
 * 任务同步服务
 * 负责将任务和收益记录与网关同步
 */
@Injectable()
export class DefaultTaskSyncService implements TaskSyncService {
  private readonly logger = new Logger(DefaultTaskSyncService.name);

  constructor(
    @Inject(forwardRef(() => MinerService))
    private readonly minerService: MinerService,
    private readonly repository: TaskSyncRepository,
    private readonly deviceStatusService: DeviceStatusService
  ) {}

  /**
   * 获取设备状态和连接信息
   * 返回设备ID、网关地址和访问密钥
   */
  private async getConnectionInfo(conn: DatabaseTransactionConnection) {
    const [deviceId, gatewayAddress, key, isRegistered] = await Promise.all([
      this.repository.getCurrentDeviceId(conn),
      this.deviceStatusService.getGatewayAddress(),
      this.deviceStatusService.getKey(),
      this.deviceStatusService.isRegistered()
    ]);
    
    return { deviceId, gatewayAddress, key, isRegistered };
  }

  /**
   * 处理网关响应
   * 检查响应格式并提取数据
   */
  private parseGatewayResponse<T>(response: any, endpointName: string): T[] {
    if (!response) {
      this.logger.warn(`Gateway ${endpointName} response is null or undefined`);
      return [];
    }
    
    const items = Array.isArray(response) ? response : 
                  (response.data && Array.isArray(response.data)) ? response.data : [];

    if (!Array.isArray(items)) {
      this.logger.warn(
        `Unexpected response format from gateway ${endpointName} endpoint. Expected array, got:`, 
        typeof items, 'Response structure:', JSON.stringify(response)
      );
      return [];
    }
    
    return items;
  }

  /**
   * 同步任务定时任务
   * 每30秒从网关获取任务并同步到本地数据库
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async syncTasks(): Promise<void> {
    const gatewayStatus = await this.deviceStatusService.getGatewayStatus();
    if (!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping task sync');
      return;
    }

    return this.repository.transaction(async (conn) => {
      await this.repository.updateExistingTaskStatuses(conn);

      const { deviceId, gatewayAddress, key } = await this.getConnectionInfo(conn);
      
      if (!gatewayAddress) {
        this.logger.warn('Gateway address not available, skipping task sync');
        return;
      }

      try {
        const response = await got.get(`${gatewayAddress}/sync/tasks`, {
          headers: {
            'X-Device-ID': deviceId,
            'Authorization': `Bearer ${key}`
          }
        }).json() as GatewayResponse<z.infer<typeof Task>>;

        this.logger.debug('Raw tasks response from gateway:', response);
        
        const gatewayTasks = this.parseGatewayResponse<z.infer<typeof Task>>(response, 'tasks');
        
        await Promise.all(gatewayTasks.map(async (task) => {
          try {
            const exists = await this.repository.findExistingTask(conn, task.id);
            
            if (exists) {
              await this.repository.updateExistingTask(conn, task);
              this.logger.debug(`Updated task: ${task.id}`);
            } else {
              await this.repository.createTask(conn, task);
              this.logger.debug(`Created new task: ${task.id}`);
            }
          } catch (error) {
            this.logger.error(`Error processing task ${task.id}:`, error);
          }
        }));

        this.logger.debug(`Synced ${gatewayTasks.length} tasks from gateway`);
      } catch (error) {
        this.logger.error('Error syncing tasks:', error);
        throw error;
      }
    });
  }

  /**
   * 同步收益记录定时任务
   * 每30秒从网关获取收益记录并同步到本地数据库
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncEarnings(): Promise<void> {
    const gatewayStatus = await this.deviceStatusService.getGatewayStatus();
    if (!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping earnings sync');
      return;
    }

    return this.repository.transaction(async (conn) => {
      const { deviceId, gatewayAddress, key } = await this.getConnectionInfo(conn);
      
      if (!gatewayAddress) {
        this.logger.warn('Gateway address not available, skipping earnings sync');
        return;
      }

      try {
        const response = await got.get(`${gatewayAddress}/sync/earnings`, {
          headers: {
            'X-Device-ID': deviceId,
            'Authorization': `Bearer ${key}`
          }
        }).json() as GatewayResponse<z.infer<typeof Earning>>;

        this.logger.debug('Raw earnings response from gateway:', response);

        const gatewayEarnings = this.parseGatewayResponse<z.infer<typeof Earning>>(response, 'earnings');
        
        await Promise.all(gatewayEarnings.map(async (earning) => {
          try {
            const exists = await this.repository.findExistingEarning(conn, earning.id);
            
            if (exists) {
              await this.repository.updateExistingEarning(conn, earning);
              this.logger.debug(`Updated earning: ${earning.id}`);
            } else {
              await this.repository.createEarning(conn, earning);
              this.logger.debug(`Created new earning: ${earning.id}`);
            }
          } catch (error) {
            this.logger.error(`Error processing earning ${earning.id}:`, error);
          }
        }));
        
        this.logger.debug(`Synced ${gatewayEarnings.length} earnings from gateway`);
      } catch (error) {
        this.logger.error('Error syncing earnings:', error);
        throw error;
      }
    });
  }
}

const TaskSyncServiceProvider = {
  provide: TASK_SYNC_SERVICE,
  useClass: DefaultTaskSyncService
};

export default TaskSyncServiceProvider; 