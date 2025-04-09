import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { DeviceStatusModule } from "@saito/device-status";
import { MinerModule } from "@saito/miner";
import TaskSyncServiceProvider from "./task-sync.service";

@Module({
  imports: [
    PersistentModule,
    forwardRef(() => DeviceStatusModule),
    forwardRef(() => MinerModule)
  ],
  providers: [TaskSyncServiceProvider],
  exports: [TaskSyncServiceProvider]
})
export class TaskSyncModule {} 