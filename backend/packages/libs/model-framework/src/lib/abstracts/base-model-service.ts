import { Logger } from '@nestjs/common';
import { Response } from 'express';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '../types/framework.types';
import { 
  IModelService, 
  ChatRequest, 
  CompletionRequest, 
  EmbeddingsRequest, 
  EmbeddingsResponse 
} from '../interfaces/service.interface';

/**
 * 模型服务抽象基类
 * 提供通用的模型服务功能实现
 */
export abstract class BaseModelService implements IModelService {
  protected readonly logger = new Logger(this.constructor.name);
  
  abstract readonly framework: ModelFramework;

  /**
   * 聊天接口
   */
  async chat(args: ChatRequest, res: Response, pathname?: string): Promise<void> {
    try {
      this.logger.debug(`Chat request for framework: ${this.framework}`);
      await this.handleChatRequest(args, res, pathname);
    } catch (error) {
      this.logger.error(`Chat request failed for ${this.framework}:`, error);
      await this.handleError(error, res);
    }
  }

  /**
   * 补全接口
   */
  async complete(args: CompletionRequest, res: Response, pathname?: string): Promise<void> {
    try {
      this.logger.debug(`Completion request for framework: ${this.framework}`);
      await this.handleCompletionRequest(args, res, pathname);
    } catch (error) {
      this.logger.error(`Completion request failed for ${this.framework}:`, error);
      await this.handleError(error, res);
    }
  }

  /**
   * 检查状态
   */
  async checkStatus(): Promise<boolean> {
    try {
      return await this.performHealthCheck();
    } catch (error) {
      this.logger.error(`Health check failed for ${this.framework}:`, error);
      return false;
    }
  }

  /**
   * 列出模型
   */
  async listModels(): Promise<UnifiedModelList> {
    try {
      this.logger.debug(`Listing models for framework: ${this.framework}`);
      return await this.fetchModelList();
    } catch (error) {
      this.logger.error(`Failed to list models for ${this.framework}:`, error);
      return {
        models: [],
        total: 0,
        framework: this.framework
      };
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    try {
      this.logger.debug(`Getting model info for ${modelName} on ${this.framework}`);
      return await this.fetchModelInfo(modelName);
    } catch (error) {
      this.logger.error(`Failed to get model info for ${modelName} on ${this.framework}:`, error);
      throw error;
    }
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(args: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    try {
      this.logger.debug(`Generating embeddings for framework: ${this.framework}`);
      return await this.handleEmbeddingsRequest(args);
    } catch (error) {
      this.logger.error(`Embeddings generation failed for ${this.framework}:`, error);
      throw error;
    }
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<{ version: string; framework: ModelFramework }> {
    try {
      const version = await this.fetchVersion();
      return {
        version,
        framework: this.framework
      };
    } catch (error) {
      this.logger.error(`Failed to get version for ${this.framework}:`, error);
      return {
        version: 'unknown',
        framework: this.framework
      };
    }
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  /**
   * 处理聊天请求
   */
  protected abstract handleChatRequest(args: ChatRequest, res: Response, pathname?: string): Promise<void>;

  /**
   * 处理补全请求
   */
  protected abstract handleCompletionRequest(args: CompletionRequest, res: Response, pathname?: string): Promise<void>;

  /**
   * 执行健康检查
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * 获取模型列表
   */
  protected abstract fetchModelList(): Promise<UnifiedModelList>;

  /**
   * 获取模型信息
   */
  protected abstract fetchModelInfo(modelName: string): Promise<UnifiedModelInfo>;

  /**
   * 处理嵌入向量请求
   */
  protected abstract handleEmbeddingsRequest(args: EmbeddingsRequest): Promise<EmbeddingsResponse>;

  /**
   * 获取版本信息
   */
  protected abstract fetchVersion(): Promise<string>;

  // =============================================================================
  // 受保护的辅助方法
  // =============================================================================

  /**
   * 处理错误响应
   */
  protected async handleError(error: any, res: Response): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = this.getErrorStatusCode(error);

    if (!res.headersSent) {
      res.status(statusCode).json({
        error: errorMessage,
        framework: this.framework,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取错误状态码
   */
  protected getErrorStatusCode(error: any): number {
    if (error?.response?.status) {
      return error.response.status;
    }
    if (error?.code === 'ECONNREFUSED') {
      return 503; // Service Unavailable
    }
    return 500; // Internal Server Error
  }

  /**
   * 获取基础URL
   */
  protected getBaseUrl(): string {
    switch (this.framework) {
      case ModelFramework.OLLAMA:
        return process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
      case ModelFramework.VLLM:
        return process.env['VLLM_API_URL'] || 'http://localhost:8000';
      default:
        throw new Error(`Unknown framework: ${this.framework}`);
    }
  }

  /**
   * 创建HTTP客户端配置
   */
  protected getHttpConfig() {
    return {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `ModelFramework/${this.framework}`
      }
    };
  }

  /**
   * 验证请求参数
   */
  protected validateRequest(args: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!args[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * 标准化模型名称
   */
  protected normalizeModelName(modelName: string): string {
    return modelName.trim().toLowerCase();
  }

  /**
   * 检查响应是否成功
   */
  protected isSuccessResponse(status: number): boolean {
    return status >= 200 && status < 300;
  }
}
