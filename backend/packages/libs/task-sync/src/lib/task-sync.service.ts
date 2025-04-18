import { Injectable, Inject, forwardRef, Logger } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { TaskSyncService, TASK_SYNC_SERVICE } from "./task-sync.interface";
import { ModelOfMiner, TaskSyncSchemas } from "@saito/models";
import got from "got-cjs";
import { env } from "../../env";
import { TaskSyncRepository } from "./task-sync.repository";
import { DeviceStatusService } from "@saito/device-status";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import * as R from 'ramda';

type GatewayResponse<T> = TaskSyncSchemas.ModelOfTaskSync<'GatewayResponse'> & { data?: T[] };

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
    // 检查响应是否为空
    if (!response) {
      this.logger.warn(`Gateway ${endpointName} response is null or undefined`);
      return [];
    }
    
    // 提取数据数组
    const items = Array.isArray(response) ? response : 
                  (response.data && Array.isArray(response.data)) ? response.data : [];

    // 检查数据格式
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
  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncTasks(): Promise<void> {
    // 检查设备是否已注册
    const gatewayStatus = await this.deviceStatusService.getGatewayStatus();
    if (!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping task sync');
      return;
    }
    if(!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping task sync');
      return;
    }
    return this.repository.transaction(async (conn) => {
      // 更新现有任务的状态
      await this.repository.updateExistingTaskStatuses(conn);

      // 获取连接信息
      const { deviceId, gatewayAddress, key } = await this.getConnectionInfo(conn);
      
      if (!gatewayAddress) {
        this.logger.warn('Gateway address not available, skipping task sync');
        return;
      }

      try {
        // 从网关获取任务数据
        const response = await got.get(`${gatewayAddress}/sync/tasks`, {
          headers: {
            'X-Device-ID': deviceId,
            'Authorization': `Bearer ${key}`
          }
        }).json() as GatewayResponse<any> | any[];

        this.logger.debug('Raw tasks response from gateway:', response);
        
        // 解析任务数据
        const gatewayTasks = this.parseGatewayResponse<TaskSyncSchemas.ModelOfTaskSync<'Task'>>(
          response, 
          'tasks'
        );
        
        // 处理每个任务
        await Promise.all(gatewayTasks.map(async (task) => {
          try {
            // 检查任务是否已存在
            const exists = await this.repository.findExistingTask(conn, task.id);
            
            // 确保任务具有设备ID
            // const taskWithDevice = R.mergeRight(task, { device_id: deviceId });
            const taskWithDevice = R.mergeRight(task, { });

            // 更新或创建任务
            if (exists) {
              await this.repository.updateExistingTask(conn, taskWithDevice);
              this.logger.debug(`Updated task: ${task.id}`);
            } else {
              await this.repository.createTask(conn, taskWithDevice);
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
  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncEarnings(): Promise<void> {
    // 检查设备是否已注册
    const gatewayStatus = await this.deviceStatusService.getGatewayStatus();
    if (!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping earnings sync');
      return;
    }
    if(!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping earnings sync');
      return;
    }
    return this.repository.transaction(async (conn) => {
      // 获取连接信息
      const { deviceId, gatewayAddress, key } = await this.getConnectionInfo(conn);
      
      if (!gatewayAddress) {
        this.logger.warn('Gateway address not available, skipping earnings sync');
        return;
      }

      try {
        // 从网关获取收益记录
        const response = await got.get(`${gatewayAddress}/sync/earnings`, {
          headers: {
            'X-Device-ID': deviceId,
            'Authorization': `Bearer ${key}`
          }
        }).json() as GatewayResponse<any> | any[];

        this.logger.debug('Raw earnings response from gateway:', response);

        // 解析收益记录数据
        const gatewayEarnings = this.parseGatewayResponse<TaskSyncSchemas.ModelOfTaskSync<'Earning'>>(
          response, 
          'earnings'
        );
        
        // 处理每个收益记录
        await Promise.all(gatewayEarnings.map(async (earning) => {
          try {
            // 检查收益记录是否已存在
            const exists = await this.repository.findExistingEarning(conn, earning.id);
            
            // 确保收益记录具有设备ID
            // const earningWithDevice = R.mergeRight(earning, { device_id: deviceId });
            const earningWithDevice = R.mergeRight(earning, { });

            // 更新或创建收益记录
            if (exists) {
              await this.repository.updateExistingEarning(conn, earningWithDevice);
              this.logger.debug(`Updated earning: ${earning.id}`);
            } else {
              await this.repository.createEarning(conn, earningWithDevice);
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