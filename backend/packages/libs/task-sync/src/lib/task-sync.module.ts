import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { MinerModule } from "@saito/miner";
import TaskSyncServiceProvider from "./task-sync.service";
import { TaskSyncRepository } from "./task-sync.repository";

@Module({
  imports: [
    PersistentModule,
    forwardRef(() => MinerModule)
  ],
  providers: [TaskSyncServiceProvider, TaskSyncRepository],
  exports: [TaskSyncServiceProvider]
})
export class TaskSyncModule {} 