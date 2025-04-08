import { ModelOfMiner, ModelOfOllama } from "@saito/models";

export abstract class MinerService {
  abstract createTask(args: ModelOfMiner<'create_task_request'>): Promise<ModelOfMiner<'task'>>;
  abstract getTask(id: string): Promise<ModelOfMiner<'task'>>;
  abstract getSummary(timeRange?: { request_serials?: 'daily' | 'weekly' | 'monthly' }, filter?: { year?: string; month?: string; view?: 'Month' | 'Year' }): Promise<ModelOfMiner<'summary'>>;
  abstract getTaskHistory(page: number, limit: number): Promise<ModelOfMiner<'task_history_response'>>;
  abstract updateTask(id: string, updates: Partial<ModelOfMiner<'task'>>): Promise<ModelOfMiner<'task'>>;
  abstract createEarnings(blockRewards: number, jobRewards: number): Promise<ModelOfMiner<'minerEarning'>>;
}
