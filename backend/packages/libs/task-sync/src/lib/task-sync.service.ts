import { Injectable, Inject, forwardRef, Logger } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { TaskSyncService, TASK_SYNC_SERVICE } from "./task-sync.interface";
import { ModelOfMiner } from "@saito/models";
import got from "got-cjs";
import { env } from "../../env";
import { TaskSyncRepository } from "./task-sync.repository";
import { DeviceStatusService } from "@saito/device-status";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";

@Injectable()
export class DefaultTaskSyncService implements TaskSyncService {
  private readonly logger = new Logger(DefaultTaskSyncService.name);

  constructor(
    @Inject(forwardRef(() => MinerService))
    private readonly minerService: MinerService,
    private readonly repository: TaskSyncRepository,
    private readonly deviceStatusService: DeviceStatusService
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncTasks(): Promise<void> {
    const gatewayStatus = await this.deviceStatusService.getGatewayStatus();
    if (!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping sync');
      return;
    }

    return this.repository.transaction(async (conn) => {
      const deviceId = await this.repository.getCurrentDeviceId(conn);
      const gatewayAddress = await this.deviceStatusService.getGatewayAddress();
      const key = await this.deviceStatusService.getKey();
      
      if (!gatewayAddress) {
        this.logger.warn('Gateway address not available, skipping sync');
        return;
      }

      try {
        const response = await got.get(`${gatewayAddress}/sync/tasks`, {
          headers: {
            'X-Device-ID': deviceId,
            'Authorization': `Bearer ${key}`
          }
        }).json();

        const gatewayTasks = response as any[];
        
        for (const task of gatewayTasks) {
          const exists = await this.repository.findExistingTask(conn, task.id);
          if (!exists) {
            await this.repository.createTask(conn, task);
          }
        }
      } catch (error) {
        this.logger.error('Error syncing tasks:', error);
        throw error;
      }
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncEarnings(): Promise<void> {
    const gatewayStatus = await this.deviceStatusService.getGatewayStatus();
    if (!gatewayStatus.isRegistered) {
      this.logger.debug('Device not registered, skipping sync');
      return;
    }

    return this.repository.transaction(async (conn) => {
      const deviceId = await this.repository.getCurrentDeviceId(conn);
      const gatewayAddress = await this.deviceStatusService.getGatewayAddress();
      const key = await this.deviceStatusService.getKey();
      
      if (!gatewayAddress) {
        this.logger.warn('Gateway address not available, skipping sync');
        return;
      }

      try {
        const response = await got.get(`${gatewayAddress}/sync/earnings`, {
          headers: {
            'X-Device-ID': deviceId,
            'Authorization': `Bearer ${key}`
          }
        }).json();

        const gatewayEarnings = response as any[];
        
        for (const earning of gatewayEarnings) {
          const exists = await this.repository.findExistingEarning(conn, earning.id);
          if (!exists) {
            await this.repository.createEarning(conn, earning);
          }
        }
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