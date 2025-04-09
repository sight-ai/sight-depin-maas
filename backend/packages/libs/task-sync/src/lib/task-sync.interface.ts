import { ModelOfMiner } from "@saito/models";

export abstract class TaskSyncService {
  abstract getTask(id: string): Promise<ModelOfMiner<'task'>>;
  abstract syncTasksFromGateway(): Promise<void>;
  abstract getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<ModelOfMiner<'summary'>>;
  abstract getTasks(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: Array<{
      status: "in-progress" | "failed" | "succeed";
      id: string;
      model: string;
      created_at: Date;
      updated_at: Date;
      total_duration?: number;
      load_duration?: number;
      prompt_eval_count?: number;
      prompt_eval_duration?: number;
      eval_count?: number;
      eval_duration?: number;
    }>;
  }>;
} 