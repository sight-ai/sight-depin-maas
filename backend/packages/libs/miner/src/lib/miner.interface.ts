import { CreateTaskRequest, Task, Summary } from "@saito/models";

export abstract class MinerService {
  abstract createTask(args: CreateTaskRequest): Promise<Task>;
  abstract getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<Summary>;
  
  abstract getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: Task[];
  }>;
  
  abstract updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  abstract createEarnings(blockRewards: number, jobRewards: number, taskId: string, deviceId: string): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }>;
  
  // 新增设备关系方法
  abstract getDeviceTasks(deviceId: string, limit?: number): Promise<Task[]>;
  abstract getDeviceEarnings(deviceId: string, limit?: number): Promise<{
    id: string;
    block_rewards: number;
    job_rewards: number;
    device_id: string;
    task_id: string | null;
    created_at: string;
    updated_at: string;
    source: "local" | "gateway";
  }[]>;
}
