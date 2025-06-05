import { Controller, Post, Get, Body, Res, Logger } from '@nestjs/common';
import { FrameworkManagerService } from '@saito/model-framework';
import { Response } from 'express';

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
@Controller(['ollama', 'api'])
export class ModelController {
  private readonly logger = new Logger(ModelController.name);

  constructor(
    private readonly frameworkManager: FrameworkManagerService
  ) {}

  /**
   * Ollama-compatible chat endpoint
   * Direct passthrough to Ollama service
   */
  @Post('/api/chat')
  async chat(@Body() args: any, @Res() res: Response) {
    try {
      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();
      await service.chat(args, res, '/api/chat');

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
  async generate(@Body() args: any, @Res() res: Response) {
    try {
      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();
      await service.complete(args, res, '/api/generate');

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
      const service = await this.frameworkManager.createFrameworkService();
      const modelList = await service.listModels();

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
      const service = await this.frameworkManager.createFrameworkService();
      const result = await service.generateEmbeddings(args);

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
      const service = await this.frameworkManager.createFrameworkService();
      const version = await service.getVersion();

      res.json(version);

    } catch (error) {
      this.logger.error(`Version error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get version'
      });
    }
  }
}
