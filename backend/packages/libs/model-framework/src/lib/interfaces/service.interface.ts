import { Response } from 'express';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo, FrameworkHealthStatus, EnhancedFrameworkDetectionResult } from '../types/framework.types';

// =============================================================================
// Core Abstraction Interfaces
// =============================================================================

/**
 * 框架管理器抽象接口
 */
export interface IFrameworkManager {
  getCurrentFramework(): ModelFramework;
  setFrameworkOverride(framework: ModelFramework | null): void;
  switchFramework(framework: ModelFramework, options?: { force?: boolean; validateAvailability?: boolean }): Promise<void>;
  detectFrameworks(): Promise<EnhancedFrameworkDetectionResult>;
  isFrameworkAvailable(framework: ModelFramework): Promise<boolean>;
  createFrameworkService(framework?: ModelFramework): Promise<IModelService>;
}

/**
 * 模型服务抽象接口
 */
export interface IModelService {
  readonly framework: ModelFramework;
  chat(args: ChatRequest, res: Response, pathname?: string): Promise<void>;
  complete(args: CompletionRequest, res: Response, pathname?: string): Promise<void>;
  checkStatus(): Promise<boolean>;
  listModels(): Promise<UnifiedModelList>;
  getModelInfo(modelName: string): Promise<UnifiedModelInfo>;
  generateEmbeddings(args: EmbeddingsRequest): Promise<EmbeddingsResponse>;
  getVersion(): Promise<{ version: string; framework: ModelFramework }>;
}

/**
 * 进程管理器抽象接口
 */
export interface IProcessManager {
  readonly framework: ModelFramework;
  start(options?: ProcessStartOptions): Promise<ProcessResult>;
  stop(): Promise<ProcessResult>;
  restart(): Promise<ProcessResult>;
  getStatus(): Promise<ProcessStatus>;
  isRunning(): Promise<boolean>;
  getConfig(): ProcessConfig;
  updateConfig(config: Partial<ProcessConfig>): void;
}

/**
 * 服务工厂抽象接口
 */
export interface IServiceFactory {
  createService(framework: ModelFramework): Promise<IModelService>;
  getCurrentService(): Promise<IModelService>;
  switchFramework(framework: ModelFramework, options?: any): Promise<IModelService>;
  getAvailableFrameworks(): Promise<ModelFramework[]>;
  getCurrentFramework(): ModelFramework | null;
  isFrameworkAvailable(framework: ModelFramework): Promise<boolean>;
  getFrameworkStatus(): Promise<EnhancedFrameworkDetectionResult>;
  clearCache(): void;
}

// =============================================================================
// Request/Response Types
// =============================================================================

export interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface CompletionRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface EmbeddingsRequest {
  input: string | string[];
  model?: string;
  [key: string]: any;
}

export interface EmbeddingsResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// Process Management Types
// =============================================================================

export interface ProcessStartOptions {
  port?: number;
  host?: string;
  model?: string;
  gpuMemoryFraction?: number;
  maxModelLen?: number;
  [key: string]: any;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  pid?: number;
  port?: number;
  error?: string;
}

export interface ProcessStatus {
  isRunning: boolean;
  pid?: number;
  port?: number;
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  error?: string;
}

export interface ProcessConfig {
  framework: ModelFramework;
  port: number;
  host: string;
  autoStart: boolean;
  restartOnFailure: boolean;
  maxRestarts: number;
  healthCheckInterval: number;
  [key: string]: any;
}

// =============================================================================
// Framework Detection Types (imported from types file)
// =============================================================================
// FrameworkDetectionResult is defined in framework.types.ts

// =============================================================================
// Legacy Compatibility (保持向后兼容)
// =============================================================================

/** @deprecated Use IModelService instead */
export interface UnifiedModelService extends IModelService {}

/** @deprecated Use IServiceFactory instead */
export interface ModelServiceFactory extends IServiceFactory {}

/** @deprecated Use ChatRequest instead */
export interface UnifiedChatRequest extends ChatRequest {}

/** @deprecated Use CompletionRequest instead */
export interface UnifiedCompletionRequest extends CompletionRequest {}

/** @deprecated Use EmbeddingsRequest instead */
export interface UnifiedEmbeddingsRequest extends EmbeddingsRequest {}

/** @deprecated Use EmbeddingsResponse instead */
export interface UnifiedEmbeddingsResponse extends EmbeddingsResponse {}
