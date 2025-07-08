import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LocalConfigService, SystemInfoService } from '@saito/common';
import { VllmProcessManagerService } from './services/vllm-process-manager.service';
import { VllmConfigService } from './services/vllm-config.service';
import { VllmErrorHandlerService } from './services/vllm-error-handler.service';
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

    // 系统信息服务
    SystemInfoService,

    // 资源管理服务
    ResourceManagerService,

    // vLLM 配置服务
    VllmConfigService,

    // vLLM 错误处理服务
    VllmErrorHandlerService,

    // 进程管理服务
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // 框架切换管理
    FrameworkSwitchService
  ],
  exports: [
    // 本地配置服务
    LocalConfigService,

    // 系统信息服务
    SystemInfoService,

    // 资源管理服务
    ResourceManagerService,

    // vLLM 配置服务
    VllmConfigService,

    // vLLM 错误处理服务
    VllmErrorHandlerService,

    // 进程管理服务
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // 框架切换管理
    FrameworkSwitchService
  ]
})
export class ModelInferenceFrameworkManagementModule {}
