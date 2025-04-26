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
  abstract listModels(): Promise<z.infer<typeof DeepSeek.OllamaModelList>>;

  /**
   * 获取模型标签列表
   */
  abstract listModelTags(): Promise<z.infer<typeof DeepSeek.OllamaModelList>>;

  /**
   * 获取模型信息
   */
  abstract showModelInformation(args: { name: string }): Promise<z.infer<typeof DeepSeek.OllamaModelInfo>>;

  /**
   * 获取模型版本
   */
  abstract showModelVersion(): Promise<z.infer<typeof DeepSeek.OllamaVersionResponse>>;

  /**
   * 获取运行中的模型列表
   */
  abstract listRunningModels(): Promise<z.infer<typeof DeepSeek.OllamaRunningModels>>;

  /**
   * 复制模型
   */
  abstract copyModel(args: z.infer<typeof DeepSeek.OllamaModelCopyRequest>): Promise<void>;

  /**
   * 删除模型
   */
  abstract deleteModel(args: z.infer<typeof DeepSeek.OllamaModelDeleteRequest>): Promise<void>;

  /**
   * 拉取模型
   */
  abstract pullModel(args: z.infer<typeof DeepSeek.OllamaModelPullRequest>): Promise<void>;

  /**
   * 推送模型
   */
  abstract pushModel(args: z.infer<typeof DeepSeek.OllamaModelPushRequest>): Promise<void>;
} 