import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { MinerModule } from "@saito/miner";
import TaskSyncServiceProvider from "./task-sync.service";
import { TaskSyncRepository } from "./task-sync.repository";
import { DeviceStatusModule } from '@saito/device-status';
@Module({
  imports: [
    PersistentModule,
    forwardRef(() => DeviceStatusModule),
    forwardRef(() => MinerModule),
  ],
  providers: [TaskSyncServiceProvider, TaskSyncRepository],
  exports: [TaskSyncServiceProvider]
})
export class TaskSyncModule {} 