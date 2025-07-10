import { Module, forwardRef } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { DashboardController } from "./controllers/dashboard.controller";
import {
  EnhancedSystemMonitorService,
  UnifiedConfigFactoryService,
  EnhancedUnifiedConfigService
} from "@saito/common";

import {DidModule} from "@saito/did"

// 导入应用配置服务
import { AppConfigurationService } from "./services/app-configuration.service";
import { UnifiedModelListService } from "./services/unified-model-list.service";
import { UnifiedHealthService } from "./services/unified-health.service";
import { UnifiedConfigService } from "./services/unified-config.service";


import { TunnelModule } from "@saito/tunnel";
import { TaskSyncModule } from '@saito/task-sync';
import { ModelReportingModule } from "@saito/model-reporting";
import { ModelInferenceClientModule, TUNNEL_SERVICE_TOKEN } from "@saito/model-inference-client";
import { ModelInferenceFrameworkManagementModule } from "@saito/model-inference-framework-management";
import { EarningsTrackingModule } from '@saito/earnings-tracking';
import { Libp2pController } from './controllers/tunnel-libp2p.controller';
import { VllmProcessController } from './controllers/vllm-process.controller';
import { OllamaProcessController } from './controllers/ollama-process.controller';
import { FrameworkConfigController } from './controllers/framework-config.controller';
import { UnifiedConfigController } from './controllers/unified-config.controller';
import { DidController } from './controllers/did.controller';
import { PeerController } from './controllers/peer.controller';


@Module({
  imports: [
    EventEmitterModule.forRoot(),
    forwardRef(() => MinerModule),
    DeviceStatusModule,
    forwardRef(() => TunnelModule), // TunnelModule 必须在 ModelInferenceClientModule 之前
    TaskSyncModule,
    ModelReportingModule,
    ModelInferenceFrameworkManagementModule,
    ModelInferenceClientModule, // 移到 TunnelModule 之后
    EarningsTrackingModule,
    DidModule
  ],
  controllers: [
    IndexController,
    ModelController,
    MinerController,
    DeviceStatusController,
    OpenAIController,
    ModelsController,
    AppConfigController,
    DashboardController,
    Libp2pController,
    VllmProcessController,
    OllamaProcessController,
    FrameworkConfigController,
    UnifiedConfigController,
    DidController,
    PeerController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    // 应用配置服务
    AppConfigurationService,
    // 统一配置管理服务
    UnifiedConfigService,
    // 新的统一配置管理系统
    UnifiedConfigFactoryService,
    EnhancedUnifiedConfigService,
    // 统一模型列表服务
    UnifiedModelListService,
    // 统一健康检查服务
    UnifiedHealthService,
    // 系统监控服务
    EnhancedSystemMonitorService,
    // 为推理服务提供 TunnelService
    {
      provide: TUNNEL_SERVICE_TOKEN,
      useExisting: 'TunnelService',
    },
  ],
})
export class AppModule {}
