import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { ChatRequest, CompletionRequest, EmbeddingsRequest, EmbeddingsResponse } from '@saito/models';
import { IRequestHandler } from '../contracts/request-handler.contract';

/**
 * Ollama 请求处理器
 * 专门负责处理各种类型的推理请求
 *
 * 实现 IRequestHandler 
 */
@Injectable()
export class OllamaRequestHandler {
  private readonly logger = new Logger(OllamaRequestHandler.name);

  /**
   * 处理聊天请求 (实现接口方法)
   * 根据请求路径自动判断是 OpenAI 风格还是 Ollama 原生风格
   */
  async handleChatRequest(args: ChatRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    // 检测请求风格 - 这里可以通过其他方式传入，比如在 context 中
    const isOpenAIStyle = true; // 默认使用 OpenAI 风格，可以根据需要调整

    if (isOpenAIStyle) {
      await this.handleOpenAIChatRequest(args, res, baseUrl, effectiveModel);
    } else {
      await this.handleOllamaChatRequest(args, res, baseUrl, effectiveModel);
    }
  }

  /**
   * 处理补全请求 (实现接口方法)
   */
  async handleCompletionRequest(args: CompletionRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    await this.handleOllamaCompletionRequest(args, res, baseUrl, effectiveModel);
  }

  /**
   * 处理嵌入向量请求 (实现接口方法)
   */
  async handleEmbeddingsRequest(args: EmbeddingsRequest, baseUrl: string, effectiveModel: string): Promise<EmbeddingsResponse> {
    return this.handleOllamaEmbeddingsRequest(args, baseUrl, effectiveModel);
  }

  // =============================================================================
  // 私有实现方法
  // =============================================================================

  /**
   * 处理 OpenAI 风格的聊天请求
   */
  private async handleOpenAIChatRequest(args: ChatRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    const endpoint = `${baseUrl}/v1/chat/completions`;

    // 使用 Ollama 的 OpenAI 兼容端点
    const openAIRequest = {
      model: effectiveModel,
      messages: args.messages,
      stream: args.stream === undefined ? true : args.stream,
      temperature: args.temperature,
      max_tokens: args.max_tokens
    };

    if (args.stream) {
      await this.handleStreamingRequest(endpoint, openAIRequest, res);
    } else {
      await this.handleNonStreamingRequest(endpoint, openAIRequest, res);
    }
  }

  /**
   * 处理 Ollama 原生聊天请求
   */
  private async handleOllamaChatRequest(args: ChatRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    const endpoint = `${baseUrl}/api/chat`;

    // 转换为 Ollama 格式
    const ollamaRequest = {
      model: effectiveModel,
      messages: args.messages,
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
   * 处理 Ollama 补全请求
   */
  private async handleOllamaCompletionRequest(args: CompletionRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    const endpoint = `${baseUrl}/api/generate`;

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
   * 处理 Ollama 嵌入向量请求
   */
  private async handleOllamaEmbeddingsRequest(args: EmbeddingsRequest, baseUrl: string, effectiveModel: string): Promise<EmbeddingsResponse> {
    const endpoint = `${baseUrl}/api/embeddings`;

    const ollamaRequest = {
      model: effectiveModel,
      prompt: Array.isArray(args.input) ? args.input.join(' ') : args.input
    };

    const config = this.getHttpConfig();
    const response = await axios.post(endpoint, ollamaRequest, config);

    // 转换为 OpenAI 格式
    const embeddings = Array.isArray(response.data.embedding) ? [response.data.embedding] : [response.data.embedding];
    
    return {
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index
      })),
      model: effectiveModel,
      usage: {
        prompt_tokens: response.data.prompt_eval_count || 0,
        total_tokens: response.data.prompt_eval_count || 0
      }
    };
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 处理流式请求
   */
  private async handleStreamingRequest(endpoint: string, requestData: any, res: Response): Promise<void> {
    try {
      const config = {
        ...this.getHttpConfig(),
        responseType: 'stream' as const
      };

      const response = await axios.post(endpoint, requestData, config);

      // 设置响应头
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      // 处理流式数据
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

    } catch (error) {
      this.logger.error('Failed to handle streaming request:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      throw error;
    }
  }

  /**
   * 处理非流式请求
   */
  private async handleNonStreamingRequest(endpoint: string, requestData: any, res: Response): Promise<void> {
    try {
      const config = this.getHttpConfig();
      const response = await axios.post(endpoint, requestData, config);
      res.json(response.data);
    } catch (error) {
      this.logger.error('Failed to handle non-streaming request:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      throw error;
    }
  }

  /**
   * 获取HTTP配置
   */
  private getHttpConfig(): any {
    return {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}
