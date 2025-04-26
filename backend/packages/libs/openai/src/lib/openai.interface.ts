import { Response } from 'express';
import { z } from 'zod';
import { OpenAI } from '@saito/models';
import { 
  OpenAIChatParams, 
  OpenAICompletionParams, 
  OpenAIEmbeddingParams,
  OllamaModelList,
  OllamaModelInfo,
  OllamaRunningModels,
  OllamaVersionResponse
} from './types';

export abstract class ModelOpenaiService {
  /**
   * 处理聊天请求
   */
  abstract handleChat(params: z.infer<typeof OpenAI.OpenAIChatParams>, res: Response): Promise<void>;

  /**
   * 处理补全请求
   */
  abstract handleCompletion(params: z.infer<typeof OpenAI.OpenAICompletionParams>, res: Response): Promise<void>;

  /**
   * 处理嵌入请求
   */
  abstract handleEmbedding(params: z.infer<typeof OpenAI.OpenAIEmbeddingParams>): Promise<z.infer<typeof OpenAI.OpenAIEmbeddingResponse>>;

  /**
   * 检查服务状态
   */
  abstract checkStatus(): Promise<boolean>;

  /**
   * 获取模型列表
   */
  abstract listModels(): Promise<z.infer<typeof OpenAI.OllamaModelList>>;

  /**
   * 获取模型标签列表
   */
  abstract listModelTags(): Promise<z.infer<typeof OpenAI.OllamaModelList>>;

  /**
   * 获取模型信息
   */
  abstract showModelInformation(args: { name: string }): Promise<z.infer<typeof OpenAI.OllamaModelInfo>>;

  /**
   * 获取模型版本
   */
  abstract showModelVersion(): Promise<z.infer<typeof OpenAI.OllamaVersionResponse>>;

} 