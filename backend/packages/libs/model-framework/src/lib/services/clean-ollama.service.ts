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
 * 优化的 Ollama 服务实现
 * 继承抽象基类，实现 Ollama 特定的功能
 */
@Injectable()
export class CleanOllamaService extends BaseModelService {
  readonly framework = ModelFramework.OLLAMA;

  constructor(
    @Inject(forwardRef(() => DynamicModelConfigService))
    private readonly dynamicModelConfig: DynamicModelConfigService
  ) {
    super();
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 获取动态默认模型
   * 如果客户端传入的模型不存在，使用动态检测到的默认模型
   */
  private async getEffectiveModel(requestedModel?: string): Promise<string> {
    // 如果没有请求特定模型，使用动态检测的默认模型
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

    // 检查请求的模型是否存在
    try {
      const availableModels = await this.dynamicModelConfig.getAvailableModels(ModelFramework.OLLAMA);
      const modelExists = availableModels.some(model => model.name === requestedModel);

      if (modelExists) {
        this.logger.debug(`Using requested model: ${requestedModel}`);
        return requestedModel;
      } else {
        // 请求的模型不存在，使用动态检测的默认模型
        const defaultModel = await this.dynamicModelConfig.getDefaultModel(ModelFramework.OLLAMA);
        this.logger.warn(`Requested model '${requestedModel}' not found, using default: ${defaultModel}`);
        return defaultModel;
      }
    } catch (error) {
      // 如果检测失败，使用请求的模型（让 Ollama 处理错误）
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
    // 检测是否是 OpenAI 风格请求
    const isOpenAIStyle = pathname?.includes('/openai/') || pathname?.includes('/v1/');

    if (isOpenAIStyle) {
      // OpenAI 风格请求，使用 Ollama 的 OpenAI 兼容端点
      await this.handleOpenAIChatRequest(args, res);
    } else {
      // Ollama 原生风格请求
      await this.handleOllamaChatRequest(args, res);
    }
  }

  /**
   * 处理 Ollama 原生聊天请求
   */
  private async handleOllamaChatRequest(args: ChatRequest, res: Response): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/chat`;

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model);

    // 转换为 Ollama 格式
    const ollamaRequest = {
      model: effectiveModel,
      messages: args.messages,
      stream: args.stream || true,
      options: {
        temperature: args.temperature,
        num_predict: args.max_tokens
      }
    };

    if (args.stream) {
      await this.handleStreamingRequest(endpoint, ollamaRequest, res);
    } else {
      await this.handleNonStreamingRequest(endpoint, ollamaRequest, res);
    }
  }

  /**
   * 处理 OpenAI 风格聊天请求
   */
  private async handleOpenAIChatRequest(args: ChatRequest, res: Response): Promise<void> {
    const baseUrl = this.getBaseUrl();
    // 使用 Ollama 的 OpenAI 兼容端点
    const endpoint = `${baseUrl}/v1/chat/completions`;

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model);

    // 转换为 OpenAI 格式
    const openaiRequest: any = {
      model: effectiveModel,
      messages: args.messages,
      stream: args.stream === undefined ? true : args.stream,
      temperature: args.temperature,
      max_tokens: args.max_tokens
    };

    // 添加可选参数
    if (args['top_p'] !== undefined) openaiRequest.top_p = args['top_p'];
    if (args['frequency_penalty'] !== undefined) openaiRequest.frequency_penalty = args['frequency_penalty'];
    if (args['presence_penalty'] !== undefined) openaiRequest.presence_penalty = args['presence_penalty'];

    if (args.stream) {
      await this.handleStreamingRequest(endpoint, openaiRequest, res);
    } else {
      await this.handleNonStreamingRequest(endpoint, openaiRequest, res);
    }
  }

  /**
   * 处理补全请求
   */
  protected async handleCompletionRequest(args: CompletionRequest, res: Response, pathname?: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/generate`;

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model);

    const ollamaRequest = {
      model: effectiveModel,
      prompt: args.prompt,
      stream: args.stream === undefined ? true : args.stream,
      options: {
        temperature: args.temperature,
        num_predict: args.max_tokens
      }
    };

    if (args.stream) {
      await this.handleStreamingRequest(endpoint, ollamaRequest, res);
    } else {
      await this.handleNonStreamingRequest(endpoint, ollamaRequest, res);
    }
  }

  /**
   * 执行健康检查
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl();
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/api/version`, {
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
    const response = await axios.get(`${baseUrl}/api/tags`, this.getHttpConfig());

    const models = response.data.models?.map((model: any) => ({
      name: model.name,
      size: model.size,
      modified_at: model.modified_at
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
    const baseUrl = this.getBaseUrl();
    const response = await axios.post(`${baseUrl}/api/show`, {
      name: this.normalizeModelName(modelName)
    }, this.getHttpConfig());

    return {
      name: response.data.name || modelName,
      size: response.data.size,
      modified_at: response.data.modified_at,
      details: response.data.details
    };
  }

  /**
   * 处理嵌入向量请求
   */
  protected async handleEmbeddingsRequest(args: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    const baseUrl = this.getBaseUrl();
    const inputs = Array.isArray(args.input) ? args.input : [args.input];

    // 获取有效的模型名称（动态检测）
    const effectiveModel = await this.getEffectiveModel(args.model || 'nomic-embed-text');

    const embeddings = await Promise.all(
      inputs.map(async (text, index) => {
        const response = await axios.post(`${baseUrl}/api/embeddings`, {
          model: effectiveModel,
          prompt: text
        }, this.getHttpConfig());

        return {
          object: 'embedding',
          embedding: response.data.embedding,
          index
        };
      })
    );

    return {
      object: 'list',
      data: embeddings,
      model: effectiveModel,
      usage: {
        prompt_tokens: inputs.join(' ').split(' ').length,
        total_tokens: inputs.join(' ').split(' ').length
      }
    };
  }

  /**
   * 获取版本信息
   */
  protected async fetchVersion(): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const response = await axios.get(`${baseUrl}/api/version`, this.getHttpConfig());
    return response.data.version || 'unknown';
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 转换 Ollama 响应为 OpenAI 格式
   */
  private convertOllamaToOpenAI(ollamaData: any): any {
    // 如果已经是 OpenAI 格式，直接返回
    if (ollamaData.choices || ollamaData.object) {
      return ollamaData;
    }

    // 转换 Ollama 流式响应为 OpenAI 格式
    const openaiChunk: any = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: ollamaData.model || 'llama3.2:latest',
      choices: []
    };

    if (ollamaData.message) {
      // 聊天响应
      openaiChunk.choices.push({
        index: 0,
        delta: {
          role: ollamaData.message.role || 'assistant',
          content: ollamaData.message.content || ''
        },
        finish_reason: ollamaData.done ? 'stop' : null
      });
    } else if (ollamaData.response) {
      // 生成响应
      openaiChunk.choices.push({
        index: 0,
        delta: {
          content: ollamaData.response
        },
        finish_reason: ollamaData.done ? 'stop' : null
      });
    }

    return openaiChunk;
  }

  /**
   * 处理流式请求
   */
  private async handleStreamingRequest(endpoint: string, requestData: any, res: Response): Promise<void> {
    try {
      this.logger.debug(`处理流式请求: ${endpoint}, data: ${JSON.stringify(requestData)}`);

      // 检测是否是 OpenAI 风格的端点
      const isOpenAIStyle = endpoint.includes('/v1/') || endpoint.includes('openai');

      // 设置正确的响应头
      if (isOpenAIStyle) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      } else {
        // Ollama 原生格式
        res.setHeader('Content-Type', 'application/x-ndjson');
      }

      const response = await axios.post(endpoint, requestData, {
        ...this.getHttpConfig(),
        responseType: 'stream'
      });

      response.data.on('data', (chunk: Buffer) => {
        // if (isOpenAIStyle) {
          // OpenAI 风格需要 SSE 格式
          // const chunkStr = chunk.toString();

          // 如果 Ollama 已经返回了 SSE 格式，直接写入
        //   if (chunkStr.includes('data: ')) {
        //     res.write(chunkStr);
        //   } else {
        //     // 否则处理 JSON 行并转换为 SSE 格式
        //     const lines = chunkStr.split('\n').filter(line => line.trim());

        //     for (const line of lines) {
        //       try {
        //         // 尝试解析 JSON 并转换为 OpenAI 格式
        //         const data = JSON.parse(line);

        //         // 转换 Ollama 响应为 OpenAI 格式
        //         const openaiChunk = this.convertOllamaToOpenAI(data);
        //         res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);
        //       } catch (error) {
        //         // 如果不是 JSON，可能是其他格式，直接包装
        //         if (line.trim()) {
        //           res.write(`data: ${line}\n\n`);
        //         } 
        //       }
        //     }
        //   }
        // } else {
          // Ollama 原生格式直接写入
          res.write(chunk);
        // }
      });

      response.data.on('end', () => {
        if (isOpenAIStyle) {
          res.write('data: [DONE]\n\n');
        }
        res.end();
      });

      response.data.on('error', (error: Error) => {
        this.logger.error('Streaming error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      });

    } catch (error) {
      this.logger.error(`流式请求失败: ${endpoint}`, error);

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Streaming request failed',
            type: 'api_error',
            code: 'streaming_failed'
          }
        });
      }

      throw error; // 重新抛出错误以便上层处理
    }
  }

  /**
   * 处理非流式请求
   */
  private async handleNonStreamingRequest(endpoint: string, requestData: any, res: Response): Promise<void> {
    try {
      this.logger.debug(`处理非流式请求: ${endpoint}, data: ${JSON.stringify(requestData)}`);

      const response = await axios.post(endpoint, requestData, this.getHttpConfig());

      this.logger.debug(`非流式请求成功: ${endpoint}`);
      res.json(response.data);

    } catch (error) {
      this.logger.error(`非流式请求失败: ${endpoint}`, error);

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Request failed',
            type: 'api_error',
            code: 'request_failed'
          }
        });
      }

      throw error; // 重新抛出错误以便上层处理
    }
  }
}
