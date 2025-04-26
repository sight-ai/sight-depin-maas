import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { ModelDeepSeekServiceProvider } from "./deepseek.service";
import { ScheduleModule } from '@nestjs/schedule';
import { OllamaModule, OllamaService } from '@saito/ollama';

@Module({
  imports: [
    PersistentModule,
    ScheduleModule.forRoot(),
    OllamaModule
  ],
  providers: [
    {
      provide: 'OLLAMA_SERVICE',
      useExisting: OllamaService
    },
    {
      provide: 'DEEPSEEK_API_KEY',
      useValue: process.env.DEEPSEEK_API_KEY
    },
    ModelDeepSeekServiceProvider
  ],
  exports: [
    ModelDeepSeekServiceProvider
  ]
})
export class ModelDeepSeekModule {}
