import { MinerService } from "@saito/miner";
import { m, ModelOfMiner, Task, Earning, Summary } from "@saito/models";

export class MockedMinerService implements MinerService {

  createTask(args: ModelOfMiner<'CreateTaskRequestSchema'>): Promise<Task> {
    const result = m.miner('TaskSchema').parse({
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date().toISOString(),
      status: 'in-progress',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date().toISOString(),
      source: 'local',
      device_id: args.device_id || 'mock-device-id'
    });
    return Promise.resolve(result);
  }

  getTask(id: string): Promise<Task> {
    const result = m.miner('TaskSchema').parse({
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date().toISOString(),
      status: 'in-progress',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date().toISOString()
    });
    return Promise.resolve(result);
  }

  async getSummary(): Promise<Summary> {
    return Promise.resolve({
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
    } as Summary);
  }

  getTaskHistory(page: number, limit: number) {
    return Promise.resolve({
      page: 1,
      limit: 1,
      total: 0,
      tasks: []
    });
  }

  updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const result = m.miner('TaskSchema').parse({
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date().toISOString(),
      status: 'in-progress',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date().toISOString(),
      source: 'local',
      device_id: 'mock-device-id'
    });
    return Promise.resolve(result);
  }

  createEarnings(blockRewards: number, jobRewards: number, taskId: string, deviceId: string): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }> {
    return Promise.resolve({
      total_block_rewards: blockRewards,
      total_job_rewards: jobRewards,
    });
  }

  getDeviceTasks(deviceId: string, limit: number = 10): Promise<Task[]> {
    return Promise.resolve([]);
  }

  getDeviceEarnings(deviceId: string, limit: number = 10): Promise<Earning[]> {
    return Promise.resolve([]);
  }
}
