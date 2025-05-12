import { Body, Controller, Get, Inject, Logger, Param, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { OllamaService } from "@saito/ollama";
import { Response } from 'express';
import * as R from 'ramda';
import {
  OpenAIChatCompletionRequest,
  OpenAICompletionRequest,
  OpenAIEmbeddingsRequest,
} from "@saito/models";

export class OpenAIChatCompletionRequestDto extends createZodDto(OpenAIChatCompletionRequest) { }
export class OpenAICompletionRequestDto extends createZodDto(OpenAICompletionRequest) { }
export class OpenAIEmbeddingsRequestDto extends createZodDto(OpenAIEmbeddingsRequest) { }

const handleApiError = (res: Response, error: unknown, model?: string) => {
  if (!res.headersSent) {
    res.status(400).json({
      error: 'Error during API request',
      details: error instanceof Error ? error.message : 'Unknown error',
      model: model || 'unknown',
      created_at: new Date().toISOString(),
      done: true
    });
  }
};

@Controller(['/openai', '/openai/v1'])
export class OpenAIController {
  private readonly logger = new Logger(OpenAIController.name);
  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService
  ) { }

  @Post('/chat/completions')
  async chatCompletions(@Body() args: OpenAIChatCompletionRequestDto, @Res() res: Response) {
    try {
      this.logger.debug('OpenAI chat completions request:', args);

      if (args.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }

      // Pass the full endpoint path to identify this as an OpenAI request
      await this.ollamaService.chat(args, res, 'v1/chat/completions');
    } catch (error) {
      this.logger.error('Error during OpenAI chat completions:', error);
      handleApiError(res, error, args.model);
    }
  }

  @Post('/completions')
  async completions(@Body() args: OpenAICompletionRequestDto, @Res() res: Response) {
    try {
      this.logger.debug('OpenAI completions request:', args);

      if (args.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }

      // Pass the full endpoint path to identify this as an OpenAI request
      await this.ollamaService.complete(args, res, 'v1/completions');
    } catch (error) {
      this.logger.error('Error during OpenAI completions:', error);
      handleApiError(res, error, args.model);
    }
  }

  @Post('/embeddings')
  async embeddings(@Body() args: OpenAIEmbeddingsRequestDto, @Res() res: Response) {
    try {
      this.logger.debug('OpenAI embeddings request:', args);

      // Convert OpenAI format to Ollama format
      const ollamaRequest = {
        model: args.model,
        input: args.input,
      };

      const embeddings = await this.ollamaService.generateEmbeddings(ollamaRequest);

      // Convert Ollama response to OpenAI format
      // Estimate token count based on input length
      let inputText = '';
      if (typeof args.input === 'string') {
        inputText = args.input;
      } else if (Array.isArray(args.input)) {
        inputText = args.input.join(' ');
      }

      // Rough estimate: 1 token ≈ 4 characters for English text
      const estimatedTokens = Math.ceil(inputText.length / 4);

      const openAIResponse = {
        object: 'list',
        data: embeddings.embeddings.map((embedding, index) => ({
          object: 'embedding',
          embedding,
          index,
        })),
        model: args.model,
        usage: {
          prompt_tokens: estimatedTokens,
          total_tokens: estimatedTokens,
        },
      };

      res.status(200).json(openAIResponse);
    } catch (error) {
      this.logger.error('Error during OpenAI embeddings:', error);
      handleApiError(res, error, args.model);
    }
  }

  @Get('/models')
  async listModels(@Res() res: Response) {
    try {
      this.logger.debug('OpenAI list models request');

      const ollamaModels = await this.ollamaService.listModelTags();

      // Convert Ollama response to OpenAI format
      const openAIResponse = {
        object: 'list',
        data: ollamaModels.models.map(model => ({
          id: model.name,
          object: 'model',
          created: new Date(model.modified_at).getTime() / 1000,
          owned_by: 'organization',
        })),
      };

      res.status(200).json(openAIResponse);
    } catch (error) {
      this.logger.error('Error during OpenAI list models:', error);
      handleApiError(res, error);
    }
  }

  @Get('/models/:model')
  async getModel(@Param('model') modelName: string, @Res() res: Response) {
    try {
      this.logger.debug(`OpenAI get model request: ${modelName}`);

      const modelInfo = await this.ollamaService.showModelInformation({ name: modelName });

      // Convert Ollama response to OpenAI format
      const openAIResponse = {
        id: modelName,
        object: 'model',
        created: Math.floor(Date.now() / 1000), // Current time as we don't have the actual creation time
        owned_by: 'organization',
        // Add additional details from Ollama
        details: modelInfo.details,
      };

      res.status(200).json(openAIResponse);
    } catch (error) {
      this.logger.error(`Error during OpenAI get model (${modelName}):`, error);
      handleApiError(res, error, modelName);
    }
  }

  @Get('/version')
  async getVersion(@Res() res: Response) {
    try {
      this.logger.debug('OpenAI version request');

      const versionInfo = await this.ollamaService.showModelVersion();

      res.status(200).json({
        version: versionInfo.version,
        openai_compatibility: true,
      });
    } catch (error) {
      this.logger.error('Error during OpenAI version request:', error);
      handleApiError(res, error);
    }
  }
}
