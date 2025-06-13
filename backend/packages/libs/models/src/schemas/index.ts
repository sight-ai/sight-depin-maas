/**
 * 统一的 Schema 导出文件
 * 
 * 集中管理所有 Zod schemas，确保类型安全和运行时验证一致性
 */

// =============================================================================
// Ollama Schemas
// =============================================================================
export * from './ollama/ollama-chat.schema';
export * from './ollama/ollama-model.schema';

// =============================================================================
// OpenAI Schemas
// =============================================================================
export * from './openai/openai-chat.schema';

// =============================================================================
// Client Schemas (从 types 文件夹迁移而来)
// =============================================================================
export * from './client/client-types.schema';
export * from './client/framework-types.schema';
export * from './client/request-response.schema';

// =============================================================================
// Configuration Schemas
// =============================================================================
export * from './config/framework-config.schema';

export * from './config/app-config.schema';

// =============================================================================
// System Schemas
// =============================================================================
export * from './system/system-info.schema';

// =============================================================================
// OpenAI API Schemas
// =============================================================================
export * from './openai/openai-chat.schema';

// =============================================================================
// Tunnel Schemas
// =============================================================================
export * from './tunnel/tunnel-message.schema';

// =============================================================================
// Schema Collections (便于批量导入)
// =============================================================================
import { OllamaChatSchemas } from './ollama/ollama-chat.schema';
import { OllamaModelSchemas } from './ollama/ollama-model.schema';
import { OpenAIChatSchemas } from './openai/openai-chat.schema';
import { FrameworkConfigSchemas } from './config/framework-config.schema';
import { AppConfigSchemas } from './config/app-config.schema';
import { SystemInfoSchemas } from './system/system-info.schema';
import { ClientSchemas } from './client/client-types.schema';
import { FrameworkSchemas } from './client/framework-types.schema';
import { RequestResponseSchemas } from './client/request-response.schema';
import { TunnelMessageSchemas } from './tunnel/tunnel-message.schema';

export const AllSchemas = {
  Ollama: {
    Chat: OllamaChatSchemas,
    Model: OllamaModelSchemas
  },
  OpenAI: {
    Chat: OpenAIChatSchemas
  },
  Config: {
    Framework: FrameworkConfigSchemas,
    App: AppConfigSchemas
  },
  System: {
    Info: SystemInfoSchemas
  },
  Client: {
    Types: ClientSchemas,
    Framework: FrameworkSchemas,
    RequestResponse: RequestResponseSchemas
  },
  Tunnel: {
    Message: TunnelMessageSchemas
  }
} as const;

// =============================================================================
// 常用 Schema 快捷导出
// =============================================================================
export {
  // Ollama Chat
  OllamaChatRequestSchema,
  OllamaChatResponseSchema,
  OllamaGenerateRequestSchema,
  OllamaGenerateResponseSchema
} from './ollama/ollama-chat.schema';

export {
  // Ollama Models
  OllamaModelListSchema,
  OllamaModelInfoSchema
} from './ollama/ollama-model.schema';

export {
  // OpenAI
  OpenAIChatCompletionRequestSchema,
  OpenAIChatCompletionResponseSchema,
  OpenAICompletionRequestSchema,
  OpenAICompletionResponseSchema
} from './openai/openai-chat.schema';

export {
  // Config
  FrameworkConfigSchema,
  AppConfigSchema,
  OllamaConfigSchema,
  VllmConfigSchema
} from './config/framework-config.schema';

export {
  // System
  SystemInfoSchema,
  SystemHeartbeatDataSchema,
  DeviceStatusSchema,
  SystemInfoCollectorConfigSchema,
  // 导出类型
  SystemInfo,
  SystemHeartbeatData,
  SystemInfoCollectorConfig
} from './system/system-info.schema';

export {
  // Client Types - 枚举和类型
  RequestType,
  RequestTypeSchema,
  RequestContextSchema,
  // 导出类型
  RequestContext,
  DetailedHealthCheckResult,
  ClientChatMessage,
  ClientOperationResult,
  ClientConfig,
  ClientStatus,
  // 导出接口
  IRequestDispatcher,
  IChatHandler,
  IHealthChecker,
  IModelInfoService
} from './client/client-types.schema';

export {
  // Tunnel Messages
  TunnelMessageSchema,
  PingMessageSchema,
  PongMessageSchema,
  ContextPingMessageSchema,
  ContextPongMessageSchema,
  TaskRequestMessageSchema,
  TaskResponseMessageSchema,
  TaskStreamMessageSchema,
  DeviceRegistrationMessageSchema,
  DeviceRegisterAckMessageSchema,
  ChatRequestStreamMessageSchema,
  ChatResponseStreamSchema,
  // 导出类型
  TunnelMessage,
  PingMessage,
  PongMessage,
  ContextPingMessage,
  ContextPongMessage,
  TaskRequestMessage,
  TaskResponseMessage,
  TaskStreamMessage,
  DeviceRegistrationMessage,
  DeviceRegisterAckMessage,
  ChatRequestStreamMessage,
  ChatResponseStreamMessage
} from './tunnel/tunnel-message.schema';

export {
  // Framework Types - 枚举和类型
  ModelFramework,
  ModelFrameworkSchema,
  FrameworkStatusSchema,
  UnifiedModelInfoSchema,
  UnifiedModelListSchema,
  // 导出类型
  FrameworkStatus,
  FrameworkHealthStatus,
  UnifiedModelInfo,
  UnifiedModelList,
  FrameworkSwitchResult
} from './client/framework-types.schema';
