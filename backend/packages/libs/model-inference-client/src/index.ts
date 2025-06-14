// =============================================================================
// Model Inference Client Library - Clean Architecture
// 只包含调用 ollama/vllm 推理功能的逻辑，不包含配置管理、进程管理等
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types (已迁移到 @saito/models，保留向后兼容的重新导出)
// -----------------------------------------------------------------------------
export type {
  RequestType,
  RequestContext,
  DetailedHealthCheckResult,
  OpenAIChatMessage,
  ClientOperationResult,
  ClientConfig,
  ClientStatus,
  ChatRequest,
  CompletionRequest,
  EmbeddingsRequest,
  EmbeddingsResponse
} from '@saito/models';

export type {
  FrameworkConfig,
  FrameworkStatus,
  FrameworkHealthStatus,
  LegacyFrameworkDetectionResult,
  EnhancedFrameworkDetectionResult,
  FrameworkSwitchOptions,
  UnifiedApiResponse,
  UnifiedModelInfo,
  UnifiedModelList,
  FrameworkSwitchResult,
  FrameworkCapabilities,
  FrameworkPerformanceMetrics
} from '@saito/models';

// ModelFramework 枚举已迁移到 @saito/models
export { ModelFramework } from '@saito/models';

// -----------------------------------------------------------------------------
// Client Services (主要客户端服务)
// -----------------------------------------------------------------------------
export * from './lib/client-services/ollama-client.service';
export * from './lib/client-services/vllm-client.service';
export * from './lib/client-services/model-service.interface';
export * from './lib/client-services/dynamic-client.provider';
export * from './lib/client-services/unified-model.service';
export * from './lib/client-services/client-switch.service';

// -----------------------------------------------------------------------------
// Chat Handlers (聊天处理器 - 按业务功能命名)
// -----------------------------------------------------------------------------
export * from './lib/chat-handlers/ollama-chat.handler';
export * from './lib/chat-handlers/vllm-chat.handler';

// -----------------------------------------------------------------------------
// Health Checkers (健康检查器)
// -----------------------------------------------------------------------------
export * from './lib/health-checkers/ollama-health.checker';
export * from './lib/health-checkers/vllm-health.checker';

// -----------------------------------------------------------------------------
// Model Info Services (模型信息服务)
// -----------------------------------------------------------------------------
export * from './lib/model-info-services/ollama-model-info.service';

// -----------------------------------------------------------------------------
// Request Dispatchers (请求调度器)
// -----------------------------------------------------------------------------
export * from './lib/request-dispatchers/ollama-request.dispatcher';
export * from './lib/request-dispatchers/vllm-request.dispatcher';

// -----------------------------------------------------------------------------
// Model Operations
// -----------------------------------------------------------------------------
export * from './lib/model-operations/dynamic-model-config.service';
// request-response.types 已迁移到 @saito/models

// -----------------------------------------------------------------------------
// Models (Zod schemas) - 注意：根据规范，这些应该移到 models 模块
// -----------------------------------------------------------------------------
// 模型定义已迁移到 @saito/models 模块

// -----------------------------------------------------------------------------
// Module
// -----------------------------------------------------------------------------
export * from './lib/model-inference-client.module';
