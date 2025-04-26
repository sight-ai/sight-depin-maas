import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { ModelOpenaiService } from './openai.interface';
import { ModelAdapter } from './adapters';
import { OpenAI } from '@saito/models';
import { OllamaService } from '@saito/ollama';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseModelService } from '@saito/models';
import { MODEL_EVENTS } from '@saito/tunnel';

@Injectable()
export class DefaultModelOpenaiService extends BaseModelService implements ModelOpenaiService {

  constructor(
    @Inject('OLLAMA_SERVICE')
    private readonly ollamaService: OllamaService,
    eventEmitter: EventEmitter2
  ) {
    super(eventEmitter, 'openai', DefaultModelOpenaiService.name);
  }

  protected override setupEventListeners(): void {
    // 监听聊天请求
    this.eventEmitter.on(MODEL_EVENTS.CHAT_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === 'openai') {
        try {
          const ollamaParams = ModelAdapter.fromOpenAIChatParams(data.data);
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
      if (data.serviceType === 'openai') {
        try {
          const ollamaParams = ModelAdapter.fromOpenAICompletionParams(data.data);
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
      if (data.serviceType === 'openai') {
        try {
          const ollamaParams = ModelAdapter.fromOpenAIEmbeddingParams(data.data);
          const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
          const openAIResponse = ModelAdapter.toOpenAIEmbeddingResponse(ollamaResponse, data.data.model);
          this.eventEmitter.emit(MODEL_EVENTS.EMBEDDING_RESPONSE, {
            taskId: data.taskId,
            content: openAIResponse
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

  async handleChat(params: z.infer<typeof OpenAI.OpenAIChatParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = ModelAdapter.fromOpenAIChatParams(params);
      if (params.stream) {
        // Set streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }

      let responseData = '';
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);
      const originaljson = res.json.bind(res);
      const logger = this.logger;

      res.write = function (chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }

        try {
          const ollamaResponse = JSON.parse(chunk.toString());
          const openAIResponse = ModelAdapter.toOpenAIChatResponse(ollamaResponse);
          const eventData = `data: ${JSON.stringify(openAIResponse)}\n\n`;

          if (typeof encodingOrCallback === 'function') {
            return originalWrite(eventData, 'utf8', encodingOrCallback);
          }
          return originalWrite(eventData, encodingOrCallback as BufferEncoding, callback);
        } catch (error) {
          logger.error('Error processing chunk:', error);
          return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
        }
      };

      res.end = function (chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }

        try {
          if (responseData.trim()) {
            const ollamaResponse = JSON.parse(responseData);
            const openAIResponse = ModelAdapter.toOpenAIChatResponse(ollamaResponse);
            const eventData = `data: ${JSON.stringify({
              id: openAIResponse.id,
              object: "chat.completion.chunk",
              created: openAIResponse.created,
              model: openAIResponse.model,
              service_tier: "default",
              system_fingerprint: null,
              choices: [{
                index: 0,
                delta: {},
                logprobs: null,
                finish_reason: "stop"
              }]
            })}\n\n`;
            if (typeof encodingOrCallback === 'function') {
              originalWrite(eventData, 'utf8', encodingOrCallback);
            } else {
              originalWrite(eventData, encodingOrCallback as BufferEncoding, callback);
            }
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

      res.json = function (data: any) {
        const openAIResponse = ModelAdapter.toOpenAIChatResponse(data);
        return originaljson(openAIResponse);
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

  async handleCompletion(params: z.infer<typeof OpenAI.OpenAICompletionParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = ModelAdapter.fromOpenAICompletionParams(params);

      if (params.stream) {
        // Set streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }

      let responseData = '';
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);
      const logger = this.logger;

      res.write = function (chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }

        try {
          if (params.stream) {
            const ollamaResponse = JSON.parse(chunk.toString());
            const openAIResponse = ModelAdapter.toOpenAIStreamingResponse(ollamaResponse);
            const eventData = `data: ${JSON.stringify(openAIResponse)}\n\n`;
            return originalWrite(eventData, 'utf8', encodingOrCallback as any);
          } else {
            return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
          }
        } catch (error) {
          logger.error('Error processing chunk:', error);
          return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
        }
      };

      res.end = function (chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
        if (typeof chunk === 'string') {
          responseData += chunk;
        }

        try {
          if (responseData.trim()) {
            const ollamaResponse = JSON.parse(responseData);
            const openAIResponse = ModelAdapter.toOpenAIStreamingResponse(ollamaResponse);
            if (params.stream) {
              const eventData = `data: ${JSON.stringify({
                id: openAIResponse.id,
                object: "text_completion",
                created: openAIResponse.created,
                model: openAIResponse.model,
                choices: [{
                  text: "",
                  index: 0,
                  logprobs: null,
                  finish_reason: "stop"
                }]
              })}\n\n`;
              originalWrite(eventData, 'utf8', encodingOrCallback as any);
            } else {
              originalWrite(JSON.stringify(openAIResponse), 'utf8', encodingOrCallback as any);
            }
          }
        } catch (error) {
          logger.error('Error converting response:', error);
          originalWrite(responseData, 'utf8', encodingOrCallback as any);
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

  async handleEmbedding(params: z.infer<typeof OpenAI.OpenAIEmbeddingParams>): Promise<z.infer<typeof OpenAI.OpenAIEmbeddingResponse>> {
    try {
      const ollamaParams = ModelAdapter.fromOpenAIEmbeddingParams(params);
      const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
      return ModelAdapter.toOpenAIEmbeddingResponse(ollamaResponse, params.model);
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

  async listModels(): Promise<{ object: string; data: Array<{ id: string; object: string; created: number; owned_by: string }> }> {
    try {
      const ollamaModels = await this.ollamaService.listModels();
      return {
        object: 'list',
        data: ollamaModels.models.map(model => ({
          id: model.name,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'openai'
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

  async listModelTags(): Promise<{ object: string; data: Array<{ id: string; object: string; created: number; owned_by: string }> }> {
    try {
      const ollamaModels = await this.ollamaService.listModelTags();
      return {
        object: 'list',
        data: ollamaModels.models.map(model => ({
          id: model.name,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'openai'
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

  async showModelInformation(args: { name: string }): Promise<z.infer<typeof OpenAI.OllamaModelInfo>> {
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

  async showModelVersion(): Promise<z.infer<typeof OpenAI.OllamaVersionResponse>> {
    try {
      return await this.ollamaService.showModelVersion();
    } catch (error) {
      this.logger.error('Error showing model version:', error);
      return { version: 'unknown' };
    }
  }

  protected override async handleChatRequest(data: { taskId: string, data: any }): Promise<void> {
    const ollamaParams = ModelAdapter.fromOpenAIChatParams(data.data);
    await this.ollamaService.chat(ollamaParams, this.createResponseHandler(data.taskId));
  }

  protected override async handleCompletionRequest(data: { taskId: string, data: any }): Promise<void> {
    const ollamaParams = ModelAdapter.fromOpenAICompletionParams(data.data);
    await this.ollamaService.complete(ollamaParams, this.createResponseHandler(data.taskId));
  }

  protected override async handleEmbeddingRequest(data: { taskId: string, data: any }): Promise<void> {
    const ollamaParams = ModelAdapter.fromOpenAIEmbeddingParams(data.data);
    const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
    const openAIResponse = ModelAdapter.toOpenAIEmbeddingResponse(ollamaResponse, data.data.model);
    this.eventEmitter.emit('model.embedding.response', {
      taskId: data.taskId,
      content: openAIResponse
    });
  }
}

export const ModelOpenaiServiceProvider = {
  provide: ModelOpenaiService,
  useClass: DefaultModelOpenaiService,
};
