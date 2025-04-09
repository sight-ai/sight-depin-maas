import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { DeviceStatusService } from "@saito/device-status";
import { TaskSyncService } from "./task-sync.interface";
import { ModelOfMiner } from "@saito/models";
import got from "got-cjs";
import { env } from "../../env";

@Injectable()
export class DefaultTaskSyncService implements TaskSyncService {
  constructor(
    @Inject(forwardRef(() => MinerService))
    private readonly minerService: MinerService,
    @Inject(DeviceStatusService)
    private readonly deviceStatusService: DeviceStatusService
  ) {}

  private convertTaskDates(task: any) {
    return {
      ...task,
      created_at: new Date(task.created_at),
      updated_at: new Date(task.updated_at)
    };
  }

  async getTask(id: string): Promise<ModelOfMiner<'task'>> {
    const { isRegistered } = await this.deviceStatusService.getGatewayStatus();
    const deviceId = await this.deviceStatusService.getDeviceId();
    if (!isRegistered) {
      return this.minerService.getTask(id);
    }

    try {
      // Try to get task from gateway first
      const { data } = await got.get(`${env().GATEWAY_API_URL}/tasks?id=${id}&deviceId=${deviceId}`, {
        headers: {
          'Authorization': `Bearer ${env().GATEWAY_API_KEY}`
        }
      }).json() as { data: ModelOfMiner<'task'> };

      const convertedTask = this.convertTaskDates(data);
      // Update local task with gateway data
      await this.minerService.updateTask(id, convertedTask);
      
      return convertedTask;
    } catch (error) {
      // If gateway request fails, fallback to local
      return this.minerService.getTask(id);
    }
  }

  async getTasks(page: number, limit: number) {
    const { isRegistered } = await this.deviceStatusService.getGatewayStatus();
    const deviceId = await this.deviceStatusService.getDeviceId();
    if (!isRegistered) {
      return this.minerService.getTaskHistory(page, limit);
    }

    try {
      // Try to get tasks from gateway first
      const { data } = await got.get(`${env().GATEWAY_API_URL}/tasks?deviceId=${deviceId}`, {
        headers: {
          'Authorization': `Bearer ${env().GATEWAY_API_KEY}`
        },
        searchParams: {
          page,
          limit
        }
      }).json() as { data: { tasks: ModelOfMiner<'task'>[]; total: number } };

      const convertedTasks = data.tasks.map(task => this.convertTaskDates(task));
      // Sync all tasks to local database
      await Promise.all(
        convertedTasks.map(task => 
          this.minerService.updateTask(task.id, task)
        )
      );
      
      return {
        page,
        limit,
        total: data.total,
        tasks: convertedTasks
      };
    } catch (error) {
      // If gateway request fails, fallback to local
      return this.minerService.getTaskHistory(page, limit);
    }
  }

  async syncTasksFromGateway(): Promise<void> {
    const { isRegistered } = await this.deviceStatusService.getGatewayStatus();
    const deviceId = await this.deviceStatusService.getDeviceId();
    if (!isRegistered) {
      return;
    }

    try {
      // Get all tasks from gateway
      const { data } = await got.get(`${env().GATEWAY_API_URL}/tasks/all?deviceId=${deviceId}`, {
        headers: {
          'Authorization': `Bearer ${env().GATEWAY_API_KEY}`
        }
      }).json() as { data: ModelOfMiner<'task'>[] };

      const convertedTasks = data.map(task => this.convertTaskDates(task));
      // Update all tasks in local database
      await Promise.all(
        convertedTasks.map(task => 
          this.minerService.updateTask(task.id, task)
        )
      );
    } catch (error) {
      console.error('Failed to sync tasks from gateway:', error);
    }
  }

  async getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<ModelOfMiner<'summary'>> {
    const { isRegistered } = await this.deviceStatusService.getGatewayStatus();
    const deviceId = await this.deviceStatusService.getDeviceId();
    if (!isRegistered) {
      return this.minerService.getSummary(timeRange);
    }

    try {
      // Try to get summary from gateway first
      const params = new URLSearchParams();
      if (timeRange?.request_serials) {
        params.append('request_serials', timeRange.request_serials);
      }
      if (timeRange?.filteredTaskActivity?.year) {
        params.append('year', timeRange.filteredTaskActivity.year);
      }
      if (timeRange?.filteredTaskActivity?.month) {
        params.append('month', timeRange.filteredTaskActivity.month);
      }
      if (timeRange?.filteredTaskActivity?.view) {
        params.append('view', timeRange.filteredTaskActivity.view);
      }

      const url = `${env().GATEWAY_API_URL}/summary?deviceId=${deviceId}${params.toString() ? '&' + params.toString() : ''}`;
      
      const { data } = await got.get(url, {
        headers: {
          'Authorization': `Bearer ${env().GATEWAY_API_KEY}`
        }
      }).json() as { data: ModelOfMiner<'summary'> };
      
      return data;
    } catch (error) {
      console.error('Failed to get summary from gateway:', error);
      // If gateway request fails, fallback to local
      return this.minerService.getSummary(timeRange);
    }
  }
}

const TaskSyncServiceProvider = {
  provide: TaskSyncService,
  useClass: DefaultTaskSyncService
};

export default TaskSyncServiceProvider; 