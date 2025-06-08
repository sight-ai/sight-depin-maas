import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { BaseModelService } from '../abstracts/base-model-service';
import {
  ChatRequest,
  CompletionRequest,
  EmbeddingsRequest,
  EmbeddingsResponse
} from '../interfaces/service.interface';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '../types/framework.types';
import { DynamicModelConfigService } from './dynamic-model-config.service';

/**
 * 优化的 vLLM 服务实现
 * 继承抽象基类，实现 vLLM 特定的功能
 *
 * 新增功能：
 * - 智能模型选择：如果请求的模型不存在，自动使用第一个可用模型
 * - 与 Ollama 服务保持一致的模型选择逻辑
 */
@Injectable()
export class CleanVllmService extends BaseModelService {
  readonly framework = ModelFramework.VLLM;

  constructor(
    @Inject(forwardRef(() => DynamicModelConfigService))
    private readonly dynamicModelConfig: DynamicModelConfigService
  ) {
    super();
  }

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
  // 实现抽象方法
  // =============================================================================

  /**
   * 处理聊天请求
   */
  protected async handleChatRequest(args: ChatRequest, res: Response, pathname?: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/v1/chat/completions`;

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model);

    // vLLM 使用 OpenAI 兼容格式
    const vllmRequest = {
      model: effectiveModel,
      messages: args.messages,
      stream: args.stream === undefined ? true : args.stream,
      temperature: args.temperature,
      max_tokens: args.max_tokens
    };

    if (args.stream) {
      await this.handleStreamingRequest(endpoint, vllmRequest, res);
    } else {
      await this.handleNonStreamingRequest(endpoint, vllmRequest, res);
    }
  }

  /**
   * 处理补全请求
   */
  protected async handleCompletionRequest(args: CompletionRequest, res: Response, pathname?: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/v1/completions`;

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model);

    const vllmRequest = {
      model: effectiveModel,
      prompt: args.prompt,
      stream: args.stream === undefined ? true : args.stream,
      temperature: args.temperature,
      max_tokens: args.max_tokens
    };

    if (args.stream) {
      await this.handleStreamingRequest(endpoint, vllmRequest, res);
    } else {
      await this.handleNonStreamingRequest(endpoint, vllmRequest, res);
    }
  }

  /**
   * 执行健康检查
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl();
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/v1/models`, {
        ...config,
        timeout: 5000
      });
      return this.isSuccessResponse(response.status);
    } catch {
      return false;
    }
  }

  /**
   * 获取模型列表
   */
  protected async fetchModelList(): Promise<UnifiedModelList> {
    const baseUrl = this.getBaseUrl();
    const response = await axios.get(`${baseUrl}/v1/models`, this.getHttpConfig());

    const models = response.data.data?.map((model: any) => ({
      name: model.id,
      size: 'unknown', // vLLM 不提供大小信息
      modified_at: model.created ? new Date(model.created * 1000).toISOString() : undefined
    })) || [];

    return {
      models,
      total: models.length,
      framework: this.framework
    };
  }

  /**
   * 获取模型信息
   */
  protected async fetchModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    const modelList = await this.fetchModelList();
    const model = modelList.models.find(m => m.name === modelName);

    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    return model;
  }

  /**
   * 处理嵌入向量请求
   */
  protected async handleEmbeddingsRequest(args: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const baseUrl = this.getBaseUrl();

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model);

    const vllmRequest = {
      ...args,
      model: effectiveModel
    };

    const response = await axios.post(`${baseUrl}/v1/embeddings`, vllmRequest, this.getHttpConfig());
    return response.data;
  }

  /**
   * 获取版本信息
   */
  protected async fetchVersion(): Promise<string> {
    // vLLM 没有版本端点，所以我们检查模型端点
    const baseUrl = this.getBaseUrl();
    await axios.get(`${baseUrl}/v1/models`, this.getHttpConfig());
    return 'vLLM (OpenAI Compatible)';
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 处理流式请求
   */
  private async handleStreamingRequest(endpoint: string, requestData: any, res: Response): Promise<void> {
    const response = await axios.post(endpoint, requestData, {
      ...this.getHttpConfig(),
      responseType: 'stream'
    });

    // res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // res.setHeader('Transfer-Encoding', 'chunked');

    response.data.on('data', (chunk: Buffer) => {
      res.write(chunk);
    });

    response.data.on('end', () => {
      res.end();
    });

    response.data.on('error', (error: Error) => {
      this.logger.error('Streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * 处理非流式请求
   */
  private async handleNonStreamingRequest(endpoint: string, requestData: any, res: Response): Promise<void> {
    const response = await axios.post(endpoint, requestData, this.getHttpConfig());
    res.json(response.data);
  }
}
