import { 
  ModelOfMiner
} from "@saito/models";

export abstract class MinerService {
  abstract createTask(args: ModelOfMiner<'CreateTaskRequest'>): Promise<ModelOfMiner<'Task'>>;
  abstract getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<ModelOfMiner<'Summary'>>;
  
  abstract getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: ModelOfMiner<'Task'>[];
  }>;
  
  abstract updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>>;
  abstract createEarnings(
    blockRewards: number, 
    jobRewards: number, 
    taskId: string, 
    deviceId: string
  ): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }>;
  
  // 新增设备关系方法
  abstract getDeviceTasks(deviceId: string, limit?: number): Promise<ModelOfMiner<'Task'>[]>;
  abstract getDeviceEarnings(deviceId: string, limit?: number): Promise<ModelOfMiner<'Earning'>[]>;

  abstract connectTaskList(body: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>>;
}
