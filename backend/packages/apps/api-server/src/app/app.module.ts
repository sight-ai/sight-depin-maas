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
import { AppConfigController } from "./controllers/app-config.controller";

// 导入应用配置服务
import { AppConfigurationService } from "./services/app-configuration.service";


import { TunnelModule } from "@saito/tunnel";
import { TaskSyncModule } from '@saito/task-sync';
import { ModelReportingModule } from "@saito/model-reporting";
import { ModelInferenceClientModule } from "@saito/model-inference-client";
import { ModelInferenceFrameworkManagementModule } from "@saito/model-inference-framework-management";
import { EarningsTrackingModule } from '@saito/earnings-tracking';
@Module({
  imports: [
    forwardRef(() => MinerModule),
    DeviceStatusModule,
    forwardRef(() => TunnelModule),
    TaskSyncModule,
    ModelReportingModule,
    ModelInferenceClientModule,
    ModelInferenceFrameworkManagementModule,
    EarningsTrackingModule
  ],
  controllers: [
    IndexController,
    ModelController,
    MinerController,
    DeviceStatusController,
    OpenAIController,
    ModelsController,
    AppConfigController,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    // 应用配置服务
    AppConfigurationService,
  ],
})
export class AppModule {}
