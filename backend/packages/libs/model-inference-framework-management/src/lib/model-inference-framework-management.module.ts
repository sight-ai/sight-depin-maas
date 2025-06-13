import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LocalConfigService } from '@saito/common';
import { VllmProcessManagerService } from './services/vllm-process-manager.service';
import { OllamaProcessManagerService } from './services/ollama-process-manager.service';
import { FrameworkSwitchService } from './services/framework-switch.service';
import { ResourceManagerService } from './services/resource-manager.service';

/**
 * 模型推理框架管理模块
 *
 */
@Global()
@Module({
  imports: [
    HttpModule
  ],
  providers: [
    // 本地配置服务
    LocalConfigService,

    // 资源管理服务
    ResourceManagerService,

    // 进程管理服务
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // 框架切换管理
    FrameworkSwitchService
  ],
  exports: [
    // 本地配置服务
    LocalConfigService,

    // 资源管理服务
    ResourceManagerService,

    // 进程管理服务
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // 框架切换管理
    FrameworkSwitchService
  ]
})
export class ModelInferenceFrameworkManagementModule {}
