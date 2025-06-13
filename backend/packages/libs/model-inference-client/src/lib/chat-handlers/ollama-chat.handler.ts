import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IChatHandler, ChatRequest, RequestContext, CompletionRequest, EmbeddingsRequest, UnifiedModelList, UnifiedModelInfo } from '@saito/models';

/**
 * Ollama 聊天处理器
 *
 * 职责：
 * 1. 处理Ollama聊天请求，支持流式和非流式响应
 * 2. 根据请求路径自动选择API格式（OpenAI兼容 vs Ollama原生）
 * 3. 处理不同类型的数据块（string、Buffer、Uint8Array）
 * 4. 提供统一的错误处理和日志记录
 *
 * 支持的格式：
 * - OpenAI兼容格式：/v1/chat/completions
 * - Ollama原生格式：/api/chat
 *
 * 架构特点：
 * - 实现IChatHandler接口，提供统一的聊天处理能力
 * - 自动检测请求格式，无需手动配置
 * - 支持流式和非流式响应
 * - 完整的错误处理和日志记录
 */
@Injectable()
export class OllamaChatHandler implements IChatHandler {
  private readonly logger = new Logger(OllamaChatHandler.name);

  // API端点常量
  private static readonly OPENAI_ENDPOINT = '/v1/chat/completions';
  private static readonly OLLAMA_ENDPOINT = '/api/chat';
  private static readonly GENERATE_ENDPOINT = '/api/generate';
  private static readonly TAGS_ENDPOINT = '/api/tags';
  private static readonly SHOW_ENDPOINT = '/api/show';
  private static readonly EMBEDDINGS_ENDPOINT = '/api/embeddings';
  private static readonly VERSION_ENDPOINT = '/api/version';

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
   *
   * @param args 聊天请求参数
   * @param pathname 请求路径
   * @returns true表示使用OpenAI风格，false表示使用Ollama原生风格
   */
  private detectRequestStyle(args: ChatRequest, pathname?: string): boolean {
    if (!pathname) {
      // 没有路径信息时，根据参数结构判断
      return !!(args.messages && Array.isArray(args.messages));
    }

    // 优先级1：明确的OpenAI风格路径
    if (pathname.includes('/v1/') || pathname.includes('/chat/completions')) {
      this.logger.debug(`Detected OpenAI style from path: ${pathname}`);
      return true;
    }

    // 优先级2：明确的Ollama原生风格路径
    if (pathname.includes('/api/chat')) {
      this.logger.debug(`Detected Ollama native style from path: ${pathname}`);
      return false;
    }

    // 优先级3：根据参数结构判断（默认OpenAI风格）
    const isOpenAI = !!(args.messages && Array.isArray(args.messages));
    this.logger.debug(`Detected ${isOpenAI ? 'OpenAI' : 'Ollama'} style from parameters`);
    return isOpenAI;
  }

  /**
   * 调用 Ollama 的 OpenAI 兼容端点
   *
   * 使用Ollama的OpenAI兼容API，返回OpenAI格式的响应
   */
  private async callOllamaOpenAIEndpoint(
    args: ChatRequest,
    res: Response,
    baseUrl: string,
    effectiveModel: string
  ): Promise<void> {
    const endpoint = `${baseUrl}${OllamaChatHandler.OPENAI_ENDPOINT}`;
    
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
   *
   * 使用Ollama的原生API，返回Ollama原生格式的响应
   */
  private async callOllamaNativeEndpoint(
    args: ChatRequest,
    res: Response,
    baseUrl: string,
    effectiveModel: string
  ): Promise<void> {
    const endpoint = `${baseUrl}${OllamaChatHandler.OLLAMA_ENDPOINT}`;
    
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
    // 根据路径自动选择正确的端点
    const endpoint = this.getOllamaEndpoint(context.baseUrl, context.pathname || '');
    const useOpenAIFormat = this.shouldUseOpenAIFormat(context.pathname || '');

    // 根据端点格式构建请求体
    const requestBody = useOpenAIFormat ? {
      // OpenAI 格式请求体，Ollama 会自动返回 OpenAI 格式
      model: context.effectiveModel || 'default',
      prompt: context.args.prompt,
      stream: context.args.stream || false,
      temperature: context.args.temperature,
      max_tokens: context.args.max_tokens,
      top_p: context.args.top_p,
      frequency_penalty: context.args.frequency_penalty,
      presence_penalty: context.args.presence_penalty,
      stop: context.args.stop,
      n: context.args.n || 1,
      echo: context.args.echo,
      logprobs: context.args.logprobs
    } : {
      // Ollama 原生格式请求体
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
        await this.handleStreamingResponse(response, context.res, context.pathname || '');
      } else {
        const data = await response.json();
        // Ollama 会根据端点自动返回正确格式，无需手动转换
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
   * 检查是否应该使用 OpenAI 格式
   * 根据路径自动判断，推理软件会自动返回对应格式
   */
  private shouldUseOpenAIFormat(pathname: string): boolean {
    return pathname.includes('/v1/') || pathname.includes('/openai/');
  }

  /**
   * 获取正确的 Ollama 端点
   * 根据请求路径决定调用哪个 Ollama 端点
   */
  private getOllamaEndpoint(baseUrl: string, pathname: string): string {
    if (this.shouldUseOpenAIFormat(pathname)) {
      // 使用 OpenAI 兼容端点，Ollama 会自动返回 OpenAI 格式
      if (pathname.includes('/chat/completions')) {
        return `${baseUrl}/v1/chat/completions`;
      } else if (pathname.includes('/completions')) {
        return `${baseUrl}/v1/completions`;
      }
    }

    // 使用 Ollama 原生端点
    if (pathname.includes('/completions') || pathname.includes('/generate')) {
      return `${baseUrl}/api/generate`;
    } else {
      return `${baseUrl}/api/chat`;
    }
  }

  /**
   * 处理流式响应
   * Ollama 会根据端点自动返回正确格式，无需手动转换
   */
  private async handleStreamingResponse(response: globalThis.Response, res: Response, pathname: string = ''): Promise<void> {
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

        // 直接转发数据，Ollama 已经返回了正确格式
        res.write(value);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  }


}
