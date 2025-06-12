import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IChatHandler, ChatRequest, RequestContext, CompletionRequest, EmbeddingsRequest, UnifiedModelList, UnifiedModelInfo } from '@saito/models';

/**
 * Ollama 聊天处理器
 * 
 */
@Injectable()
export class OllamaChatHandler implements IChatHandler {
  private readonly logger = new Logger(OllamaChatHandler.name);

  /**
   * 处理聊天请求 - 只负责调用 Ollama 的聊天功能
   * 不包含配置管理、进程管理等逻辑
   */
  async handleChatRequest(
    args: ChatRequest,
    res: Response,
    baseUrl: string,
    effectiveModel: string,
    pathname?: string
  ): Promise<void> {
    this.logger.debug(`Processing chat request for model: ${effectiveModel}, pathname: ${pathname}`);

    try {
      // 根据路径决定使用哪种API风格
      const isOpenAIStyle = this.detectRequestStyle(args, pathname);

      if (isOpenAIStyle) {
        await this.callOllamaOpenAIEndpoint(args, res, baseUrl, effectiveModel);
      } else {
        await this.callOllamaNativeEndpoint(args, res, baseUrl, effectiveModel);
      }
    } catch (error) {
      this.logger.error(`Chat request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 检测请求风格（基于路径和请求参数判断）
   */
  private detectRequestStyle(args: ChatRequest, pathname?: string): boolean {
    // 如果路径包含 /v1/ 或 /chat/completions，使用 OpenAI 风格
    if (pathname && (pathname.includes('/v1/') || pathname.includes('/chat/completions'))) {
      return true;
    }

    // 如果路径包含 /api/chat，使用 Ollama 原生风格
    if (pathname && pathname.includes('/api/chat')) {
      return false;
    }

    // 默认情况下，检查是否包含 OpenAI 风格的参数
    return !!(args.messages && Array.isArray(args.messages));
  }

  /**
   * 调用 Ollama 的 OpenAI 兼容端点
   */
  private async callOllamaOpenAIEndpoint(
    args: ChatRequest, 
    res: Response, 
    baseUrl: string, 
    effectiveModel: string
  ): Promise<void> {
    const endpoint = `${baseUrl}/v1/chat/completions`;
    
    const requestBody = {
      model: effectiveModel,
      messages: args.messages,
      stream: args.stream || false,
      temperature: args.temperature,
      max_tokens: args.max_tokens,
      top_p: args['top_p']
    };

    this.logger.debug(`Calling Ollama OpenAI endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      if (args.stream) {
        await this.handleStreamingResponse(response, res);
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      this.logger.error(`OpenAI endpoint call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 调用 Ollama 的原生端点
   */
  private async callOllamaNativeEndpoint(
    args: ChatRequest, 
    res: Response, 
    baseUrl: string, 
    effectiveModel: string
  ): Promise<void> {
    const endpoint = `${baseUrl}/api/chat`;
    
    const requestBody = {
      model: effectiveModel,
      messages: args.messages,
      stream: args.stream || false,
      options: {
        temperature: args.temperature,
        top_p: args['top_p'],
        top_k: args['top_k']
      }
    };

    this.logger.debug(`Calling Ollama native endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      if (args.stream) {
        await this.handleStreamingResponse(response, res);
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      this.logger.error(`Native endpoint call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理聊天请求（RequestContext 版本）
   */
  async handleChat(context: RequestContext): Promise<void> {
    await this.handleChatRequest(
      context.args,
      context.res,
      context.baseUrl,
      context.effectiveModel || 'default',
      context.pathname
    );
  }

  /**
   * 处理完成请求
   */
  async handleCompletion(context: RequestContext): Promise<void> {
    const endpoint = `${context.baseUrl}/api/generate`;

    const requestBody = {
      model: context.effectiveModel || 'default',
      prompt: context.args.prompt,
      stream: context.args.stream || false,
      options: {
        temperature: context.args.temperature,
        top_p: context.args.top_p,
        top_k: context.args.top_k,
        num_predict: context.args.max_tokens
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (context.args.stream) {
        await this.handleStreamingResponse(response, context.res);
      } else {
        const data = await response.json();
        context.res.json(data);
      }
    } catch (error) {
      this.logger.error(`Ollama completion request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理模型列表请求
   */
  async handleModelList(context: RequestContext): Promise<UnifiedModelList> {
    const endpoint = `${context.baseUrl}/api/tags`;

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // Ollama 返回的格式已经是我们需要的格式
      const unifiedList: UnifiedModelList = {
        models: data.models || [],
        total: (data.models || []).length,
        framework: 'ollama'
      };

      context.res.json(unifiedList);
      return unifiedList;
    } catch (error) {
      this.logger.error(`Ollama model list request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理模型信息请求
   */
  async handleModelInfo(context: RequestContext): Promise<UnifiedModelInfo> {
    const endpoint = `${context.baseUrl}/api/show`;

    const requestBody = {
      name: context.effectiveModel || 'default'
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      const modelInfo: UnifiedModelInfo = {
        name: data.name || context.effectiveModel || 'default',
        size: data.size || 'unknown',
        digest: data.digest || '',
        modified_at: data.modified_at || new Date().toISOString()
      };

      context.res.json(modelInfo);
      return modelInfo;
    } catch (error) {
      this.logger.error(`Ollama model info request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理嵌入请求
   */
  async handleEmbeddings(context: RequestContext): Promise<any> {
    const endpoint = `${context.baseUrl}/api/embeddings`;

    const requestBody = {
      model: context.effectiveModel || 'default',
      prompt: context.args.input
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      context.res.json(data);
      return data;
    } catch (error) {
      this.logger.error(`Ollama embeddings request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理版本请求
   */
  async handleVersion(context: RequestContext): Promise<string> {
    const endpoint = `${context.baseUrl}/api/version`;

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const version = data.version || 'Ollama-unknown';

      context.res.json({ version });
      return version;
    } catch (error) {
      this.logger.error(`Ollama version request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // 返回默认版本而不是抛出错误
      const version = 'Ollama-unknown';
      context.res.json({ version });
      return version;
    }
  }

  /**
   * 处理流式响应
   */
  private async handleStreamingResponse(response: globalThis.Response, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        res.write(value);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  }
}
