import { DeviceInfo, EarningInfo, JSONType, ModelOfMiner, Statistics, Task } from "@saito/models";
import { MinerService } from "./miner.interface";
import { MinerRepository } from "./miner.repository";
import { Inject, forwardRef } from "@nestjs/common";
import { TaskSyncService } from "@saito/task-sync";

export class DefaultMinerService implements MinerService {
  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(forwardRef(() => TaskSyncService)) private readonly taskSyncService: TaskSyncService
  ) {}

  createTask(args: ModelOfMiner<'create_task_request'>) {
    return this.repository.transaction(async conn => {
      return this.repository.createTask(conn, args);
    })
  }

  getTask(id: string): Promise<ModelOfMiner<'task'>> {
    return this.taskSyncService.getTask(id);
  }

  async getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<ModelOfMiner<'summary'>> {
    return this.taskSyncService.getSummary(timeRange);
  }

  getTaskHistory(page: number, limit: number) {
    return this.taskSyncService.getTasks(page, limit);
  }

  updateTask(id: string, updates: Partial<ModelOfMiner<'task'>>) {
    return this.repository.transaction(async conn => {
      return this.repository.updateTask(conn, id, updates);
    })
  }

  createEarnings(blockRewards: number, jobRewards: number): Promise<ModelOfMiner<'minerEarning'>> {
    return this.repository.transaction(async conn => {
      return this.repository.createEarnings(conn, blockRewards, jobRewards);
    })
  }
}

const MinerServiceProvider = {
  provide: MinerService,
  useClass: DefaultMinerService
}

export default MinerServiceProvider;
