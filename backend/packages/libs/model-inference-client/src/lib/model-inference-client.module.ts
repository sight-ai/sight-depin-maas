import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LocalConfigService } from '@saito/common';
import { OllamaClientService } from './client-services/ollama-client.service';
import { VllmClientService } from './client-services/vllm-client.service';
import { DynamicModelConfigService } from './model-operations/dynamic-model-config.service';
import { DynamicModelClientProvider, ACTIVE_MODEL_CLIENT } from './client-services/dynamic-client.provider';
import { UnifiedModelService } from './client-services/unified-model.service';
import { ClientSwitchService } from './client-services/client-switch.service';

// 聊天处理器 (按业务功能命名)
import { OllamaChatHandler } from './chat-handlers/ollama-chat.handler';
import { VllmChatHandler } from './chat-handlers/vllm-chat.handler';

// 健康检查器
import { OllamaHealthChecker } from './health-checkers/ollama-health.checker';
import { VllmHealthChecker } from './health-checkers/vllm-health.checker';

// 模型信息服务
import { OllamaModelInfoService } from './model-info-services/ollama-model-info.service';

// 请求调度器
import { OllamaRequestDispatcher } from './request-dispatchers/ollama-request.dispatcher';
import { VllmRequestDispatcher } from './request-dispatchers/vllm-request.dispatcher';

/**
 * 模型推理客户端模块
 *
 * 重要：此模块只包含调用 ollama/vllm 推理功能的逻辑
 * 不包含配置管理、进程管理等逻辑（这些在 model-inference-framework-management 模块）
 *
 * 特点：
 * 1. 专注于与推理服务的客户端通信
 * 2. 支持多种推理框架 (Ollama, vLLM)
 * 3. 基于配置文件的动态客户端注入
 * 4. 使用 NestJS useFactory 模式，无需自定义注册逻辑
 * 5. 按业务功能组织目录结构，避免 abstracts/interfaces 文件夹
 */
@Global()
@Module({
  imports: [
    HttpModule
  ],
  providers: [
    // 本地配置服务
    LocalConfigService,

    // 客户端服务实现
    OllamaClientService,
    VllmClientService,

    // 聊天处理器 (按业务功能命名)
    OllamaChatHandler,
    VllmChatHandler,

    // 健康检查器
    OllamaHealthChecker,
    VllmHealthChecker,

    // 模型信息服务
    OllamaModelInfoService,

    // 请求调度器
    OllamaRequestDispatcher,
    VllmRequestDispatcher,

    // 动态配置服务
    DynamicModelConfigService,

    // 动态客户端提供者 (根据配置文件选择客户端)
    DynamicModelClientProvider,

    // 统一模型服务 (使用动态客户端)
    UnifiedModelService,

    // 客户端切换服务
    ClientSwitchService
  ],
  exports: [
    // 本地配置服务
    LocalConfigService,

    // 客户端服务实现
    OllamaClientService,
    VllmClientService,

    // 聊天处理器 (按业务功能命名)
    OllamaChatHandler,
    VllmChatHandler,

    // 健康检查器
    OllamaHealthChecker,
    VllmHealthChecker,

    // 模型信息服务
    OllamaModelInfoService,

    // 请求调度器
    OllamaRequestDispatcher,
    VllmRequestDispatcher,

    // 动态配置服务
    DynamicModelConfigService,

    // 活跃的模型客户端 (动态选择)
    ACTIVE_MODEL_CLIENT,

    // 统一模型服务 (使用动态客户端)
    UnifiedModelService,

    // 客户端切换服务
    ClientSwitchService
  ]
})
export class ModelInferenceClientModule {}
