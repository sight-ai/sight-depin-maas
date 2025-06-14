import { Injectable, Logger } from '@nestjs/common';
import { IRequestDispatcher, RequestContext, RequestType } from '@saito/models';
import { VllmChatHandler } from '../chat-handlers/vllm-chat.handler';
import { VllmHealthChecker } from '../health-checkers/vllm-health.checker';

/**
 * vLLM 请求调度器
 * 
 */
@Injectable()
export class VllmRequestDispatcher implements IRequestDispatcher {
  private readonly logger = new Logger(VllmRequestDispatcher.name);

  constructor(
    private readonly chatHandler: VllmChatHandler,
    private readonly healthChecker: VllmHealthChecker
  ) {}

  /**
   * 调度请求到对应的处理器
   */
  async dispatch(context: RequestContext): Promise<any> {
    try {
      this.logger.debug(`Dispatching vLLM request: ${context.type}`);

      switch (context.type) {
        case RequestType.CHAT:
          return await this.chatHandler.handleChat(context);

        case RequestType.COMPLETION:
          return await this.chatHandler.handleCompletion(context);

        case RequestType.HEALTH_CHECK:
          return await this.healthChecker.checkHealth(context.baseUrl);

        case RequestType.MODEL_LIST:
          return await this.chatHandler.handleModelList(context);

        case RequestType.MODEL_INFO:
          return await this.chatHandler.handleModelInfo(context);

        case RequestType.EMBEDDINGS:
          return await this.chatHandler.handleEmbeddings(context);

        case RequestType.VERSION:
          return await this.chatHandler.handleVersion(context);

        default:
          throw new Error(`Unsupported request type: ${context.type}`);
      }
    } catch (error) {
      this.logger.error(`vLLM request dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
