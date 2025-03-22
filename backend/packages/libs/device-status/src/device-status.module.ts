import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PersistentModule } from '@saito/persistent'; 
import { MinerModule } from '@saito/miner';
import { DeviceStatusRepository } from './device-status.repository';
import DeviceStatusServiceProvider from './device-status.service';
import { OllamaModule, DefaultOllamaService } from '@saito/ollama';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [HttpModule, PersistentModule, MinerModule,  ScheduleModule.forRoot(), OllamaModule],
  providers: [DeviceStatusServiceProvider, DeviceStatusRepository, DefaultOllamaService],
  exports: [DeviceStatusServiceProvider],
})
export class DeviceStatusModule { }
