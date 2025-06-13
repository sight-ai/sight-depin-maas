import { Controller, Post, Get, Body, Res, Logger, UseInterceptors } from '@nestjs/common';
import { UnifiedModelService } from '@saito/model-inference-client';
import { EarningsTrackingInterceptor } from '@saito/earnings-tracking';
import { Response } from 'express';
import {
  OllamaChatRequestSchema,
  OllamaGenerateRequestSchema,
  OllamaChatRequest,
  OllamaGenerateRequest
} from '@saito/models';
import z from 'zod';

/**
 * Clean Ollama Controller
 * 
 * Purpose: Provide Ollama-compatible API endpoints with minimal interference
 * 
 * Key Principles:
 * 1. Direct passthrough to Ollama service
 * 2. No response transformation - let Ollama handle its own formats
 * 3. Clean error handling
 * 4. Support both Ollama and OpenAI formats natively
 */
@Controller(['ollama', 'ollama/api'])
@UseInterceptors(EarningsTrackingInterceptor)
export class ModelController {
  private readonly logger = new Logger(ModelController.name);

  constructor(
    private readonly unifiedModelService: UnifiedModelService
  ) {}

  /**
   * Ollama-compatible chat endpoint
   * Direct passthrough to Ollama service
   */
  @Post('/api/chat')
  async chat(@Body() args: z.infer<typeof OllamaChatRequestSchema>, @Res() res: Response) {
    try {
      // Use unified model service
      await this.unifiedModelService.chat(args, res, '/api/chat');

    } catch (error) {
      this.logger.error(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  }

  /**
   * Ollama-compatible generate endpoint
   * Direct passthrough to Ollama service
   */
  @Post('/api/generate')
  async generate(@Body() args: z.infer<typeof OllamaGenerateRequestSchema>, @Res() res: Response) {
    try {
      // Use unified model service
      await this.unifiedModelService.complete(args, res, '/api/generate');

    } catch (error) {
      this.logger.error(`Generate error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  }

  /**
   * Ollama-compatible tags endpoint
   * Returns models in Ollama format
   */
  @Get('/api/tags')
  async listModels(@Res() res: Response) {
    try {
      const modelList = await this.unifiedModelService.listModels();

      // Return in Ollama format
      res.json({ models: modelList.models });

    } catch (error) {
      this.logger.error(`List models error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list models'
      });
    }
  }

  /**
   * Ollama-compatible embeddings endpoint
   * Direct passthrough to Ollama service
   */
  @Post('/api/embeddings')
  async embeddings(@Body() args: any, @Res() res: Response) {
    try {
      const result = await this.unifiedModelService.generateEmbeddings(args);

      res.json(result);

    } catch (error) {
      this.logger.error(`Embeddings error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate embeddings'
      });
    }
  }

  /**
   * Ollama version endpoint
   */
  @Get('/api/version')
  async version(@Res() res: Response) {
    try {
      const version = await this.unifiedModelService.getVersion();

      res.json(version);

    } catch (error) {
      this.logger.error(`Version error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get version'
      });
    }
  }
}
