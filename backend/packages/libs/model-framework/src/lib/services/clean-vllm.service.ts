import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { UnifiedModelService, UnifiedChatRequest, UnifiedCompletionRequest, UnifiedEmbeddingsRequest, UnifiedEmbeddingsResponse } from '../interfaces/service.interface';
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
export class CleanVllmService implements UnifiedModelService {
  readonly framework = ModelFramework.VLLM;
  private readonly logger = new Logger(CleanVllmService.name);
  private readonly baseUrl: string;

  constructor() {
    // Normalize URL by removing trailing slash
    const rawUrl = process.env['VLLM_API_URL'] || 'http://localhost:8000';
    this.baseUrl = rawUrl.replace(/\/$/, '');
  }

  /**
   * Chat completion - direct passthrough to vLLM
   * vLLM natively supports OpenAI format
   */
  async chat(args: UnifiedChatRequest, res: Response, pathname = '/v1/chat/completions'): Promise<void> {
    try {
      // Create task for earnings tracking
      const taskId = this.generateTaskId();
      
      // Direct passthrough to vLLM - no transformation needed
      // vLLM returns OpenAI-compatible responses
      await this.passthroughRequest(args, res, pathname, taskId);
      
    } catch (error) {
      this.logger.error(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Text completion - direct passthrough to vLLM
   */
  async complete(args: UnifiedCompletionRequest, res: Response, pathname = '/v1/completions'): Promise<void> {
    try {
      const taskId = this.generateTaskId();
      await this.passthroughRequest(args, res, pathname, taskId);
    } catch (error) {
      this.logger.error(`Completion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/models`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<UnifiedModelList> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/models`);

      const models: UnifiedModelInfo[] = response.data.data?.map((model: any) => ({
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
      const response = await axios.post(`${this.baseUrl}/v1/embeddings`, args);
      return response.data;
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
      await axios.get(`${this.baseUrl}/v1/models`);
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
   * Direct passthrough to vLLM with minimal interference
   * Simplified implementation using axios
   */
  private async passthroughRequest(args: any, res: Response, pathname: string, taskId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}${pathname}`;

      if (args.stream) {
        // Handle streaming response
        const response = await axios.post(url, args, {
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        response.data.pipe(res);

        response.data.on('end', () => {
          this.recordEarnings(taskId, {}).catch(err => {
            this.logger.warn(`Failed to record earnings: ${err.message}`);
          });
        });
      } else {
        // Handle non-streaming response
        const response = await axios.post(url, args);

        this.recordEarnings(taskId, response.data).catch(err => {
          this.logger.warn(`Failed to record earnings: ${err.message}`);
        });

        res.json(response.data);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record earnings (simplified)
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

  /**
   * Generate simple task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Extract model family from model name
   */
  private extractModelFamily(modelName: string): string {
    const familyPatterns = [
      { pattern: /llama/i, value: 'llama' },
      { pattern: /mistral/i, value: 'mistral' },
      { pattern: /deepseek/i, value: 'deepseek' },
      { pattern: /phi/i, value: 'phi' },
      { pattern: /qwen/i, value: 'qwen' },
      { pattern: /gemma/i, value: 'gemma' }
    ];

    for (const { pattern, value } of familyPatterns) {
      if (pattern.test(modelName)) {
        return value;
      }
    }

    return 'unknown';
  }

  /**
   * Extract parameter size from model name
   */
  private extractParameters(modelName: string): string {
    const paramMatch = modelName.match(/(\d+)[bB]/);
    return paramMatch ? `${paramMatch[1]}B` : 'unknown';
  }
}
