import { 
  TCreateTaskRequest, 
  TTask, 
  TSummary, 
  TEarning,
  TConnectTaskListRequest,
  TConnectTaskListResponse
} from "@saito/models";

export abstract class MinerService {
  abstract createTask(args: TCreateTaskRequest): Promise<TTask>;
  abstract getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<TSummary>;
  
  abstract getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: TTask[];
  }>;
  
  abstract updateTask(id: string, updates: Partial<TTask>): Promise<TTask>;
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
  abstract getDeviceTasks(deviceId: string, limit?: number): Promise<TTask[]>;
  abstract getDeviceEarnings(deviceId: string, limit?: number): Promise<TEarning[]>;

  abstract connectTaskList(body: TConnectTaskListRequest): Promise<TConnectTaskListResponse>;
}
