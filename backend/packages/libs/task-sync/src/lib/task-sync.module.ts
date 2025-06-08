import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PersistentModule } from "@saito/persistent";
import { DeviceStatusModule } from '@saito/device-status';
import TaskSyncServiceProvider from "./task-sync.service";
import TaskManagerServiceProvider from "./task-manager.service";
import EarningsManagerServiceProvider from "./earnings-manager.service";
import GatewayClientServiceProvider from "./gateway-client.service";
import { TaskSyncRepository } from "./task-sync.repository";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PersistentModule,
    forwardRef(() => DeviceStatusModule),
  ],
  providers: [
    TaskSyncServiceProvider,
    TaskManagerServiceProvider,
    EarningsManagerServiceProvider,
    GatewayClientServiceProvider,
    TaskSyncRepository
  ],
  exports: [
    TaskSyncServiceProvider,
    TaskManagerServiceProvider,
    EarningsManagerServiceProvider,
    GatewayClientServiceProvider,
    TaskSyncRepository
  ]
})
export class TaskSyncModule {}