import { Injectable, Logger } from '@nestjs/common';
import { IRequestDispatcher, RequestContext, RequestType } from '@saito/models';
import { OllamaChatHandler } from '../chat-handlers/ollama-chat.handler';
import { OllamaHealthChecker } from '../health-checkers/ollama-health.checker';
import { OllamaModelInfoService } from '../model-info-services/ollama-model-info.service';

/**
 * Ollama 请求调度器
 * 
 */
@Injectable()
export class OllamaRequestDispatcher implements IRequestDispatcher {
  private readonly logger = new Logger(OllamaRequestDispatcher.name);

  constructor(
    private readonly chatHandler: OllamaChatHandler,
    private readonly healthChecker: OllamaHealthChecker,
    private readonly modelInfoService: OllamaModelInfoService
  ) {}

  /**
   * 请求分发器 - 参考 Tunnel 中的 switch 模式
   */
  async dispatch(context: RequestContext): Promise<any> {
    this.logger.debug(`Dispatching Ollama request type: ${context.type}`);

    try {
      // 参考 Tunnel 中的 switch 分发模式
      switch (context.type) {
        case RequestType.CHAT:
          return await this.dispatchChatRequest(context);

        case RequestType.COMPLETION:
          return await this.dispatchCompletionRequest(context);

        case RequestType.EMBEDDINGS:
          return await this.dispatchEmbeddingsRequest(context);

        case RequestType.HEALTH_CHECK:
          return await this.dispatchHealthCheck(context);

        case RequestType.MODEL_LIST:
          return await this.dispatchModelList(context);

        case RequestType.MODEL_INFO:
          return await this.dispatchModelInfo(context);

        case RequestType.VERSION:
          return await this.dispatchVersion(context);

        default:
          this.logger.warn(`Unknown Ollama request type: ${context.type}`);
          throw new Error(`Unsupported request type: ${context.type}`);
      }
    } catch (error) {
      this.logger.error(`Ollama request dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 分发聊天请求
   */
  private async dispatchChatRequest(context: RequestContext): Promise<void> {
    if (!context.args || !context.res || !context.effectiveModel) {
      throw new Error('Invalid chat request context');
    }

    return this.chatHandler.handleChatRequest(
      context.args,
      context.res,
      context.baseUrl,
      context.effectiveModel,
      context.pathname
    );
  }

  /**
   * 分发补全请求
   */
  private async dispatchCompletionRequest(context: RequestContext): Promise<void> {
    this.logger.debug('Dispatching completion request to chat handler');
    return this.chatHandler.handleCompletion(context);
  }

  /**
   * 分发嵌入向量请求
   * TODO: 实现 OllamaEmbeddingsHandler
   */
  private async dispatchEmbeddingsRequest(context: RequestContext): Promise<any> {
    this.logger.warn('Embeddings request not yet implemented for Ollama');
    throw new Error('Embeddings not yet implemented for Ollama');
  }

  /**
   * 分发健康检查请求
   */
  private async dispatchHealthCheck(context: RequestContext): Promise<boolean> {
    return this.healthChecker.performHealthCheck(context.baseUrl);
  }

  /**
   * 分发模型列表请求
   */
  private async dispatchModelList(context: RequestContext): Promise<any> {
    return this.modelInfoService.fetchModelList(context.baseUrl);
  }

  /**
   * 分发模型信息请求
   */
  private async dispatchModelInfo(context: RequestContext): Promise<any> {
    if (!context.effectiveModel) {
      throw new Error('Model name is required for model info request');
    }

    return this.modelInfoService.fetchModelInfo(context.effectiveModel, context.baseUrl);
  }

  /**
   * 分发版本信息请求
   */
  private async dispatchVersion(context: RequestContext): Promise<string> {
    return this.modelInfoService.fetchVersion(context.baseUrl);
  }

  /**
   * 验证请求上下文
   */
  private validateContext(context: RequestContext): void {
    if (!context.baseUrl) {
      throw new Error('Base URL is required');
    }

    if (!context.type) {
      throw new Error('Request type is required');
    }
  }

  /**
   * 获取支持的请求类型
   */
  getSupportedRequestTypes(): RequestType[] {
    return [
      RequestType.CHAT,
      RequestType.COMPLETION,
      RequestType.HEALTH_CHECK,
      RequestType.MODEL_LIST,
      RequestType.MODEL_INFO,
      RequestType.VERSION
    ];
  }
}
