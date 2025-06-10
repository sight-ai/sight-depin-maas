import { Injectable, Inject, Logger } from "@nestjs/common";
import { DeviceStatusService } from "@saito/device-status";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  TTaskSyncService,
  TTaskManager,
  TEarningsManager,
  TGatewayClient,
  SyncResult,
  SyncRequestParams,
  TASK_SYNC_SERVICE,
  TASK_MANAGER_SERVICE,
  EARNINGS_MANAGER_SERVICE,
  GATEWAY_CLIENT_SERVICE
} from "./task-sync.interface";

/**
 * 优化的任务同步服务
 */
@Injectable()
export class OptimizedTaskSyncService implements TTaskSyncService {
  private readonly logger = new Logger(OptimizedTaskSyncService.name);

  constructor(
    @Inject(TASK_MANAGER_SERVICE)
    private readonly taskManager: TTaskManager,
    @Inject(EARNINGS_MANAGER_SERVICE)
    private readonly earningsManager: TEarningsManager,
    @Inject(GATEWAY_CLIENT_SERVICE)
    private readonly gatewayClient: TGatewayClient,
    private readonly deviceStatusService: DeviceStatusService
  ) {}

  /**
   * 获取同步所需的连接参数
   */
  private async getSyncParams(): Promise<SyncRequestParams | null> {
    try {
      const [deviceId, gatewayAddress, key, isRegistered] = await Promise.all([
        this.deviceStatusService.getDeviceId(),
        this.deviceStatusService.getGatewayAddress(),
        this.deviceStatusService.getKey(),
        this.deviceStatusService.isRegistered()
      ]);

      if (!isRegistered || !gatewayAddress || !key) {
        return null;
      }

      return {
        deviceId,
        gatewayAddress,
        authKey: key,
        page: 1,
        pageSize: 100
      };
    } catch (error) {
      this.logger.error('Failed to get sync parameters:', error);
      return null;
    }
  }

  /**
   * 同步任务
   * 从网关获取任务并同步到本地数据库
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async syncTasks(): Promise<SyncResult> {
    try {
      const syncParams = await this.getSyncParams();
      if (!syncParams) {
        return { success: false, synced: 0, errors: 0, message: 'Device not registered or missing connection info' };
      }

      // 更新任务状态
      await this.taskManager.updateTaskStatuses();

      // 从网关获取任务
      const gatewayTasks = await this.gatewayClient.fetchTasks(syncParams);

      let synced = 0;
      let errors = 0;

      // 处理每个任务
      for (const task of gatewayTasks) {
        try {
          // 确保任务有设备ID
          if (!task.device_id) {
            task.device_id = syncParams.deviceId;
          }

          const existingTask = await this.taskManager.findTask(task.id);

          if (existingTask) {
            await this.taskManager.updateTask(task.id, task);
          } else {
            await this.taskManager.createTask(task);
            synced++;
          }
        } catch (error) {
          this.logger.error(`Error processing task ${task.id}:`, error);
          errors++;
        }
      }

      // this.logger.debug(`Tasks sync completed: ${synced} synced, ${errors} errors`);
      return { success: true, synced, errors };

    } catch (error) {
      this.logger.error('Error syncing tasks:', error);
      return { success: false, synced: 0, errors: 1, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 同步收益记录
   * 从网关获取收益记录并同步到本地数据库
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncEarnings(): Promise<SyncResult> {
    try {
      const syncParams = await this.getSyncParams();
      if (!syncParams) {
        return { success: false, synced: 0, errors: 0, message: 'Device not registered or missing connection info' };
      }

      // 从网关获取收益记录
      const gatewayEarnings = await this.gatewayClient.fetchEarnings(syncParams);

      let synced = 0;
      let errors = 0;

      // 获取所有任务ID用于验证
      const taskIds = await this.taskManager.getAllTaskIds();

      // 处理每个收益记录
      for (const earning of gatewayEarnings) {
        try {
          // 确保收益记录有设备ID
          if (!earning.device_id) {
            earning.device_id = syncParams.deviceId;
          }

          // 验证任务引用（如果有）
          if (earning.task_id && !taskIds.has(earning.task_id)) {
            this.logger.warn(`Skipping earning ${earning.id}: invalid task reference ${earning.task_id}`);
            continue;
          }

          const existingEarning = await this.earningsManager.findEarning(earning.id);

          if (existingEarning) {
            await this.earningsManager.updateEarning(earning.id, earning);
          } else {
            await this.earningsManager.createEarning(earning);
            synced++;
          }
        } catch (error) {
          this.logger.error(`Error processing earning ${earning.id}:`, error);
          errors++;
        }
      }

      // this.logger.debug(`Earnings sync completed: ${synced} synced, ${errors} errors`);
      return { success: true, synced, errors };

    } catch (error) {
      this.logger.error('Error syncing earnings:', error);
      return { success: false, synced: 0, errors: 1, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

const TaskSyncServiceProvider = {
  provide: TASK_SYNC_SERVICE,
  useClass: OptimizedTaskSyncService
};

export default TaskSyncServiceProvider;