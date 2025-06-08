import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FrameworkManagerService } from './framework-manager.service';
import { CleanOllamaService } from './services/clean-ollama.service';
import { CleanVllmService } from './services/clean-vllm.service';
import { VllmProcessManagerService } from './services/vllm-process-manager.service';
import { OllamaProcessManagerService } from './services/ollama-process-manager.service';
import { DynamicModelConfigService } from './services/dynamic-model-config.service';

/**
 * 优化的模型框架模块
 *
 * 特点：
 * 1. 使用抽象基类实现清晰的架构
 * 2. 支持多种推理框架 (Ollama, vLLM)
 * 3. 统一的接口和服务工厂
 * 4. 现代化架构，无遗留兼容性负担
 */
@Global()
@Module({
  imports: [
    HttpModule
  ],
  providers: [
    // 核心架构
    FrameworkManagerService,

    // 优化的服务实现
    CleanOllamaService,
    CleanVllmService,

    // 进程管理器
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // 动态配置服务
    DynamicModelConfigService
  ],
  exports: [
    // 核心架构
    FrameworkManagerService,

    // 优化的服务实现
    CleanOllamaService,
    CleanVllmService,

    // 进程管理器
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // 动态配置服务
    DynamicModelConfigService
  ]
})
export class ModelFrameworkModule {}
