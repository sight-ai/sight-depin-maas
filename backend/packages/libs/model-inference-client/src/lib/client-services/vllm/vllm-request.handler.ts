import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { ChatRequest, CompletionRequest, EmbeddingsRequest, EmbeddingsResponse } from '@saito/models';
import { IRequestHandler } from '../contracts/request-handler.contract';

/**
 * vLLM 请求处理器
 * 专门负责处理各种类型的推理请求
 *
 * 实现 IRequestHandler 
 */
@Injectable()
export class VllmRequestHandler {
  private readonly logger = new Logger(VllmRequestHandler.name);

  /**
   * 处理聊天请求 (实现接口方法)
   * vLLM 使用 OpenAI 兼容格式
   */
  async handleChatRequest(args: ChatRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    const endpoint = `${baseUrl}/v1/chat/completions`;

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
   * 处理补全请求 (实现接口方法)
   */
  async handleCompletionRequest(args: CompletionRequest, res: Response, baseUrl: string, effectiveModel: string): Promise<void> {
    const endpoint = `${baseUrl}/v1/completions`;

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
   * 处理嵌入向量请求 (实现接口方法)
   */
  async handleEmbeddingsRequest(args: EmbeddingsRequest, baseUrl: string, effectiveModel: string): Promise<EmbeddingsResponse> {
    const endpoint = `${baseUrl}/v1/embeddings`;

    const vllmRequest = {
      model: effectiveModel,
      input: args.input
    };

    const config = this.getHttpConfig();
    const response = await axios.post(endpoint, vllmRequest, config);

    // vLLM 返回的已经是 OpenAI 格式
    return response.data;
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
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

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
