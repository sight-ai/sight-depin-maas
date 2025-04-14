import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { TaskSyncService, TASK_SYNC_SERVICE } from "./task-sync.interface";
import { ModelOfMiner } from "@saito/models";
import got from "got-cjs";
import { env } from "../../env";
import { TaskSyncRepository } from "./task-sync.repository";
import { DeviceStatusService } from "@saito/device-status";
@Injectable()
export class DefaultTaskSyncService implements TaskSyncService {
  constructor(
    @Inject(forwardRef(() => MinerService))
    private readonly minerService: MinerService,
    private readonly repository: TaskSyncRepository,
    private readonly deviceStatusService: DeviceStatusService
  ) {}


}

const TaskSyncServiceProvider = {
  provide: TASK_SYNC_SERVICE,
  useClass: DefaultTaskSyncService
};

export default TaskSyncServiceProvider; 