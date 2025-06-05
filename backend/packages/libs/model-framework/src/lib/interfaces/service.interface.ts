import { Response } from 'express';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '../types/framework.types';

/**
 * Simplified service interfaces for clean services
 */

export interface UnifiedChatRequest {
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

export interface UnifiedCompletionRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface UnifiedEmbeddingsRequest {
  input: string | string[];
  model?: string;
  [key: string]: any;
}

export interface UnifiedEmbeddingsResponse {
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

/**
 * Unified model service interface
 */
export interface UnifiedModelService {
  readonly framework: ModelFramework;

  chat(args: UnifiedChatRequest, res: Response, pathname?: string): Promise<void>;
  complete(args: UnifiedCompletionRequest, res: Response, pathname?: string): Promise<void>;
  checkStatus(): Promise<boolean>;
  listModels(): Promise<UnifiedModelList>;
  getModelInfo(modelName: string): Promise<UnifiedModelInfo>;
  generateEmbeddings(args: UnifiedEmbeddingsRequest): Promise<UnifiedEmbeddingsResponse>;
  getVersion(): Promise<{ version: string; framework: ModelFramework }>;
}

/**
 * Model service factory interface
 */
export interface ModelServiceFactory {
  createService(framework: ModelFramework): Promise<UnifiedModelService>;
  getCurrentService(): Promise<UnifiedModelService>;
  switchFramework(framework: ModelFramework, options?: any): Promise<UnifiedModelService>;
  getAvailableFrameworks(): Promise<ModelFramework[]>;
  getCurrentFramework(): ModelFramework | null;
  isFrameworkAvailable(framework: ModelFramework): Promise<boolean>;
  getFrameworkStatus(): Promise<any>;
  clearCache(): void;
}
