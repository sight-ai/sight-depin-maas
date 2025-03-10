import { DeviceInfo, EarningInfo, JSONType, ModelOfMiner, Statistics } from "@saito/models";
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
    return Promise.resolve({
      earning_info: {total_block_rewards: 0,
        total_job_rewards: 0},
      device_info: {
        name: 'Macbook 9999',
        status: 'connected'
      },
      statistics: {
        up_time_percentage: 0,
        earning_serials: new Array(30).fill(0)
      },
    })
  }

  getTaskHistory(page: number, limit: number) {
    return this.repository.transaction(async conn => {
      return this.repository.getTasks(conn, page, limit);
    })
  }

}

export const MinerServiceProvider = {
  provide: MinerService,
  useClass: DefaultMinerService
}
