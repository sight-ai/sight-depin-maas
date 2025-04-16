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
          
          // Ensure task has all required fields and proper status mapping
          const taskWithDevice = {
            ...task,
            // Map gateway status to local status format if needed
            device_id: deviceId // Add device_id to the task object
          };

          if (exists) {
            // Update existing task with new data
            await this.repository.updateExistingTask(conn, taskWithDevice);
          } else {
            // Create new task
            await this.repository.createTask(conn, taskWithDevice);
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
          
          // Ensure earning has all required fields
          const earningWithDevice = {
            ...earning,
            device_id: deviceId // Add device_id to the earning object
          };

          if (exists) {
            // Update existing earning with new data
            await this.repository.updateExistingEarning(conn, earningWithDevice);
          } else {
            // Create new earning
            await this.repository.createEarning(conn, earningWithDevice);
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