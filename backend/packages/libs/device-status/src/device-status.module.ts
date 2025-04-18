import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PersistentModule } from '@saito/persistent';
import { MinerModule } from '@saito/miner';
import { DeviceStatusRepository } from './device-status.repository';
import DeviceStatusServiceProvider from './device-status.service';
import { OllamaModule } from '@saito/ollama';
import { TunnelModule } from '@saito/tunnel';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HttpModule, 
    PersistentModule, 
    forwardRef(() => MinerModule),
    ScheduleModule.forRoot(), 
    forwardRef(() => OllamaModule), 
    forwardRef(() => TunnelModule)
  ],
  providers: [DeviceStatusServiceProvider, DeviceStatusRepository],
  exports: [DeviceStatusServiceProvider, DeviceStatusRepository],
})
export class DeviceStatusModule {}
