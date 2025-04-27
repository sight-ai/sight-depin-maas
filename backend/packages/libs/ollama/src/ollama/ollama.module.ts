import { Module } from '@nestjs/common';
import { PersistentModule } from '@saito/persistent';
import { OllamaRepository } from './ollama.repository';
import OllamaServiceProvider from './ollama.service';
import { HttpModule } from "@nestjs/axios";
import { MinerModule } from '@saito/miner';
import { DeviceStatusModule } from '@saito/device-status';

@Module({
  imports: [
    HttpModule, 
    PersistentModule,
    MinerModule,
    DeviceStatusModule
  ],
  providers: [
    OllamaServiceProvider, 
    OllamaRepository
  ],
  exports: [OllamaServiceProvider, OllamaRepository]
})
export class OllamaModule {}
