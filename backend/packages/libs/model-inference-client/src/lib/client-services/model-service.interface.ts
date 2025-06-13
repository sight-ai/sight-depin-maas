import { Response } from 'express';
import {
  ModelFramework,
  UnifiedModelList,
  UnifiedModelInfo,
  ChatRequest,
  CompletionRequest,
  EmbeddingsRequest,
  EmbeddingsResponse
} from '@saito/models';

/**
 * 模型客户端接口
 * 定义与推理服务通信的标准接口
 *
 * 实现类：OllamaClient, VllmClient
 */
export interface IModelClient {
  readonly framework: ModelFramework;
  chat(args: ChatRequest, res: Response, pathname?: string): Promise<void>;
  complete(args: CompletionRequest, res: Response, pathname?: string): Promise<void>;
  checkStatus(): Promise<boolean>;
  listModels(): Promise<UnifiedModelList>;
  getModelInfo(modelName: string): Promise<UnifiedModelInfo>;
  generateEmbeddings(args: EmbeddingsRequest): Promise<EmbeddingsResponse>;
  getVersion(): Promise<{ version: string; framework: ModelFramework }>;
}
