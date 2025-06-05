import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { UnifiedModelService, UnifiedChatRequest, UnifiedCompletionRequest, UnifiedEmbeddingsRequest, UnifiedEmbeddingsResponse } from '../interfaces/service.interface';
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
export class CleanOllamaService implements UnifiedModelService {
  readonly framework = ModelFramework.OLLAMA;
  private readonly logger = new Logger(CleanOllamaService.name);
  private readonly baseUrl: string;

  constructor() {
    // Normalize URL by removing trailing slash
    const rawUrl = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
    this.baseUrl = rawUrl.replace(/\/$/, '');
  }

  /**
   * Chat completion - direct passthrough to Ollama
   * Ollama natively supports both OpenAI and Ollama formats
   */
  async chat(args: UnifiedChatRequest, res: Response, pathname = '/api/chat'): Promise<void> {
    try {
      // Create task for earnings tracking
      const taskId = this.generateTaskId();
      
      // Direct passthrough to Ollama - no transformation needed
      // Ollama will automatically return the correct format based on the endpoint
      await this.passthroughRequest(args, res, pathname, taskId);
      
    } catch (error) {
      this.logger.error(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Text completion - direct passthrough to Ollama
   */
  async complete(args: UnifiedCompletionRequest, res: Response, pathname = '/api/generate'): Promise<void> {
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
      const response = await axios.get(`${this.baseUrl}/api/version`, { timeout: 5000 });
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
      const response = await axios.get(`${this.baseUrl}/api/tags`);

      const models: UnifiedModelInfo[] = response.data.models?.map((model: any) => ({
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
      const response = await axios.post(`${this.baseUrl}/api/show`, { name: modelName });
      const modelInfo = response.data;

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
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, args);
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
      const response = await axios.get(`${this.baseUrl}/api/version`);
      return {
        version: response.data.version || 'unknown',
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
   * Direct passthrough to Ollama with minimal interference
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
      const promptTokens = responseData.prompt_eval_count || 0;
      const completionTokens = responseData.eval_count || 0;
      
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
   * Format size from bytes to human readable
   */
  private formatSize(sizeInBytes: number): string {
    if (sizeInBytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));
    
    return parseFloat((sizeInBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
