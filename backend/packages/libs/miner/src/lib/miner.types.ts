import { DeviceInfo, EarningInfo, Statistics, Task, Summary, MinerDailyRequests } from '@saito/models';

export type ModelOfMiner<T extends keyof MinerModels> = MinerModels[T];

export interface MinerModels {
  // API请求和响应类型
  create_task_request: {
    model: string;
    device_id?: string;
  };
  
  task: Task;
  
  task_history_response: {
    page: number;
    limit: number;
    total: number;
    tasks: Task[];
  };
  
  minerEarning: {
    total_block_rewards: number;
    total_job_rewards: number;
  };
  
  // 数据库查询类型
  minerDailyRequests: MinerDailyRequests;
  
  // 聚合数据类型
  summary: Summary;
} 