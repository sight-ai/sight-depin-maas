import { Module } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { ModelOpenaiServiceProvider } from "./openai.service";
import { ScheduleModule } from '@nestjs/schedule';
import { OllamaModule, OllamaService } from '@saito/ollama';
import { MinerModule } from '@saito/miner';
import { DeviceStatusModule } from '@saito/device-status';

@Module({
  imports: [
    PersistentModule,
    ScheduleModule.forRoot(),
    OllamaModule,
    MinerModule,
    DeviceStatusModule
  ],
  providers: [
    ModelOpenaiServiceProvider
  ],
  exports: [
    ModelOpenaiServiceProvider
  ]
})
export class ModelOpenaiModule {}
