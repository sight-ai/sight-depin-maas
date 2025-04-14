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

interface GatewayResponse<T> {
  data?: T[];
  code: number;
  message: string;
}

type GatewayTaskStatus = 'completed' | 'failed' | 'active';
type SchemaTaskStatus = 'succeed' | 'failed' | 'in-progress';

const mapTaskStatus = (gatewayStatus: GatewayTaskStatus): SchemaTaskStatus => {
  switch (gatewayStatus) {
    case 'completed':
      return 'succeed';
    case 'failed':
      return 'failed';
    case 'active':
      return 'in-progress';
    default:
      return 'failed'; // Default to failed for unknown statuses
  }
};

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
      // First update any existing tasks with incorrect status
      await this.repository.updateExistingTaskStatuses(conn);

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
        }).json() as GatewayResponse<any> | any[];

        this.logger.debug('Raw tasks response from gateway:', response);
        
        // Check if response is null or undefined
        if (!response) {
          this.logger.warn('Gateway tasks response is null or undefined');
          return;
        }

        const gatewayTasks = Array.isArray(response) ? response : 
                            (response.data && Array.isArray(response.data)) ? response.data : [];

        if (!Array.isArray(gatewayTasks)) {
          this.logger.warn('Unexpected response format from gateway tasks endpoint. Expected array, got:', 
            typeof gatewayTasks, 'Response structure:', JSON.stringify(response));
          return;
        }
        
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
        }).json() as GatewayResponse<any> | any[];

        this.logger.debug('Raw earnings response from gateway:', response);

        // Check if response is null or undefined
        if (!response) {
          this.logger.warn('Gateway earnings response is null or undefined');
          return;
        }

        // Check if response has a data property that might contain the array
        const gatewayEarnings = Array.isArray(response) ? response :
                               (response.data && Array.isArray(response.data)) ? response.data : [];

        if (!Array.isArray(gatewayEarnings)) {
          this.logger.warn('Unexpected response format from gateway earnings endpoint. Expected array, got:', 
            typeof gatewayEarnings, 'Response structure:', JSON.stringify(response));
          return;
        }
        
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