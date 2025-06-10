import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IModelClient } from './model-service.interface';
import {
  ChatRequest,
  CompletionRequest,
  EmbeddingsRequest,
  EmbeddingsResponse,
  ModelFramework,
  UnifiedModelList,
  UnifiedModelInfo,
  RequestType,
  RequestContext
} from '@saito/models';
import { DynamicModelConfigService } from '../model-operations/dynamic-model-config.service';
import { OllamaRequestDispatcher } from '../request-dispatchers/ollama-request.dispatcher';

/**
 * Ollama 客户端服务
 *
 */
@Injectable()
export class OllamaClientService implements IModelClient {
  readonly framework = ModelFramework.OLLAMA;
  private readonly logger = new Logger(OllamaClientService.name);

  constructor(
    @Inject(forwardRef(() => DynamicModelConfigService))
    private readonly dynamicModelConfig: DynamicModelConfigService,
    private readonly dispatcher: OllamaRequestDispatcher
  ) {}

  // =============================================================================
  // IModelService 接口实现 - 真正的调度器模式
  // =============================================================================

  /**
   * 处理聊天请求
   *
   */
  async chat(args: ChatRequest, res: Response, pathname?: string): Promise<void> {
    const context = await this.createRequestContext(RequestType.CHAT, args, res, pathname);
    return this.dispatcher.dispatch(context);
  }

  /**
   * 处理补全请求
   */
  async complete(args: CompletionRequest, res: Response, pathname?: string): Promise<void> {
    const context = await this.createRequestContext(RequestType.COMPLETION, args, res, pathname);
    return this.dispatcher.dispatch(context);
  }

  /**
   * 检查服务状态
   */
  async checkStatus(): Promise<boolean> {
    const context = await this.createRequestContext(RequestType.HEALTH_CHECK);
    return this.dispatcher.dispatch(context);
  }

  /**
   * 获取模型列表
   */
  async listModels(): Promise<UnifiedModelList> {
    const context = await this.createRequestContext(RequestType.MODEL_LIST);
    return this.dispatcher.dispatch(context);
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    const context = await this.createRequestContext(RequestType.MODEL_INFO, { modelName });
    return this.dispatcher.dispatch(context);
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(args: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const context = await this.createRequestContext(RequestType.EMBEDDINGS, args);
    return this.dispatcher.dispatch(context);
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<{ version: string; framework: ModelFramework }> {
    const context = await this.createRequestContext(RequestType.VERSION);
    const version = await this.dispatcher.dispatch(context);
    return { version, framework: this.framework };
  }









  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 创建请求上下文
   *
   * 这是调度器模式的核心：将请求信息封装成上下文对象
   * 然后交给调度器处理，而不是直接调用具体的实现方法
   */
  private async createRequestContext(
    type: RequestType,
    args?: any,
    res?: Response,
    pathname?: string
  ): Promise<RequestContext> {
    const baseUrl = this.getBaseUrl();
    let effectiveModel: string | undefined;

    // 只有需要模型的请求才获取有效模型
    if (args && (args.model !== undefined || type === RequestType.EMBEDDINGS)) {
      effectiveModel = await this.getEffectiveModel(args.model);
    }

    return {
      type,
      baseUrl,
      effectiveModel,
      pathname,
      args,
      res
    };
  }

  /**
   * 获取基础URL
   */
  private getBaseUrl(): string {
    return process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
  }

  /**
   * 获取动态默认模型
   *
   */
  private async getEffectiveModel(requestedModel?: string): Promise<string> {
    if (!requestedModel) {
      try {
        const defaultModel = await this.dynamicModelConfig.getDefaultModel(ModelFramework.OLLAMA);
        this.logger.debug(`Using dynamic default model: ${defaultModel}`);
        return defaultModel;
      } catch (error) {
        this.logger.warn('Failed to get dynamic default model, using fallback');
        return 'llama3.2:latest';
      }
    }

    try {
      const availableModels = await this.dynamicModelConfig.getAvailableModels(ModelFramework.OLLAMA);
      const modelExists = availableModels.some(model => model.name === requestedModel);

      if (modelExists) {
        this.logger.debug(`Using requested model: ${requestedModel}`);
        return requestedModel;
      } else {
        const defaultModel = await this.dynamicModelConfig.getDefaultModel(ModelFramework.OLLAMA);
        this.logger.warn(`Requested model '${requestedModel}' not found, using default: ${defaultModel}`);
        return defaultModel;
      }
    } catch (error) {
      this.logger.warn(`Failed to validate model '${requestedModel}', proceeding with request`);
      return requestedModel;
    }
  }
}
