import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IChatHandler, ChatRequest, RequestContext, CompletionRequest, EmbeddingsRequest, UnifiedModelList, UnifiedModelInfo } from '@saito/models';

/**
 * vLLM 聊天处理器
 * 
 */
@Injectable()
export class VllmChatHandler implements IChatHandler {
  private readonly logger = new Logger(VllmChatHandler.name);

  /**
   * 处理聊天请求 - 只负责调用 vLLM 的聊天功能
   * vLLM 只支持 OpenAI 格式，所以直接使用 OpenAI 兼容端点
   */
  async handleChatRequest(
    args: ChatRequest, 
    res: Response, 
    baseUrl: string, 
    effectiveModel: string
  ): Promise<void> {
    this.logger.debug(`Processing vLLM chat request for model: ${effectiveModel}`);
    
    try {
      await this.callVllmOpenAIEndpoint(args, res, baseUrl, effectiveModel);
    } catch (error) {
      this.logger.error(`vLLM chat request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 调用 vLLM 的 OpenAI 兼容端点
   * vLLM 原生支持 OpenAI 格式，无需协议转换
   */
  private async callVllmOpenAIEndpoint(
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
      temperature: args.temperature || 0.7,
      max_tokens: args.max_tokens,
      top_p: args['top_p'] || 1.0,
      frequency_penalty: args['frequency_penalty'] || 0,
      presence_penalty: args['presence_penalty'] || 0,
      stop: args['stop']
    };

    this.logger.debug(`Calling vLLM OpenAI endpoint: ${endpoint}`);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 如果有 API Key，添加到请求头
      const apiKey = this.getApiKey();
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`vLLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (args.stream) {
        await this.handleStreamingResponse(response, res);
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      this.logger.error(`vLLM endpoint call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理流式响应
   */
  private async handleStreamingResponse(response: globalThis.Response, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
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
      context.effectiveModel || 'default'
    );
  }

  /**
   * 处理完成请求
   */
  async handleCompletion(context: RequestContext): Promise<void> {
    const endpoint = `${context.baseUrl}/v1/completions`;

    const requestBody = {
      model: context.effectiveModel || 'default',
      prompt: context.args.prompt,
      max_tokens: context.args.max_tokens,
      temperature: context.args.temperature || 0.7,
      top_p: context.args.top_p || 1.0,
      frequency_penalty: context.args.frequency_penalty || 0,
      presence_penalty: context.args.presence_penalty || 0,
      stop: context.args.stop,
      stream: context.args.stream || false
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getApiKey() && { 'Authorization': `Bearer ${this.getApiKey()}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`vLLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (context.args.stream) {
        await this.handleStreamingResponse(response, context.res);
      } else {
        const data = await response.json();
        context.res.json(data);
      }
    } catch (error) {
      this.logger.error(`vLLM completion request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理模型列表请求
   */
  async handleModelList(context: RequestContext): Promise<UnifiedModelList> {
    const endpoint = `${context.baseUrl}/v1/models`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          ...(this.getApiKey() && { 'Authorization': `Bearer ${this.getApiKey()}` })
        }
      });

      if (!response.ok) {
        throw new Error(`vLLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // 转换为统一格式
      const unifiedList: UnifiedModelList = {
        models: data.data?.map((model: any) => ({
          name: model.id,
          size: 'unknown',
          digest: '',
          modified_at: model.created ? new Date(model.created * 1000).toISOString() : new Date().toISOString()
        })) || [],
        total: (data.data || []).length,
        framework: 'vllm'
      };

      context.res.json(unifiedList);
      return unifiedList;
    } catch (error) {
      this.logger.error(`vLLM model list request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理模型信息请求
   */
  async handleModelInfo(context: RequestContext): Promise<UnifiedModelInfo> {
    // vLLM 没有单独的模型信息端点，返回基本信息
    const modelInfo: UnifiedModelInfo = {
      name: context.effectiveModel || 'default',
      size: 'unknown',
      digest: '',
      modified_at: new Date().toISOString()
    };

    context.res.json(modelInfo);
    return modelInfo;
  }

  /**
   * 处理嵌入请求
   */
  async handleEmbeddings(context: RequestContext): Promise<any> {
    const endpoint = `${context.baseUrl}/v1/embeddings`;

    const requestBody = {
      model: context.effectiveModel || 'default',
      input: context.args.input
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getApiKey() && { 'Authorization': `Bearer ${this.getApiKey()}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`vLLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      context.res.json(data);
      return data;
    } catch (error) {
      this.logger.error(`vLLM embeddings request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 处理版本请求
   */
  async handleVersion(context: RequestContext): Promise<string> {
    // vLLM 没有专门的版本端点，返回默认版本信息
    const version = 'vLLM-unknown';
    context.res.json({ version });
    return version;
  }

  /**
   * 获取 API Key（从环境变量或配置中）
   */
  private getApiKey(): string | undefined {
    // 这里可以从配置服务获取 API Key
    // 暂时从环境变量获取
    return process.env['VLLM_API_KEY'];
  }
}
