import { Response } from 'express';
import { z } from 'zod';
import { DeepSeek } from '@saito/models';

export abstract class ModelDeepSeekService {
  /**
   * 处理聊天请求
   */
  abstract handleChat(params: z.infer<typeof DeepSeek.DeepSeekChatParams>, res: Response): Promise<void>;

  /**
   * 处理补全请求
   */
  abstract handleCompletion(params: z.infer<typeof DeepSeek.DeepSeekCompletionParams>, res: Response): Promise<void>;

  /**
   * 处理嵌入请求
   */
  abstract handleEmbedding(params: z.infer<typeof DeepSeek.DeepSeekEmbeddingParams>): Promise<z.infer<typeof DeepSeek.DeepSeekEmbeddingResponse>>;

  /**
   * 检查服务状态
   */
  abstract checkStatus(): Promise<boolean>;

  /**
   * 获取模型列表
   */
  abstract listModels(): Promise<{ object: string; data: Array<{ id: string; object: string; owned_by: string }> }>;

  /**
   * 获取模型标签列表
   */
  abstract listModelTags(): Promise<{ object: string; data: Array<{ id: string; object: string; owned_by: string }> }>;

  /**
   * 获取模型信息
   */
  abstract showModelInformation(args: { name: string }): Promise<z.infer<typeof DeepSeek.OllamaModelInfo>>;

  /**
   * 获取模型版本
   */
  abstract showModelVersion(): Promise<z.infer<typeof DeepSeek.OllamaVersionResponse>>;
} 