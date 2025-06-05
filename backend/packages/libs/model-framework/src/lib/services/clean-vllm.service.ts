import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { BaseModelService } from './base-model.service';
import { UnifiedChatRequest, UnifiedCompletionRequest, UnifiedEmbeddingsRequest, UnifiedEmbeddingsResponse } from '../interfaces/service.interface';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '../types/framework.types';

/**
 * Clean vLLM Service Implementation
 *
 * Core Principles:
 * 1. Minimal interference - only handle earnings and task management
 * 2. NO response transformation - let vLLM handle its own OpenAI-compatible responses
 * 3. NO header modification - let vLLM set appropriate headers
 * 4. Clean separation of concerns
 */
@Injectable()
export class CleanVllmService extends BaseModelService {
  readonly framework = ModelFramework.VLLM;
  protected readonly baseUrl: string;

  constructor() {
    super();
    // Normalize URL by removing trailing slash
    const rawUrl = process.env['VLLM_API_URL'] || 'http://localhost:8000';
    this.baseUrl = rawUrl.replace(/\/$/, '');
  }

  /**
   * Chat completion - direct passthrough to vLLM
   * vLLM natively supports OpenAI format
   */
  async chat(args: UnifiedChatRequest, res: Response, pathname = '/v1/chat/completions'): Promise<void> {
    const taskId = this.generateTaskId();
    await this.passthroughRequest(args, res, pathname, taskId);
  }

  /**
   * Text completion - direct passthrough to vLLM
   */
  async complete(args: UnifiedCompletionRequest, res: Response, pathname = '/v1/completions'): Promise<void> {
    const taskId = this.generateTaskId();
    await this.passthroughRequest(args, res, pathname, taskId);
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<boolean> {
    try {
      await this.makeRequest('/v1/models');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<UnifiedModelList> {
    try {
      const response = await this.makeRequest('/v1/models');

      const models: UnifiedModelInfo[] = response.data?.map((model: any) => ({
        name: model.id,
        size: 'unknown', // vLLM doesn't provide size info
        family: this.extractModelFamily(model.id),
        parameters: this.extractParameters(model.id),
        format: 'vllm',
        modified_at: model.created ? new Date(model.created * 1000).toISOString() : undefined,
        details: {
          object: model.object,
          owned_by: model.owned_by,
          permission: model.permission
        }
      })) || [];

      return {
        models,
        total: models.length,
        framework: ModelFramework.VLLM
      };
    } catch (error) {
      this.logger.error(`List models error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        models: [],
        total: 0,
        framework: ModelFramework.VLLM
      };
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    try {
      const modelList = await this.listModels();
      const model = modelList.models.find(m => m.name === modelName);
      
      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }
      
      return model;
    } catch (error) {
      this.logger.error(`Get model info error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(args: UnifiedEmbeddingsRequest): Promise<UnifiedEmbeddingsResponse> {
    try {
      return await this.makeRequest('/v1/embeddings', {
        method: 'POST',
        data: args
      });
    } catch (error) {
      this.logger.error(`Embeddings error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get service version
   */
  async getVersion(): Promise<{ version: string; framework: ModelFramework }> {
    try {
      // vLLM doesn't have a version endpoint, so we check models endpoint
      await this.makeRequest('/v1/models');
      return {
        version: 'vLLM (OpenAI Compatible)',
        framework: ModelFramework.VLLM
      };
    } catch (error) {
      return {
        version: 'unknown',
        framework: ModelFramework.VLLM
      };
    }
  }

  /**
   * Record earnings (vLLM-specific implementation)
   */
  private async recordEarnings(taskId: string, responseData: any): Promise<void> {
    try {
      // Simple earnings calculation based on token usage
      const promptTokens = responseData.usage?.prompt_tokens || 0;
      const completionTokens = responseData.usage?.completion_tokens || 0;

      // Log earnings (in production, this would save to database)
      this.logger.debug(`Task ${taskId}: ${promptTokens} prompt tokens, ${completionTokens} completion tokens`);
    } catch (error) {
      this.logger.warn(`Earnings recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
