import { ModelOfMiner, ModelOfOllama } from "@saito/models";

export abstract class MinerService {
  abstract createTask(args: ModelOfMiner<'create_task_request'>): Promise<ModelOfMiner<'task'>>;
  abstract getTask(id: string): Promise<ModelOfMiner<'task'>>;
  abstract getSummary(): Promise<ModelOfMiner<'summary'>>;
  abstract getTaskHistory(page: number, limit: number): Promise<ModelOfMiner<'task_history_response'>>;
  abstract updateTask(id: string, updates: Partial<ModelOfMiner<'task'>>): Promise<ModelOfMiner<'task'>>;
}
