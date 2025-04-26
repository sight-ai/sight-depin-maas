import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { ModelDeepSeekService } from './deepseek.interface';
import { ModelAdapter } from './adapters';
import { DeepSeek } from '@saito/models';
import { OllamaService } from '@saito/ollama';
import got from 'got-cjs';

@Injectable()
export class DefaultModelDeepSeekService implements ModelDeepSeekService {
  private readonly logger = new Logger(DefaultModelDeepSeekService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    @Inject('OLLAMA_SERVICE')
    private readonly ollamaService: OllamaService,
    @Inject('DEEPSEEK_API_KEY')
    private readonly deepseekApiKey: string,
  ) {
    this.baseUrl = 'https://api.deepseek.com/v1';
    this.apiKey = deepseekApiKey;
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

  async listModels(): Promise<z.infer<typeof DeepSeek.OllamaModelList>> {
    try {
      return await this.ollamaService.listModels();
    } catch (error) {
      this.logger.error('Error listing models:', error);
      return { models: [] };
    }
  }

  async listModelTags(): Promise<z.infer<typeof DeepSeek.OllamaModelList>> {
    try {
      return await this.ollamaService.listModelTags();
    } catch (error) {
      this.logger.error('Error listing model tags:', error);
      return { models: [] };
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

  async listRunningModels(): Promise<z.infer<typeof DeepSeek.OllamaRunningModels>> {
    try {
      return await this.ollamaService.listRunningModels();
    } catch (error) {
      this.logger.error('Error listing running models:', error);
      return { models: [] };
    }
  }

  async copyModel(args: z.infer<typeof DeepSeek.OllamaModelCopyRequest>): Promise<void> {
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

  async deleteModel(args: z.infer<typeof DeepSeek.OllamaModelDeleteRequest>): Promise<void> {
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

  async pullModel(args: z.infer<typeof DeepSeek.OllamaModelPullRequest>): Promise<void> {
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

  async pushModel(args: z.infer<typeof DeepSeek.OllamaModelPushRequest>): Promise<void> {
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

export const ModelDeepSeekServiceProvider = {
  provide: ModelDeepSeekService,
  useClass: DefaultModelDeepSeekService,
};
