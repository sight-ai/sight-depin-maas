import { Controller, Post, Get, Body, Res, Logger, UseInterceptors } from '@nestjs/common';
import { UnifiedModelService } from '@saito/model-inference-client';
import { EarningsTrackingInterceptor } from '@saito/earnings-tracking';
import { Response } from 'express';
import {
  OpenAIChatCompletionRequestSchema,
  OpenAICompletionRequestSchema,
  OpenAIChatCompletionRequest,
  OpenAICompletionRequest
} from '@saito/models';
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
    private readonly unifiedModelService: UnifiedModelService
  ) {}

  /**
   * OpenAI-compatible chat completions endpoint
   * Uses new framework manager architecture
   * Both Ollama and vLLM support OpenAI-compatible endpoints
   */
  @Post('/chat/completions')
  async chatCompletions(@Body() args: z.infer<typeof OpenAIChatCompletionRequestSchema>, @Res() res: Response) {
    try {
      this.logger.debug('openai Chat completions request received');

      // Convert OpenAI format to unified format
      const chatRequest = {
        messages: args.messages.map(msg => ({
          role: msg.role,
          content: msg.content || ''
        })),
        model: args.model,
        stream: args.stream,
        temperature: args.temperature,
        max_tokens: args.max_tokens
      };

      // Use unified model service with OpenAI-compatible endpoint
      // Both Ollama and vLLM support /v1/chat/completions
      await this.unifiedModelService.chat(chatRequest as any, res, '/v1/chat/completions');

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
  async completions(@Body() args: z.infer<typeof OpenAICompletionRequestSchema>, @Res() res: Response) {
    try {
      // Convert OpenAI format to unified format
      const completionRequest = {
        prompt: Array.isArray(args.prompt) ? args.prompt.join('\n') : args.prompt,
        model: args.model,
        stream: args.stream,
        temperature: args.temperature,
        max_tokens: args.max_tokens
      };

      // Use unified model service with OpenAI-compatible endpoint
      // Both Ollama and vLLM support /v1/completions
      await this.unifiedModelService.complete(completionRequest as any, res, '/v1/completions');

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
      // Use unified model service
      const currentFramework = this.unifiedModelService.getCurrentFramework();
      const modelList = await this.unifiedModelService.listModels();

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
      // Use unified model service
      const result = await this.unifiedModelService.generateEmbeddings(args);

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

      // Use unified model service

      // Check if this is a chat completion request
      if (args.messages && Array.isArray(args.messages)) {
        // Handle as chat completion
        await this.unifiedModelService.chat(args as any, res, '/v1/chat/completions');
      } else if (args.prompt) {
        // Handle as text completion
        await this.unifiedModelService.complete(args as any, res, '/v1/completions');
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
