import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { LocalConfigService } from '@saito/common';
import { IModelClient } from './model-service.interface';
import { OllamaClientService } from './ollama-client.service';
import { VllmClientService } from './vllm-client.service';
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
 * 动态获取当前活跃的客户端，根据配置文件实时选择 Ollama 或 vLLM 客户端
 * 提供统一的接口，隐藏底层客户端的差异
 *
 * 修复：不再使用静态注入，而是每次调用时动态获取当前客户端
 * 这样可以确保框架切换后立即生效，无需重启应用
 */
@Injectable()
export class UnifiedModelService {
  private readonly logger = new Logger(UnifiedModelService.name);

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly ollamaClientService: OllamaClientService,
    private readonly vllmClientService: VllmClientService
  ) {
    this.logger.log('Initialized UnifiedModelService with dynamic client selection');
  }

  /**
   * 动态获取当前活跃的客户端
   * 每次调用时都会根据最新的配置文件选择客户端
   */
  private getCurrentClient(): IModelClient {
    const clientType = this.localConfigService.getClientType();

    switch (clientType) {
      case 'ollama':
        this.logger.debug('Using OllamaClientService');
        return this.ollamaClientService;

      case 'vllm':
        this.logger.debug('Using VllmClientService');
        return this.vllmClientService;

      default:
        this.logger.warn(`Unknown client type: ${clientType}, defaulting to ollama`);
        return this.ollamaClientService;
    }
  }

  /**
   * 处理聊天请求
   * 自动使用当前配置的客户端
   */
  async chat(args: any, res: Response, pathname?: string): Promise<void> {
    const activeClient = this.getCurrentClient();
    this.logger.debug(`Processing chat request with ${activeClient.framework} client`);
    return activeClient.chat(args, res, pathname);
  }

  /**
   * 处理补全请求
   */
  async complete(args: CompletionRequest, res: Response, pathname?: string): Promise<void> {
    const activeClient = this.getCurrentClient();
    this.logger.debug(`Processing completion request with ${activeClient.framework} client`);
    return activeClient.complete(args, res, pathname);
  }

  /**
   * 检查服务状态
   */
  async checkStatus(): Promise<boolean> {
    const activeClient = this.getCurrentClient();
    return activeClient.checkStatus();
  }

  /**
   * 获取模型列表
   */
  async listModels(): Promise<UnifiedModelList> {
    const activeClient = this.getCurrentClient();
    return activeClient.listModels();
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    const activeClient = this.getCurrentClient();
    return activeClient.getModelInfo(modelName);
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(args: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const activeClient = this.getCurrentClient();
    return activeClient.generateEmbeddings(args);
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<{ version: string; framework: string }> {
    const activeClient = this.getCurrentClient();
    const result = await activeClient.getVersion();
    return {
      version: result.version,
      framework: result.framework
    };
  }

  /**
   * 获取当前使用的客户端框架
   */
  getCurrentFramework(): string {
    const activeClient = this.getCurrentClient();
    return activeClient.framework;
  }

  /**
   * 获取客户端信息
   */
  getClientInfo(): { framework: string; type: string } {
    const activeClient = this.getCurrentClient();
    return {
      framework: activeClient.framework,
      type: 'dynamic'
    };
  }
}
