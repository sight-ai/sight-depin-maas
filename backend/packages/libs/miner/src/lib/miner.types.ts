export type ModelOfMiner<T extends keyof MinerModels> = MinerModels[T];

export interface MinerModels {
  // ... existing types ...
  minerDailyRequests: {
    request_count: number;
  };
  summary: {
    earning_info: {
      total_block_rewards: number;
      total_job_rewards: number;
    };
    device_info: {
      name: string;
      status: 'connected' | 'disconnected';
    };
    statistics: {
      up_time_percentage: number;
      earning_serials: number[];
      request_serials: number[];
      task_activity: number[];
    };
  };
} 