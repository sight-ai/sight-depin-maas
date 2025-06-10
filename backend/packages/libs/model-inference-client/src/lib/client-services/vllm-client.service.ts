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
import { VllmRequestDispatcher } from '../request-dispatchers/vllm-request.dispatcher';

/**
 * vLLM 客户端服务
 *
 */
@Injectable()
export class VllmClientService implements IModelClient {
  readonly framework = ModelFramework.VLLM;
  private readonly logger = new Logger(VllmClientService.name);

  constructor(
    @Inject(forwardRef(() => DynamicModelConfigService))
    private readonly dynamicModelConfig: DynamicModelConfigService,
    private readonly dispatcher: VllmRequestDispatcher
  ) {}

  /**
   * 获取动态默认模型
   * 如果客户端传入的模型不存在，使用动态检测到的默认模型
   */
  private async getEffectiveModel(requestedModel?: string): Promise<string> {
    // 如果没有请求特定模型，使用动态检测的默认模型
    if (!requestedModel) {
      try {
        const defaultModel = await this.dynamicModelConfig.getDefaultModel(ModelFramework.VLLM);
        this.logger.debug(`Using dynamic default model: ${defaultModel}`);
        return defaultModel;
      } catch (error) {
        this.logger.warn('Failed to get dynamic default model, using fallback');
        return 'default';
      }
    }

    // 检查请求的模型是否存在
    try {
      const availableModels = await this.dynamicModelConfig.getAvailableModels(ModelFramework.VLLM);
      const modelExists = availableModels.some(model => model.name === requestedModel);

      if (modelExists) {
        this.logger.debug(`Using requested model: ${requestedModel}`);
        return requestedModel;
      } else {
        // 请求的模型不存在，使用动态检测的默认模型
        const defaultModel = await this.dynamicModelConfig.getDefaultModel(ModelFramework.VLLM);
        this.logger.warn(`Requested model '${requestedModel}' not found, using default: ${defaultModel}`);
        return defaultModel;
      }
    } catch (error) {
      // 如果检测失败，使用请求的模型（让 vLLM 处理错误）
      this.logger.warn(`Failed to validate model '${requestedModel}', proceeding with request`);
      return requestedModel;
    }
  }

  // =============================================================================
  // IModelService 接口实现 - 真正的调度器模式
  // =============================================================================

  /**
   * 处理聊天请求
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
    return process.env['VLLM_API_URL'] || 'http://localhost:8000';
  }
}
