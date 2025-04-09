import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { TaskSyncModule } from "@saito/task-sync";
import { DeviceStatusModule } from "@saito/device-status";
import MinerServiceProvider from "./miner.service";
import { MinerRepository } from "./miner.repository";

@Module({
  imports: [
    PersistentModule,
    forwardRef(() => TaskSyncModule),
    DeviceStatusModule
  ],
  providers: [
    MinerServiceProvider,
    MinerRepository
  ],
  exports: [
    MinerServiceProvider
  ]
})
export class MinerModule {}
