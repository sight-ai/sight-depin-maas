import { DeviceInfo, EarningInfo, JSONType, ModelOfMiner, Statistics, Task } from "@saito/models";
import { MinerService } from "./miner.interface";
import { MinerRepository } from "./miner.repository";
import { Inject } from "@nestjs/common";
export class DefaultMinerService implements MinerService {

  constructor(@Inject(MinerRepository) private readonly repository: MinerRepository) {}

  createTask(args: ModelOfMiner<'create_task_request'>) {
      return this.repository.transaction(async conn => {
        return this.repository.createTask(conn, args);
      })
  }

  getTask(id: string): Promise<ModelOfMiner<'task'>> {
    return this.repository.transaction(async conn => {
      return this.repository.getTask(conn, id);
    })
  }

  async getSummary(): Promise<ModelOfMiner<'summary'>> {
    return this.repository.transaction(async conn => {
      return this.repository.getSummary(conn);
    })
  }

  getTaskHistory(page: number, limit: number) {
    return this.repository.transaction(async conn => {
      return this.repository.getTasks(conn, page, limit);
    })
  }

  updateTask(id: string, updates: Partial<ModelOfMiner<'task'>>) {
    return this.repository.transaction(async conn => {
      return this.repository.updateTask(conn, id, updates);
    })
  }
}

export const MinerServiceProvider = {
  provide: MinerService,
  useClass: DefaultMinerService
}
