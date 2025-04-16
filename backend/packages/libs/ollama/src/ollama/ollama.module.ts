import { Module } from '@nestjs/common';
import { PersistentModule } from '@saito/persistent';
import { OllamaRepository } from './ollama.repository';
import OllamaServiceProvider from './ollama.service';
import { HttpModule } from "@nestjs/axios";
import { MinerModule } from '@saito/miner';
import { DeviceStatusModule } from '@saito/device-status';
import { DeviceStatusService } from '@saito/device-status';

@Module({
  imports: [HttpModule, PersistentModule, MinerModule, DeviceStatusModule],
  providers: [
    OllamaServiceProvider, 
    OllamaRepository,
    {
      provide: 'DEVICE_STATUS_SERVICE',
      useExisting: DeviceStatusService
    }
  ],
  exports: [OllamaServiceProvider, OllamaRepository],
})
export class OllamaModule {}
