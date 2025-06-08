import { Module, forwardRef } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { IndexController } from './controllers/index.controller';
import { DeviceStatusModule } from "@saito/device-status";
import { ModelController } from "./controllers/ollama.controller";
import { MinerController } from "./controllers/miner.controller";
import { MinerModule } from "@saito/miner";
import { DeviceStatusController } from "./controllers/device-status.controller";
import { OpenAIController } from "./controllers/openai.controller";
import { ModelsController } from "./controllers/models.controller";
import { UnifiedModelController } from "./controllers/unified-model.controller";
import { ModelConfigController } from "../controllers/model-config.controller";
import { TunnelModule } from "@saito/tunnel";
import { TaskSyncModule } from '@saito/task-sync';
import { ModelReportingModule } from "@saito/model-reporting";
import { ModelFrameworkModule } from "@saito/model-framework";
import { EarningsTrackingModule } from './modules/earnings-tracking.module';
@Module({
  imports: [
    forwardRef(() => MinerModule),
    DeviceStatusModule,
    forwardRef(() => TunnelModule),
    TaskSyncModule,
    ModelReportingModule,
    ModelFrameworkModule,
    EarningsTrackingModule
  ],
  controllers: [
    IndexController,
    ModelController,
    MinerController,
    DeviceStatusController,
    OpenAIController,
    ModelsController,
    UnifiedModelController,
    ModelConfigController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
