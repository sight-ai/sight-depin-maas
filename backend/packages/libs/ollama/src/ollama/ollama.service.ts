import { Inject, Injectable } from "@nestjs/common";
import { Response } from 'express';
import { z } from 'zod';
import { MinerService } from '@saito/miner';
import { DeviceStatusService } from '@saito/device-status';
import { BaseModelService } from './core/base-model.service';
import {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OllamaModelList,
  OllamaModelInfo,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaRunningModels,
  OllamaVersionResponse,
  OpenAICompletionRequest,
  OpenAIChatCompletionRequest
} from '@saito/models';
import { OllamaService } from './core/ollama.interface';
import { OllamaApiClient } from './api/ollama-api.client';
import { OllamaRequestHandler } from './handlers/ollama-request.handler';
import { OllamaStreamHandler } from './handlers/ollama-stream.handler';
import { ChatHandler } from './chat/chat-handler';
import { TaskUpdateData } from './types/ollama.types';

/**
 * Implementation of the Ollama service
 */
@Injectable()
export class DefaultOllamaService extends BaseModelService implements OllamaService {
  private readonly apiClient: OllamaApiClient;
  private readonly requestHandler: OllamaRequestHandler;
  private readonly streamHandler: OllamaStreamHandler;
  private readonly chatHandler: ChatHandler;

  constructor(
    @Inject(MinerService)
    protected override readonly minerService: MinerService,
    @Inject(DeviceStatusService)
    protected override readonly deviceStatusService: DeviceStatusService
  ) {
    super('ollama', DefaultOllamaService.name, minerService, deviceStatusService);
    
    // Initialize dependencies
    this.apiClient = new OllamaApiClient();
    this.streamHandler = new OllamaStreamHandler();
    this.requestHandler = new OllamaRequestHandler(this.apiClient, this.streamHandler);
    this.chatHandler = new ChatHandler(this.apiClient, this.streamHandler);
    
    
  }

  // Public API methods
  
  /**
   * Text completion request
   */
  async complete(
    args: z.infer<typeof OllamaGenerateRequest | typeof OpenAICompletionRequest>, 
    res: Response, 
    pathname = 'api/generate'
  ): Promise<void> {
    
    await this.chatHandler.handleCompletionRequest(
      args, 
      res, 
      pathname,
      this.createTask.bind(this),
      this.updateTask.bind(this),
      this.createEarnings.bind(this)
    );
  }

  /**
   * Chat completion request
   */
  async chat(
    args: z.infer<typeof OllamaChatRequest | typeof OpenAIChatCompletionRequest>, 
    res: Response, 
    pathname = 'api/chat'
  ): Promise<void> {
    
    await this.chatHandler.handleChatRequest(
      args, 
      res, 
      pathname,
      this.createTask.bind(this),
      this.updateTask.bind(this),
      this.createEarnings.bind(this)
    );
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<boolean> {
    return this.apiClient.checkStatus();
  }

  /**
   * List model tags
   */
  async listModelTags(): Promise<z.infer<typeof OllamaModelList>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaModelList>>('tags');
    } catch (error) {
      this.logger.error('Failed to list model tags:', error);
      return { models: [] };
    }
  }

  /**
   * List model tags
   */
  async listModelOpenai(): Promise<z.infer<typeof OllamaModelList>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaModelList>>('v1/models');
    } catch (error) {
      this.logger.error('Failed to list model tags:', error);
      return { models: [] };
    }
  }
  /**
   * Show model information
   */
  async showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaModelInfo>>('show', 'POST', args);
    } catch (error) {
      this.logger.error(`Failed to show model information for ${args.name}:`, error);
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
   /**
   * Show model information
   */
  async showModelInformationOpenai(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaModelInfo>>('v1/models', 'POST', args);
    } catch (error) {
      this.logger.error(`Failed to show model information for ${args.name}:`, error);
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

  /**
   * Show model version
   */
  async showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaVersionResponse>>('api/version');
    } catch (error) {
      this.logger.error('Failed to show model version:', error);
      return { version: 'unknown' };
    }
  }
  /**
   * Show model version
   */
  async showModelVersionOpenai(): Promise<z.infer<typeof OllamaVersionResponse>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaVersionResponse>>('version');
    } catch (error) {
      this.logger.error('Failed to show model version:', error);
      return { version: 'unknown' };
    }
  }
  /**
   * List models (alias for listModelTags)
   */
  async listModels(): Promise<z.infer<typeof OllamaModelList>> {
    return this.listModelTags();
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaEmbeddingsResponse>>('embeddings', 'POST', args);
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
  /**
   * Generate embeddings
   */
  async generateEmbeddingsOpenai(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaEmbeddingsResponse>>('v1/embeddings', 'POST', args);
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
  /**
   * List running models
   */
  async listRunningModels(): Promise<z.infer<typeof OllamaRunningModels>> {
    try {
      return await this.apiClient.sendRequest<z.infer<typeof OllamaRunningModels>>('running');
    } catch (error) {
      this.logger.error('Failed to list running models:', error);
      return { models: [] };
    }
  }

  /**
   * Update task status
   */
  protected override async updateTask(taskId: string, data: TaskUpdateData): Promise<void> {
    await super.updateTask(taskId, data);
  }
}

const OllamaServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OllamaServiceProvider;
export { OllamaService };
