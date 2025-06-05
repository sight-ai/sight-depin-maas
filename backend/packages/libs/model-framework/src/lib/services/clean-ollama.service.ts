import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { BaseModelService } from './base-model.service';
import { UnifiedChatRequest, UnifiedCompletionRequest, UnifiedEmbeddingsRequest, UnifiedEmbeddingsResponse } from '../interfaces/service.interface';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '../types/framework.types';

/**
 * Clean Ollama Service Implementation
 *
 * Core Principles:
 * 1. Minimal interference - only handle earnings and task management
 * 2. NO response transformation - let Ollama handle its own protocol conversion
 * 3. NO header modification - let Ollama set appropriate headers
 * 4. Clean separation of concerns
 */
@Injectable()
export class CleanOllamaService extends BaseModelService {
  readonly framework = ModelFramework.OLLAMA;
  protected readonly baseUrl: string;

  constructor() {
    super();
    // Normalize URL by removing trailing slash
    const rawUrl = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
    this.baseUrl = rawUrl.replace(/\/$/, '');
  }

  /**
   * Chat completion - direct passthrough to Ollama
   * Ollama natively supports both OpenAI and Ollama formats
   */
  async chat(args: UnifiedChatRequest, res: Response, pathname = '/api/chat'): Promise<void> {
    const taskId = this.generateTaskId();
    await this.passthroughRequest(args, res, pathname, taskId);
  }

  /**
   * Text completion - direct passthrough to Ollama
   */
  async complete(args: UnifiedCompletionRequest, res: Response, pathname = '/api/generate'): Promise<void> {
    const taskId = this.generateTaskId();
    await this.passthroughRequest(args, res, pathname, taskId);
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<boolean> {
    try {
      await this.makeRequest('/api/version');
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
      const response = await this.makeRequest('/api/tags');

      const models: UnifiedModelInfo[] = response.models?.map((model: any) => ({
        name: model.name,
        size: this.formatSize(model.size || 0),
        family: this.extractModelFamily(model.name),
        parameters: this.extractParameters(model.name),
        format: 'ollama',
        modified_at: model.modified_at,
        digest: model.digest,
        details: model.details
      })) || [];

      return {
        models,
        total: models.length,
        framework: ModelFramework.OLLAMA
      };
    } catch (error) {
      this.logger.error(`List models error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        models: [],
        total: 0,
        framework: ModelFramework.OLLAMA
      };
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<UnifiedModelInfo> {
    try {
      const modelInfo = await this.makeRequest('/api/show', {
        method: 'POST',
        data: { name: modelName }
      });

      return {
        name: modelName,
        family: modelInfo.details?.family || this.extractModelFamily(modelName),
        parameters: modelInfo.details?.parameter_size || this.extractParameters(modelName),
        quantization: modelInfo.details?.quantization_level,
        format: 'ollama',
        details: modelInfo
      };
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
      return await this.makeRequest('/api/embeddings', {
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
      const response = await this.makeRequest('/api/version');
      return {
        version: response.version || 'unknown',
        framework: ModelFramework.OLLAMA
      };
    } catch (error) {
      return {
        version: 'unknown',
        framework: ModelFramework.OLLAMA
      };
    }
  }

  /**
   * Record earnings (Ollama-specific implementation)
   */
  private async recordEarnings(taskId: string, responseData: any): Promise<void> {
    try {
      // Simple earnings calculation based on token usage
      const promptTokens = responseData.prompt_eval_count || 0;
      const completionTokens = responseData.eval_count || 0;

      // Log earnings (in production, this would save to database)
      this.logger.debug(`Task ${taskId}: ${promptTokens} prompt tokens, ${completionTokens} completion tokens`);
    } catch (error) {
      this.logger.warn(`Earnings recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
