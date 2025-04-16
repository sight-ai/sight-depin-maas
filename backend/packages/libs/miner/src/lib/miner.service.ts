import { DeviceInfo, EarningInfo, JSONType, ModelOfMiner, Statistics, Task } from "@saito/models";
import { MinerService } from "./miner.interface";
import { MinerRepository } from "./miner.repository";
import { Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceStatusService } from "@saito/device-status";
export class DefaultMinerService implements MinerService {
  private readonly logger = new Logger(DefaultMinerService.name);

  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
  ) {}

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
    return this.repository.transaction(async conn => {
      const deviceId = await this.deviceStatusService.getDeviceId();
      return this.repository.getSummary(conn, timeRange, deviceId);
    });
  }

  async getTaskHistory(page: number, limit: number) {
    return this.repository.transaction(async conn => {
      const deviceId = await this.deviceStatusService.getDeviceId();
      return this.repository.getTasks(conn, page, limit, deviceId);
    });
  }

  updateTask(id: string, updates: Partial<ModelOfMiner<'task'>>) {
    return this.repository.transaction(async conn => {
      return this.repository.updateTask(conn, id, updates);
    })
  }

  createEarnings(blockRewards: number, jobRewards: number): Promise<ModelOfMiner<'minerEarning'>> {
    return this.repository.transaction(async conn => {
      const deviceId = await this.deviceStatusService.getDeviceId();
      return this.repository.createEarnings(conn, blockRewards, jobRewards, deviceId);
    })
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleStaleInProgressTasks() {
    try {
      const updatedTasks = await this.repository.transaction(async conn => {
        return this.repository.updateStaleInProgressTasks(conn, 5);
      });
      
      if (updatedTasks.length > 0) {
        this.logger.log(`Updated ${updatedTasks.length} stale in-progress tasks to failed status`);
      }
    } catch (error) {
      this.logger.error('Failed to update stale tasks', error);
    }
  }
}

const MinerServiceProvider = {
  provide: MinerService,
  useClass: DefaultMinerService
}

export default MinerServiceProvider;

