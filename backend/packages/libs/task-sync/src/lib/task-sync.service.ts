import { Injectable, Inject, forwardRef, Logger } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { TaskSyncService, TASK_SYNC_SERVICE, GatewayResponse } from "./task-sync.interface";
import { Task, Earning } from "@saito/models";
import got from "got-cjs";
import { TaskSyncRepository } from "./task-sync.repository";
import { DeviceStatusService } from "@saito/device-status";
import { Cron, CronExpression } from "@nestjs/schedule";
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
  private async getConnectionInfo(db: any) {
    const [deviceId, gatewayAddress, key, isRegistered] = await Promise.all([
      this.repository.getCurrentDeviceId(db),
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

      return;
    }

    return this.repository.transaction(async (db) => {
      await this.repository.updateExistingTaskStatuses(db);

      const { deviceId, gatewayAddress, key } = await this.getConnectionInfo(db);

      if (!gatewayAddress) {

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


        const gatewayTasks = this.parseGatewayResponse<z.infer<typeof Task>>(response, 'tasks');

        await Promise.all(gatewayTasks.map(async (task) => {
          try {
            // 确保任务有设备ID
            if (!task.device_id) {
              task.device_id = deviceId;
            }

            const exists = await this.repository.findExistingTask(db, task.id);

            if (exists) {
              await this.repository.updateExistingTask(db, task);
            } else {
              await this.repository.createTask(db, task);
            }
          } catch (error) {
            this.logger.error(`Error processing task ${task.id}:`, error);
          }
        }));


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

      return;
    }

    return this.repository.transaction(async (db) => {
      const { deviceId, gatewayAddress, key } = await this.getConnectionInfo(db);

      if (!gatewayAddress) {

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


        if (!earningsResponse.success || !earningsResponse.data) {

          return;
        }

        // 处理收益记录
        const gatewayEarnings = earningsResponse.data.data;
        let syncedEarnings = 0;

        // 首先获取所有任务ID，用于验证收益记录中的任务ID
        let taskIds = new Set<string>();
        try {
          // 使用仓库方法获取所有网关任务ID
          taskIds = await this.repository.getAllGatewayTaskIds(db);
        } catch (error) {
          this.logger.warn('Failed to fetch existing tasks for validation:', error);
        }

        await Promise.all(gatewayEarnings.map(async (earning) => {
          try {
            // 确保收益记录有设备ID
            if (!earning.device_id) {
              earning.device_id = deviceId;
            }

            // 确保日期字段是有效的ISO日期字符串
            if (earning.created_at && !(typeof earning.created_at === 'string' && earning.created_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/))) {
              earning.created_at = new Date(earning.created_at).toISOString();
            }

            if (earning.updated_at && !(typeof earning.updated_at === 'string' && earning.updated_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/))) {
              earning.updated_at = new Date(earning.updated_at).toISOString();
            }

            // 如果没有updated_at，使用created_at或当前时间
            if (!earning.updated_at) {
              earning.updated_at = earning.created_at || new Date().toISOString();
            }

            // 验证任务ID是否存在
            if (earning.task_id && !taskIds.has(earning.task_id)) {
              // 如果任务ID不存在，跳过这个收益记录
              return; // 直接返回，不处理这个收益记录
            }

            // 检查收益记录是否已存在
            const exists = await this.repository.findExistingEarning(db, earning.id);

            if (exists) {
              await this.repository.updateExistingEarning(db, earning);
            } else {
              await this.repository.createEarning(db, earning);
              syncedEarnings++;
            }
          } catch (error) {
            this.logger.error(`Error processing earning ${earning.id}:`, error);
            // 记录完整的收益对象以便调试
            this.logger.error(`Earning data: ${JSON.stringify(earning)}`);
          }
        }));


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
        //
        //       } else {
        //         await this.repository.createEarning(conn, taskEarning);
        //
        //         syncedTaskEarnings++;
        //       }
        //     } catch (error) {
        //       this.logger.error(`Error processing earning for task ${task.id}:`, error);
        //     }
        //   }

        //
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