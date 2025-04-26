import { Module, forwardRef } from '@nestjs/common';
import { PersistentModule } from "@saito/persistent";
import { ModelOpenaiServiceProvider } from "./openai.service";
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
    ModelOpenaiServiceProvider
  ],
  exports: [
    ModelOpenaiServiceProvider
  ]
})
export class ModelOpenaiModule {}
