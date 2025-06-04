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
  async chatCompletions(@Body() args: OpenAIChatCompletionRequestDto, @Res() res: Response, req: Request) {
    try {
      

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
  async completions(@Body() args: OpenAICompletionRequestDto, @Res() res: Response, req: Request) {
    try {
      

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
  async embeddings(@Body() args: OpenAIEmbeddingsRequestDto, @Res() res: Response, req: Request) {
    try {
      

      const embeddings = await this.ollamaService.generateEmbeddingsOpenai(args);

      res.status(200).json(embeddings);
    } catch (error) {
      this.logger.error('Error during OpenAI embeddings:', error);
      handleApiError(res, error, args.model);
    }
  }

  @Get('/models')
  async listModels(@Res() res: Response) {
    try {
      const models = await this.ollamaService.listModelOpenai();
      res.status(200).json(models);
    } catch (error) {
      this.logger.error('Error during OpenAI list models:', error);
      handleApiError(res, error);
    }
  }

  @Get('/models/:model')
  async getModel(@Param('model') modelName: string, @Res() res: Response) {
    try {
      

      const modelInfo = await this.ollamaService.showModelInformationOpenai({ name: modelName });
      res.status(200).json(modelInfo);
    } catch (error) {
      this.logger.error(`Error during OpenAI get model (${modelName}):`, error);
      handleApiError(res, error, modelName);
    }
  }

  @Get('/version')
  async getVersion(@Res() res: Response) {
    try {
      const versionInfo = await this.ollamaService.showModelVersionOpenai();

      res.status(200).json(versionInfo);
    } catch (error) {
      this.logger.error('Error during OpenAI version request:', error);
      handleApiError(res, error);
    }
  }
}
