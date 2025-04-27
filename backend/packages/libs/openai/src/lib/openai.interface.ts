import { Response } from 'express';
import { z } from 'zod';
import { OllamaModelInfo, OllamaVersionResponse, OpenAI } from '@saito/models';
import { BaseModelService } from '@saito/ollama';


export abstract class ModelOpenaiService extends BaseModelService {
  /**
   * 处理聊天请求
   */
 abstract handleChat(params: z.infer<typeof OpenAI.ChatParams>, res: Response): Promise<void>;

  /**
   * 处理补全请求
   */
  abstract handleCompletion(params: z.infer<typeof OpenAI.CompletionParams>, res: Response): Promise<void>;

  /**
   * 处理嵌入请求
   */
  abstract handleEmbedding(params: z.infer<typeof OpenAI.EmbeddingParams>): Promise<z.infer<typeof OpenAI.OpenAIEmbeddingResponse>>;

  /**
   * 检查服务状态
   */
  abstract checkStatus(): Promise<boolean>;

  /**
   * 获取模型列表
   */
  abstract listModels(): Promise<{ object: string; data: Array<{ id: string; object: string; created: number; owned_by: string }> }>;

  /**
   * 获取模型标签列表
   */
  abstract listModelTags(): Promise<{ object: string; data: Array<{ id: string; object: string; created: number; owned_by: string }> }>;

  /**
   * 获取模型信息
   */
  abstract showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>>;

  /**
   * 获取模型版本
   */
  abstract showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>>;
} 