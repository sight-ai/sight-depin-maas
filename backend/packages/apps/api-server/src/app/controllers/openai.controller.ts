import { Controller, Post, Get, Body, Res, Logger, UseInterceptors } from '@nestjs/common';
import { FrameworkManagerService } from '@saito/model-framework';
import { EarningsTrackingInterceptor } from '../interceptors/earnings-tracking.interceptor';
import { Response } from 'express';
import { OpenAIChatCompletionRequest, OpenAICompletionRequest } from '@saito/models';
import z from 'zod';

/**
 * Clean OpenAI Controller
 * 
 * Purpose: Provide OpenAI-compatible API endpoints with minimal interference
 * 
 * Key Principles:
 * 1. Direct passthrough to underlying services
 * 2. No response transformation - let services handle their own formats
 * 3. Clean error handling
 * 4. Framework-agnostic operation
 */
@Controller(['openai', 'openai/v1'])
@UseInterceptors(EarningsTrackingInterceptor)
export class OpenAIController {
  private readonly logger = new Logger(OpenAIController.name);

  constructor(
    private readonly frameworkManager: FrameworkManagerService
  ) {}

  /**
   * OpenAI-compatible chat completions endpoint
   * Uses new framework manager architecture
   * Both Ollama and vLLM support OpenAI-compatible endpoints
   */
  @Post('/chat/completions')
  async chatCompletions(@Body() args: z.infer<typeof OpenAIChatCompletionRequest>, @Res() res: Response) {
    try {
      this.logger.debug('openai Chat completions request received');

      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();

      // Use OpenAI-compatible endpoint for both frameworks
      // Both Ollama and vLLM support /v1/chat/completions
      await service.chat(args, res, '/v1/chat/completions');

    } catch (error) {
      this.logger.error(`Chat completions error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'api_error',
            code: 'internal_error'
          }
        });
      }
    }
  }

  /**
   * OpenAI-compatible completions endpoint
   * Uses new framework manager architecture
   * Both Ollama and vLLM support OpenAI-compatible endpoints
   */
  @Post('/completions')
  async completions(@Body() args: z.infer<typeof OpenAICompletionRequest>, @Res() res: Response) {
    try {
      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();

      // Use OpenAI-compatible endpoint for both frameworks
      // Both Ollama and vLLM support /v1/completions
      await service.complete(args, res, '/v1/completions');

    } catch (error) {
      this.logger.error(`Completions error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'api_error',
            code: 'internal_error'
          }
        });
      }
    }
  }

  /**
   * OpenAI-compatible models endpoint
   * Returns models in OpenAI format regardless of underlying framework
   */
  @Get('/models')
  async listModels(@Res() res: Response) {
    try {
      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();
      const currentFramework = this.frameworkManager.getCurrentFramework();

      const modelList = await service.listModels();

      // Convert to OpenAI format for compatibility
      const openaiFormat = {
        object: 'list',
        data: modelList.models.map((model: any) => ({
          id: model.name,
          object: 'model',
          created: model.modified_at ? Math.floor(new Date(model.modified_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
          owned_by: currentFramework.toLowerCase()
        }))
      };

      res.json(openaiFormat);

    } catch (error) {
      this.logger.error(`List models error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        error: {
          message: error instanceof Error ? error.message : 'Failed to list models',
          type: 'api_error',
          code: 'internal_error'
        }
      });
    }
  }

  /**
   * OpenAI-compatible embeddings endpoint
   * Uses new framework manager architecture
   */
  @Post('/embeddings')
  async embeddings(@Body() args: any, @Res() res: Response) {
    try {
      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();

      const result = await service.generateEmbeddings(args);

      res.json(result);

    } catch (error) {
      this.logger.error(`Embeddings error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      res.status(500).json({
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate embeddings',
          type: 'api_error',
          code: 'internal_error'
        }
      });
    }
  }

  /**
   * Custom responses endpoint
   * This endpoint handles response-related operations
   */
  @Post('/responses')
  async responses(@Body() args: Record<string, any>, @Res() res: Response) {
    try {
      this.logger.debug('Responses endpoint called');

      // Get current framework service
      const service = await this.frameworkManager.createFrameworkService();

      // Check if this is a chat completion request
      if (args.messages && Array.isArray(args.messages)) {
        // Handle as chat completion
        await service.chat(args as any, res, '/v1/chat/completions');
      } else if (args.prompt) {
        // Handle as text completion
        await service.complete(args as any, res, '/v1/completions');
      } else {
        // Return error for invalid request
        if (!res.headersSent) {
          res.status(400).json({
            error: {
              message: 'Invalid request format. Expected messages array or prompt string.',
              type: 'invalid_request_error',
              code: 'invalid_format',
              cause: {}
            },
            cause: {},
            provider: 'openai'
          });
        }
      }

    } catch (error) {
      this.logger.error(`Responses error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'api_error',
            code: 'internal_error',
            cause: {}
          },
          cause: {},
          provider: 'openai'
        });
      }
    }
  }

}
