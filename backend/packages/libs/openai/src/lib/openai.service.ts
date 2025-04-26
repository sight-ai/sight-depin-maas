import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { ModelOpenaiService } from './openai.interface';
import { ModelAdapter } from './adapters';
import { OpenAI } from '@saito/models';
import { OllamaService } from '@saito/ollama';
import got from 'got-cjs';

@Injectable()
export class DefaultModelOpenaiService implements ModelOpenaiService {
  private readonly logger = new Logger(DefaultModelOpenaiService.name);
  private readonly baseUrl: string;

  constructor(
    @Inject('OLLAMA_SERVICE')
    private readonly ollamaService: OllamaService,
  ) {
    this.baseUrl = (ollamaService as any).baseUrl;
  }

  async handleChat(params: z.infer<typeof OpenAI.OpenAIChatParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = ModelAdapter.fromOpenAIChatParams(params);
      
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
          const openAIResponse = ModelAdapter.toOpenAIChatResponse(ollamaResponse);
          if (typeof encodingOrCallback === 'function') {
            originalWrite(JSON.stringify(openAIResponse), 'utf8', encodingOrCallback);
          } else {
            originalWrite(JSON.stringify(openAIResponse), encodingOrCallback as BufferEncoding, callback);
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

  async handleCompletion(params: z.infer<typeof OpenAI.OpenAICompletionParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = ModelAdapter.fromOpenAICompletionParams(params);
      
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
          const openAIResponse = ModelAdapter.toOpenAICompletionResponse(ollamaResponse);
          if (typeof encodingOrCallback === 'function') {
            originalWrite(JSON.stringify(openAIResponse), 'utf8', encodingOrCallback);
          } else {
            originalWrite(JSON.stringify(openAIResponse), encodingOrCallback as BufferEncoding, callback);
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

  async listModels(): Promise<z.infer<typeof OpenAI.OllamaModelList>> {
    try {
      return await this.ollamaService.listModels();
    } catch (error) {
      this.logger.error('Error listing models:', error);
      return { models: [] };
    }
  }

  async listModelTags(): Promise<z.infer<typeof OpenAI.OllamaModelList>> {
    try {
      return await this.ollamaService.listModelTags();
    } catch (error) {
      this.logger.error('Error listing model tags:', error);
      return { models: [] };
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

  async listRunningModels(): Promise<z.infer<typeof OpenAI.OllamaRunningModels>> {
    try {
      return await this.ollamaService.listRunningModels();
    } catch (error) {
      this.logger.error('Error listing running models:', error);
      return { models: [] };
    }
  }

  async copyModel(args: z.infer<typeof OpenAI.OllamaModelCopyRequest>): Promise<void> {
    try {
      const url = new URL('api/copy', this.baseUrl);
      await got.post(url.toString(), {
        json: args,
        timeout: {
          request: 60000
        }
      });
    } catch (error) {
      this.logger.error('Error copying model:', error);
      throw error;
    }
  }

  async deleteModel(args: z.infer<typeof OpenAI.OllamaModelDeleteRequest>): Promise<void> {
    try {
      const url = new URL('api/delete', this.baseUrl);
      await got.delete(url.toString(), {
        json: args,
        timeout: {
          request: 60000
        }
      });
    } catch (error) {
      this.logger.error('Error deleting model:', error);
      throw error;
    }
  }

  async pullModel(args: z.infer<typeof OpenAI.OllamaModelPullRequest>): Promise<void> {
    try {
      const url = new URL('api/pull', this.baseUrl);
      await got.post(url.toString(), {
        json: args,
        timeout: {
          request: 60000
        }
      });
    } catch (error) {
      this.logger.error('Error pulling model:', error);
      throw error;
    }
  }

  async pushModel(args: z.infer<typeof OpenAI.OllamaModelPushRequest>): Promise<void> {
    try {
      const url = new URL('api/push', this.baseUrl);
      await got.post(url.toString(), {
        json: args,
        timeout: {
          request: 60000
        }
      });
    } catch (error) {
      this.logger.error('Error pushing model:', error);
      throw error;
    }
  }
}

export const ModelOpenaiServiceProvider = {
  provide: ModelOpenaiService,
  useClass: DefaultModelOpenaiService,
};
