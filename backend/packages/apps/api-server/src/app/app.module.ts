import { Module, forwardRef } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { IndexController } from './controllers/index.controller';
import { OllamaModule } from "@saito/ollama";
import { DeviceStatusModule } from "@saito/device-status";
import { ModelController } from "./controllers/model.controller";
import { MinerController } from "./controllers/miner.controller";
import { MinerModule } from "@saito/miner";
import { DeviceStatusController } from "./controllers/device-status.controller";
import { OpenAIController } from "./controllers/openai.controller";
import { ModelsController } from "./controllers/models.controller";
import { TunnelModule } from "@saito/tunnel";
import { TaskSyncModule } from '@saito/task-sync';
import { ModelReportingModule } from "@saito/model-reporting";
@Module({
  imports: [
    forwardRef(() => OllamaModule),
    forwardRef(() => MinerModule),
    DeviceStatusModule,
    forwardRef(() => TunnelModule),
    TaskSyncModule,
    ModelReportingModule
  ],
  controllers: [IndexController, ModelController, MinerController, DeviceStatusController, OpenAIController, ModelsController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
