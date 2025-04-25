import { MinerService } from "@saito/miner";
import { TTask, TEarning, TSummary, TCreateTaskRequest, TConnectTaskListRequest } from "@saito/models";

export class MockedMinerService implements MinerService {
  async createTask(args: TCreateTaskRequest): Promise<TTask> {
    return {
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date().toISOString(),
      status: 'pending',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date().toISOString(),
      source: 'local',
      device_id: args.device_id || 'mock-device-id'
    };
  }

  async getTask(id: string): Promise<TTask> {
    return {
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date().toISOString(),
      status: 'pending',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date().toISOString(),
      source: 'local',
      device_id: 'mock-device-id'
    };
  }

  async getSummary(): Promise<TSummary> {
    return {
      earning_info: {
        total_block_rewards: 0,
        total_job_rewards: 0,
      },
      device_info: {
        name: 'unknown',
        status: 'connected'
      },
      statistics: {
        up_time_percentage: 0,
        earning_serials: new Array(30).fill(0),
        task_activity: new Array(30).fill(0),
        request_serials: new Array(30).fill(0)
      },
    };
  }

  async getTaskHistory(page: number, limit: number) {
    return {
      page: 1,
      limit: 1,
      total: 0,
      tasks: []
    };
  }

  async updateTask(id: string, updates: Partial<TTask>): Promise<TTask> {
    return {
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date().toISOString(),
      status: 'pending',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date().toISOString(),
      source: 'local',
      device_id: 'mock-device-id'
    };
  }

  async createEarnings(blockRewards: number, jobRewards: number, taskId: string, deviceId: string): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }> {
    return {
      total_block_rewards: blockRewards,
      total_job_rewards: jobRewards,
    };
  }

  async getDeviceTasks(deviceId: string, limit: number = 10): Promise<TTask[]> {
    return [];
  }

  async getDeviceEarnings(deviceId: string, limit: number = 10): Promise<TEarning[]> {
    return [];
  }

  async connectTaskList(args: TConnectTaskListRequest): Promise<{ success: boolean; error?: string; data?: { data: any[]; total: number } }> {
    return {
      success: true,
      data: {
        data: [],
        total: 0
      }
    };
  }
}
