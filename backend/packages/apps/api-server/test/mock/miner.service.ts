import { MinerService } from "@saito/miner";
import { m, ModelOfMiner } from "@saito/models";

export class MockedMinerService implements MinerService {

  createTask(args: ModelOfMiner<'create_task_request'>): Promise<ModelOfMiner<'task'>> {
    return Promise.resolve(
      m.miner('task').parse({
      id: 'mock-1',
      model: 'deepscaler',
      created_at: new Date(),
      status: 'in-progress',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      updated_at: new Date(),
      source: 'local',
      device_id: args.device_id || 'mock-device-id'
    }));
  }

  getTask(id: string): Promise<ModelOfMiner<'task'>> {
    return Promise.resolve(
      m.miner('task').parse({
        id: 'mock-1',
        model: 'deepscaler',
        created_at: new Date(),
        status: 'in-progress',
        total_duration: 0,
        load_duration: 0,
        prompt_eval_count: 0,
        prompt_eval_duration: 0,
        eval_count: 0,
        eval_duration: 0,
        updated_at: new Date()
      }));
  }

  async getSummary(): Promise<ModelOfMiner<'summary'>> {
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
    })
  }

  getTaskHistory(page: number, limit: number) {
    return Promise.resolve({
      page: 1,
      limit: 1,
      total: 0, // Total number of tasks across all pages
      tasks: []
    });
  }

  updateTask(id: string, updates: Partial<ModelOfMiner<'task'>>) {
    return Promise.resolve(
      m.miner('task').parse({
        id: 'mock-1',
        model: 'deepscaler',
        created_at: new Date(),
        status: 'in-progress',
        total_duration: 0,
        load_duration: 0,
        prompt_eval_count: 0,
        prompt_eval_duration: 0,
        eval_count: 0,
        eval_duration: 0,
        updated_at: new Date(),
        source: 'local',
        device_id: 'mock-device-id'
      }));
  }

  createEarnings(blockRewards: number, jobRewards: number, device_id?: string): Promise<ModelOfMiner<'minerEarning'>> {
    return Promise.resolve({
      total_block_rewards: 0,
      total_job_rewards: 0,
    })
  }
}
