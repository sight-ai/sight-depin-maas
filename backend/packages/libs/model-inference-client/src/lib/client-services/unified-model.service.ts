import { Injectable, Inject, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IModelClient } from './model-service.interface';
import { ACTIVE_MODEL_CLIENT } from './dynamic-client.provider';
import {
  ChatRequest,
  CompletionRequest,
  EmbeddingsRequest,
  EmbeddingsResponse,
  UnifiedModelList,
  UnifiedModelInfo
} from '@saito/models';

/**
 * 统一模型服务
 * 
 * 使用动态注入的客户端，根据配置文件自动选择 Ollama 或 vLLM 客户端
 * 这个服务展示了如何使用 ACTIVE_MODEL_CLIENT 令牌来获取当前活跃的客户端
 */
@Injectable()
export class UnifiedModelService {
  private readonly logger = new Logger(UnifiedModelService.name);

  constructor(
    @Inject(ACTIVE_MODEL_CLIENT)
    private readonly activeClient: IModelClient
  ) {
    this.logger.log(`Initialized with ${this.activeClient.framework} client`);
  }

  /**
   * 处理聊天请求
   * 自动使用当前配置的客户端
   */
  async chat(args: ChatRequest, res: Response, pathname?: string): Promise<void> {
    this.logger.debug(`Processing chat request with ${this.activeClient.framework} client`);
    return this.activeClient.chat(args, res, pathname);
  }

  /**
   * 处理补全请求
   */
  async complete(args: CompletionRequest, res: Response, pathname?: string): Promise<void> {
    this.logger.debug(`Processing completion request with ${this.activeClient.framework} client`);
    return this.activeClient.complete(args, res, pathname);
  }

  /**
   * 检查服务状态
   */
  async checkStatus(): Promise<boolean> {
    return this.activeClient.checkStatus();
  }

  /**
   * 获取模型列表
   */
  async listModels(): Promise<UnifiedModelList> {
    return this.activeClient.listModels();
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    return this.activeClient.getModelInfo(modelName);
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(args: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    return this.activeClient.generateEmbeddings(args);
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<{ version: string; framework: string }> {
    const result = await this.activeClient.getVersion();
    return {
      version: result.version,
      framework: result.framework
    };
  }

  /**
   * 获取当前使用的客户端框架
   */
  getCurrentFramework(): string {
    return this.activeClient.framework;
  }

  /**
   * 获取客户端信息
   */
  getClientInfo(): { framework: string; type: string } {
    return {
      framework: this.activeClient.framework,
      type: 'dynamic'
    };
  }
}
