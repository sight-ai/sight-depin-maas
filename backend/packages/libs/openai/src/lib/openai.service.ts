import { Inject, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { ModelOpenaiService } from './openai.interface';
import { OpenAIOllamaAdapter } from './adapters';
import { OpenAI, OllamaModelInfo, OllamaVersionResponse } from '@saito/models';
import { OllamaService } from '@saito/ollama';
import { BaseModelService } from '@saito/ollama';
import { MinerService } from '@saito/miner';
import { DeviceStatusService } from '@saito/device-status';

@Injectable()
export class DefaultModelOpenaiService extends BaseModelService implements ModelOpenaiService {

  constructor(
    @Inject(OllamaService)
    private readonly ollamaService: OllamaService,
    @Inject(MinerService)
    protected override readonly minerService: MinerService,
    @Inject(DeviceStatusService)
    protected override readonly deviceStatusService: DeviceStatusService,
  ) {
    super('openai', DefaultModelOpenaiService.name, minerService, deviceStatusService);
  }

  async handleChat(params: z.infer<typeof OpenAI.ChatParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = OpenAIOllamaAdapter.toOllamaChatParams(params);

      if (params.stream) {
        // Set streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Override response write and end methods for streaming
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);
        const logger = this.logger;

        res.write = function (chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
          try {
            const ollamaResponse = JSON.parse(chunk.toString());
            const openAIResponse = OpenAIOllamaAdapter.toOpenAIStreamingResponse(ollamaResponse, 'chat');
            const eventData = `data: ${JSON.stringify(openAIResponse)}\n\n`;
            
            // if (ollamaResponse.done) {
            //   const doneEvent = `data: ${JSON.stringify(openAIResponse)}\n\ndata: [DONE]\n\n`;
            //   return originalWrite(doneEvent, 'utf8', callback);
            // }

            return originalWrite(eventData, 'utf8', callback);
          } catch (error) {
            logger.error('Error processing chunk:', error);
            return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
          }
        };

        res.end = function (chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
          if (chunk) {
            const ollamaResponse = JSON.parse(chunk.toString());
            const openAIResponse = OpenAIOllamaAdapter.toOpenAIStreamingResponse(ollamaResponse, 'chat');
            res.write(JSON.stringify(openAIResponse));
          }
          return originalEnd(undefined, encodingOrCallback as BufferEncoding, callback);
        };

        await this.ollamaService.chat(ollamaParams, res);
      } else {
        const ollamaResponse = await this.ollamaService.chat(ollamaParams, res);
        const openAIResponse = OpenAIOllamaAdapter.toOpenAIChatResponse(ollamaResponse);
        res.json(openAIResponse);
      }
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

  async handleCompletion(params: z.infer<typeof OpenAI.CompletionParams>, res: Response): Promise<void> {
    try {
      const ollamaParams = OpenAIOllamaAdapter.toOllamaCompletionParams(params);

      if (params.stream) {
        // Set streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Override response write and end methods for streaming
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);
        const logger = this.logger;

        res.write = function (chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
          try {
            const ollamaResponse = JSON.parse(chunk.toString());
            const openAIResponse = OpenAIOllamaAdapter.toOpenAIStreamingResponse(ollamaResponse, 'completion');
            const eventData = `data: ${JSON.stringify(openAIResponse)}\n\n`;

            return originalWrite(eventData, 'utf8', callback);
          } catch (error) {
            logger.error('Error processing chunk:', error);
            return originalWrite(chunk, encodingOrCallback as BufferEncoding, callback);
          }
        };

        res.end = function (chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
          if (chunk) {
            const ollamaResponse = JSON.parse(chunk.toString());
            const openAIResponse = OpenAIOllamaAdapter.toOpenAIStreamingResponse(ollamaResponse, 'completion');
            res.write(JSON.stringify(openAIResponse));
          }
          return originalEnd(undefined, encodingOrCallback as BufferEncoding, callback);
        };

        await this.ollamaService.complete(ollamaParams, res);
      } else {
        const ollamaResponse = await this.ollamaService.complete(ollamaParams, res);
        const openAIResponse = OpenAIOllamaAdapter.toOpenAICompletionResponse(ollamaResponse);
        res.json(openAIResponse);
      }
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

  async handleEmbedding(params: z.infer<typeof OpenAI.EmbeddingParams>): Promise<z.infer<typeof OpenAI.OpenAIEmbeddingResponse>> {
    try {
      const ollamaParams = OpenAIOllamaAdapter.toOllamaEmbeddingParams(params);
      const ollamaResponse = await this.ollamaService.generateEmbeddings(ollamaParams);
      return OpenAIOllamaAdapter.toOpenAIEmbeddingResponse(ollamaResponse, params.model);
    } catch (error) {
      this.logger.error('Error handling embedding request:', error);
      throw error;
    }
  }

  async listModels(): Promise<z.infer<typeof OpenAI.OpenAIListModelsResponse>> {
    try {
      const ollamaModels = await this.ollamaService.listModels();
      return OpenAIOllamaAdapter.toOpenAIModelList(ollamaModels);
    } catch (error) {
      this.logger.error('Error listing models:', error);
      return {
        object: 'list',
        data: []
      };
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

  async showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>> {
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
      };
    }
  }

  async showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>> {
    try {
      return await this.ollamaService.showModelVersion();
    } catch (error) {
      this.logger.error('Error showing model version:', error);
      return { version: 'unknown' };
    }
  }
}

export const ModelOpenaiServiceProvider = {
  provide: ModelOpenaiService,
  useClass: DefaultModelOpenaiService,
};
