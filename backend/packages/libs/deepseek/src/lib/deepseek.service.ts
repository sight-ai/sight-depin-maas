import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { ModelDeepSeekService } from './deepseek.interface';
import { ModelAdapter } from './adapters';
import { DeepSeek } from '@saito/models';
import { OllamaService } from '@saito/ollama';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseModelService } from '@saito/models';
import { MODEL_EVENTS } from '@saito/tunnel';

@Injectable()
export class DefaultModelDeepSeekService extends BaseModelService implements ModelDeepSeekService {
  constructor(
    @Inject('OLLAMA_SERVICE')
    private readonly ollamaService: OllamaService,
    eventEmitter: EventEmitter2
  ) {
    super(eventEmitter, 'deepseek', DefaultModelDeepSeekService.name);
    this.setupEventListeners();
  }

  protected override setupEventListeners(): void {
    // 监听聊天请求
    this.eventEmitter.on(MODEL_EVENTS.CHAT_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === 'deepseek') {
        try {
          const ollamaParams = ModelAdapter.fromDeepSeekChatParams(data.data);
          await this.ollamaService.chat(ollamaParams, this.createResponseHandler(data.taskId));
        } catch (error) {
          this.logger.error('Error handling chat request:', error);
          this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
            taskId: data.taskId,
            content: {
              error: 'Failed to process chat request',
              model: data.data.model,
              created_at: new Date().toISOString(),
              done: true
            }
          });
        }
      }
    });

    // 监听完成请求
    this.eventEmitter.on(MODEL_EVENTS.COMPLETION_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === 'deepseek') {
        try {
          const ollamaParams = ModelAdapter.fromDeepSeekCompletionParams(data.data);
          await this.ollamaService.complete(ollamaParams, this.createResponseHandler(data.taskId));
        } catch (error) {
          this.logger.error('Error handling completion request:', error);
          this.eventEmitter.emit(MODEL_EVENTS.COMPLETION_RESPONSE, {
            taskId: data.taskId,
            content: {
              error: 'Failed to process completion request',
              model: data.data.model,
              created_at: new Date().toISOString(),
              done: true
            }
          });
        }
      }
    });

    // 监听嵌入请求
    this.eventEmitter.on(MODEL_EVENTS.EMBEDDING_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === 'deepseek') {
        try {
          const ollamaParams = ModelAdapter.fromDeepSeekEmbeddingParams(data.data);
          const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
          const deepseekResponse = ModelAdapter.toDeepSeekEmbeddingResponse(ollamaResponse, data.data.model);
          this.eventEmitter.emit(MODEL_EVENTS.EMBEDDING_RESPONSE, {
            taskId: data.taskId,
            content: deepseekResponse
          });
        } catch (error) {
          this.logger.error('Error handling embedding request:', error);
          this.eventEmitter.emit(MODEL_EVENTS.EMBEDDING_RESPONSE, {
            taskId: data.taskId,
            content: {
              error: 'Failed to process embedding request',
              model: data.data.model,
              created_at: new Date().toISOString(),
              done: true
            }
          });
        }
      }
    });
  }

  protected override createResponseHandler(taskId: string): Response {
    const response = {
      write: (chunk: any) => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: chunk
        });
      },
      end: () => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: JSON.stringify({ done: true })
        });
      },
      status: (code: number) => response,
      json: (data: any) => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: JSON.stringify(data)
        });
        return response;
      },
      setHeader: () => response,
      headersSent: false,
      writableEnded: false,
      // 添加必要的属性
      sendStatus: () => response,
      links: () => response,
      send: () => response,
      jsonp: () => response,
      // 添加其他必要的属性
      ...Object.fromEntries(
        Array.from({ length: 87 }, (_, i) => [`prop${i}`, () => response])
      )
    } as unknown as Response;

    return response;
  }

  async handleChat(params: z.infer<typeof DeepSeek.DeepSeekChatParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = ModelAdapter.fromDeepSeekChatParams(params);
      
      let responseData = '';
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);
      const logger = this.logger;

      res.write = function(chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }
        if (typeof encodingOrCallback === 'function') {
          return originalWrite(chunk, 'utf8', encodingOrCallback);
        }
        return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
      };

      res.end = function(chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }
        
        try {
          const ollamaResponse = JSON.parse(responseData);
          const deepseekResponse = ModelAdapter.toDeepSeekChatResponse(ollamaResponse);
          if (typeof encodingOrCallback === 'function') {
            originalWrite(JSON.stringify(deepseekResponse), 'utf8', encodingOrCallback);
          } else {
            originalWrite(JSON.stringify(deepseekResponse), encodingOrCallback as BufferEncoding, callback);
          }
        } catch (error) {
          logger.error('Error converting response:', error);
          if (typeof encodingOrCallback === 'function') {
            originalWrite(responseData, 'utf8', encodingOrCallback);
          } else {
            originalWrite(responseData, encodingOrCallback as BufferEncoding, callback);
          }
        }
        
        if (typeof encodingOrCallback === 'function') {
          return originalEnd(chunk, 'utf8', encodingOrCallback);
        }
        return originalEnd(chunk, encodingOrCallback as BufferEncoding, callback);
      };

      await this.ollamaService.chat(ollamaParams, res);
    } catch (error) {
      this.logger.error('Error handling chat request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to process chat request',
          model: params.model,
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  async handleCompletion(params: z.infer<typeof DeepSeek.DeepSeekCompletionParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = ModelAdapter.fromDeepSeekCompletionParams(params);
      
      let responseData = '';
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);
      const logger = this.logger;

      res.write = function(chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }
        if (typeof encodingOrCallback === 'function') {
          return originalWrite(chunk, 'utf8', encodingOrCallback);
        }
        return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
      };

      res.end = function(chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }
        
        try {
          const ollamaResponse = JSON.parse(responseData);
          const deepseekResponse = ModelAdapter.toDeepSeekCompletionResponse(ollamaResponse);
          if (typeof encodingOrCallback === 'function') {
            originalWrite(JSON.stringify(deepseekResponse), 'utf8', encodingOrCallback);
          } else {
            originalWrite(JSON.stringify(deepseekResponse), encodingOrCallback as BufferEncoding, callback);
          }
        } catch (error) {
          logger.error('Error converting response:', error);
          if (typeof encodingOrCallback === 'function') {
            originalWrite(responseData, 'utf8', encodingOrCallback);
          } else {
            originalWrite(responseData, encodingOrCallback as BufferEncoding, callback);
          }
        }
        
        if (typeof encodingOrCallback === 'function') {
          return originalEnd(chunk, 'utf8', encodingOrCallback);
        }
        return originalEnd(chunk, encodingOrCallback as BufferEncoding, callback);
      };

      await this.ollamaService.complete(ollamaParams, res);
    } catch (error) {
      this.logger.error('Error handling completion request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to process completion request',
          model: params.model,
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  async handleEmbedding(params: z.infer<typeof DeepSeek.DeepSeekEmbeddingParams>): Promise<z.infer<typeof DeepSeek.DeepSeekEmbeddingResponse>> {
    try {
      const ollamaParams = ModelAdapter.fromDeepSeekEmbeddingParams(params);
      const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
      return ModelAdapter.toDeepSeekEmbeddingResponse(ollamaResponse, params.model);
    } catch (error) {
      this.logger.error('Error handling embedding request:', error);
      throw error;
    }
  }

  async checkStatus(): Promise<boolean> {
    try {
      return await this.ollamaService.checkStatus();
    } catch (error) {
      this.logger.error('Error checking service status:', error);
      return false;
    }
  }

  async listModels(): Promise<{ object: string; data: Array<{ id: string; object: string; owned_by: string }> }> {
    try {
      const ollamaModels = await this.ollamaService.listModels();
      return {
        object: 'list',
        data: ollamaModels.models.map(model => ({
          id: model.name,
          object: 'model',
          owned_by: 'deepseek'
        }))
      };
    } catch (error) {
      this.logger.error('Error listing models:', error);
      return {
        object: 'list',
        data: []
      };
    }
  }

  async listModelTags(): Promise<{ object: string; data: Array<{ id: string; object: string; owned_by: string }> }> {
    try {
      const ollamaModels = await this.ollamaService.listModelTags();
      return {
        object: 'list',
        data: ollamaModels.models.map(model => ({
          id: model.name,
          object: 'model',
          owned_by: 'deepseek'
        }))
      };
    } catch (error) {
      this.logger.error('Error listing model tags:', error);
      return {
        object: 'list',
        data: []
      };
    }
  }

  async showModelInformation(args: { name: string }): Promise<z.infer<typeof DeepSeek.OllamaModelInfo>> {
    try {
      return await this.ollamaService.showModelInformation(args);
    } catch (error) {
      this.logger.error('Error showing model information:', error);
      return {
        template: '',
        parameters: '',
        modelfile: '',
        details: {
          format: '',
          parent_model: '',
          family: '',
          families: [],
          parameter_size: '',
          quantization_level: ''
        },
        model_info: {},
        capabilities: []
      };
    }
  }

  async showModelVersion(): Promise<z.infer<typeof DeepSeek.OllamaVersionResponse>> {
    try {
      return await this.ollamaService.showModelVersion();
    } catch (error) {
      this.logger.error('Error showing model version:', error);
      return { version: 'unknown' };
    }
  }

  protected override async handleChatRequest(data: { taskId: string, data: any }): Promise<void> {
    const ollamaParams = ModelAdapter.fromDeepSeekChatParams(data.data);
    await this.ollamaService.chat(ollamaParams, this.createResponseHandler(data.taskId));
  }

  protected override async handleCompletionRequest(data: { taskId: string, data: any }): Promise<void> {
    const ollamaParams = ModelAdapter.fromDeepSeekCompletionParams(data.data);
    await this.ollamaService.complete(ollamaParams, this.createResponseHandler(data.taskId));
  }

  protected override async handleEmbeddingRequest(data: { taskId: string, data: any }): Promise<void> {
    const ollamaParams = ModelAdapter.fromDeepSeekEmbeddingParams(data.data);
    const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
    const deepseekResponse = ModelAdapter.toDeepSeekEmbeddingResponse(ollamaResponse, data.data.model);
    this.eventEmitter.emit('model.embedding.response', {
      taskId: data.taskId,
      content: deepseekResponse
    });
  }
}

export const ModelDeepSeekServiceProvider = {
  provide: ModelDeepSeekService,
  useClass: DefaultModelDeepSeekService,
};
