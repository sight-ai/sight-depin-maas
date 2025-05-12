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

    // 处理新的分页响应格式
    if (response.success && response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    // 兼容旧格式
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
   * 每5秒从网关获取任务并同步到本地数据库
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
        // 使用新的API路径获取设备任务
        const response = await got.get(`${gatewayAddress}/node/devices/${deviceId}/tasks`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          searchParams: {
            page: 1,
            pageSize: 100 // 获取足够多的任务
          }
        }).json() as GatewayResponse<z.infer<typeof Task>>;

        this.logger.debug('Raw tasks response from gateway:', response);

        const gatewayTasks = this.parseGatewayResponse<z.infer<typeof Task>>(response, 'tasks');

        await Promise.all(gatewayTasks.map(async (task) => {
          try {
            // 确保任务有设备ID
            if (!task.device_id) {
              task.device_id = deviceId;
            }

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
   * 每10秒从网关获取收益记录并同步到本地数据库
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
        // 使用专门的收益API端点获取收益记录
        const earningsResponse = await got.get(`${gatewayAddress}/node/devices/${deviceId}/earnings`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          searchParams: {
            page: 1,
            pageSize: 100  // 获取足够多的收益记录
          }
        }).json() as GatewayResponse<z.infer<typeof Earning>>;

        this.logger.debug('Raw earnings response from gateway:', earningsResponse);

        if (!earningsResponse.success || !earningsResponse.data) {
          this.logger.warn('Invalid response format from gateway earnings endpoint');
          return;
        }

        // 处理收益记录
        const gatewayEarnings = earningsResponse.data.data;
        let syncedEarnings = 0;

        await Promise.all(gatewayEarnings.map(async (earning) => {
          try {
            // 记录原始收益数据
            this.logger.debug(`Processing earning ${earning.id}: ${JSON.stringify(earning)}`);

            // 确保收益记录有设备ID
            if (!earning.device_id) {
              earning.device_id = deviceId;
              this.logger.debug(`Added device_id ${deviceId} to earning ${earning.id}`);
            }

            // 确保日期字段是有效的ISO日期字符串
            if (earning.created_at && !(typeof earning.created_at === 'string' && earning.created_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/))) {
              earning.created_at = new Date(earning.created_at).toISOString();
              this.logger.debug(`Normalized created_at date for earning ${earning.id}: ${earning.created_at}`);
            }

            if (earning.updated_at && !(typeof earning.updated_at === 'string' && earning.updated_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/))) {
              earning.updated_at = new Date(earning.updated_at).toISOString();
              this.logger.debug(`Normalized updated_at date for earning ${earning.id}: ${earning.updated_at}`);
            }

            // 如果没有updated_at，使用created_at或当前时间
            if (!earning.updated_at) {
              earning.updated_at = earning.created_at || new Date().toISOString();
              this.logger.debug(`Set missing updated_at for earning ${earning.id}: ${earning.updated_at}`);
            }

            // 检查收益记录是否已存在
            const exists = await this.repository.findExistingEarning(conn, earning.id);

            if (exists) {
              await this.repository.updateExistingEarning(conn, earning);
              this.logger.debug(`Updated earning: ${earning.id}`);
            } else {
              await this.repository.createEarning(conn, earning);
              this.logger.debug(`Created new earning: ${earning.id}`);
              syncedEarnings++;
            }
          } catch (error) {
            this.logger.error(`Error processing earning ${earning.id}:`, error);
            // 记录完整的收益对象以便调试
            this.logger.error(`Earning data: ${JSON.stringify(earning)}`);
          }
        }));

        this.logger.debug(`Synced ${syncedEarnings} earnings from gateway`);

        // // 同时从任务中获取收益信息（兼容旧版本）
        // const tasksResponse = await got.get(`${gatewayAddress}/node/devices/${deviceId}/tasks`, {
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${key}`
        //   },
        //   searchParams: {
        //     page: 1,
        //     pageSize: 100,  // 获取足够多的任务
        //     status: 'completed'  // 只获取已完成的任务
        //   }
        // }).json() as GatewayResponse<z.infer<typeof Task>>;

        // if (tasksResponse.success && tasksResponse.data) {
        //   const tasks = tasksResponse.data.data;
        //   let syncedTaskEarnings = 0;

        //   for (const task of tasks) {
        //     try {
        //       // 检查任务是否有收益信息
        //       if (task.earnings === undefined || task.earnings === null) {
        //         continue;
        //       }

        //       // 创建收益记录
        //       const taskEarning: z.infer<typeof Earning> = {
        //         id: `${task.id}-earning`,  // 使用任务ID加后缀作为收益ID
        //         block_rewards: task.block_rewards || 0,
        //         job_rewards: task.job_rewards || task.earnings || 0,  // 使用earnings作为备选
        //         device_id: deviceId,
        //         task_id: task.id,
        //         created_at: task.created_at,
        //         updated_at: task.updated_at || new Date().toISOString(),
        //         source: 'gateway',  // 标记来源为网关
        //         type: 'task',  // 标记类型为任务收益
        //         amount: task.job_rewards || task.earnings || 0,
        //         status: 'confirmed',  // 已完成任务的收益默认为已确认
        //         description: `Task earnings for model: ${task.model}`
        //       };

        //       // 检查收益记录是否已存在
        //       const exists = await this.repository.findExistingEarning(conn, taskEarning.id);

        //       if (exists) {
        //         await this.repository.updateExistingEarning(conn, taskEarning);
        //         this.logger.debug(`Updated task earning: ${taskEarning.id}`);
        //       } else {
        //         await this.repository.createEarning(conn, taskEarning);
        //         this.logger.debug(`Created new task earning: ${taskEarning.id}`);
        //         syncedTaskEarnings++;
        //       }
        //     } catch (error) {
        //       this.logger.error(`Error processing earning for task ${task.id}:`, error);
        //     }
        //   }

        //   this.logger.debug(`Synced ${syncedTaskEarnings} task earnings from gateway`);
        // }
      } catch (error) {
        this.logger.error('Error syncing earnings:', error);
        // 不抛出错误，允许继续运行
      }
    });
  }
}

const TaskSyncServiceProvider = {
  provide: TASK_SYNC_SERVICE,
  useClass: DefaultTaskSyncService
};

export default TaskSyncServiceProvider;