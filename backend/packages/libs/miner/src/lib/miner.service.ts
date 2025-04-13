import { DeviceInfo, EarningInfo, JSONType, ModelOfMiner, Statistics, Task } from "@saito/models";
import { MinerService } from "./miner.interface";
import { MinerRepository } from "./miner.repository";
import { Inject, forwardRef } from "@nestjs/common";
import { TaskSyncService } from "@saito/task-sync";
import { DeviceStatusService } from "@saito/device-status";
import { DatabaseTransactionConnection } from "slonik";

export class DefaultMinerService implements MinerService {
  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(forwardRef(() => TaskSyncService)) private readonly taskSyncService: TaskSyncService,
    @Inject(forwardRef(() => DeviceStatusService)) private readonly deviceStatusService: DeviceStatusService
  ) {}

  private async shouldUseGateway() {
    const { isRegistered } = await this.deviceStatusService.getGatewayStatus();
    console.log('isRegistered', isRegistered);
    return isRegistered;
  }

  createTask(args: ModelOfMiner<'create_task_request'>) {
    return this.repository.transaction(async conn => {
      return this.repository.createTask(conn, args);
    })
  }

  async getSummary(timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    }
  }): Promise<ModelOfMiner<'summary'>> {
    if (await this.shouldUseGateway()) {
      return this.taskSyncService.getSummary(timeRange);
    }
    return this.repository.transaction(async conn => {
      return this.repository.getSummary(conn, timeRange);
    });
  }

  async getTaskHistory(page: number, limit: number) {
    if (await this.shouldUseGateway()) {
      return this.taskSyncService.getTasks(page, limit);
    }
    return this.repository.transaction(async conn => {
      return this.repository.getTasks(conn, page, limit);
    });
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
