import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PersistentModule } from '@saito/persistent'; // 假设你有持久化模块
import { MinerModule } from '@saito/miner'; // 假设有矿工任务模块
import { DeviceStatusRepository } from './device-status.repository';
import { DeviceStatusService } from './device-status.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [HttpModule, PersistentModule, MinerModule,  ScheduleModule.forRoot()],
  providers: [DeviceStatusService, DeviceStatusRepository],
  exports: [DeviceStatusService],
})
export class DeviceStatusModule { }
