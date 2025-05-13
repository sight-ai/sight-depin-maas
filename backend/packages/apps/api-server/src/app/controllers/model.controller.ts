import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { OllamaService } from "@saito/ollama";
import { Response } from 'express';
import * as R from 'ramda';
import {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OllamaEmbeddingsRequest,
  OllamaModelDeleteRequest
} from "@saito/models";

export class OllamaGenerateRequestDto extends createZodDto(OllamaGenerateRequest) { }
export class OllamaChatRequestDto extends createZodDto(OllamaChatRequest) { }
export class OllamaEmbedRequestDto extends createZodDto(OllamaEmbeddingsRequest) { }
export class OllamaShowModelRequestDto extends createZodDto(OllamaModelDeleteRequest) { }

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

@Controller(['/api/', 'ollama/api/'])
export class ModelController {
  private readonly logger = new Logger(ModelController.name);
  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService
  ) { }

  @Post('/generate')
  async generateResponse(@Body() args: OllamaGenerateRequestDto, @Res() res: Response) {
    try {
       if (args.stream) {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.flushHeaders();
      }
      await this.ollamaService.complete(args, res);
    } catch (error) {
      this.logger.error('Error during generate response:', error);
      handleApiError(res, error, args.model);
    }
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: OllamaChatRequestDto, @Res() res: Response) {
    try {
      if (args.stream) {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.flushHeaders();
      }
      await this.ollamaService.chat(args, res);
    } catch (error) {
      this.logger.error('Error during chat response:', error);
      handleApiError(res, error, args.model);
    }
  }

  @Get('/tags')
  async listModelTags() {
    
    return R.tryCatch(
      () => this.ollamaService.listModelTags(),
      (error) => {
        this.logger.error('Error listing model tags:', error);
        throw error;
      }
    )();
  }

  @Get('/show')
  async showModelInformation(@Body() args: { name: string }) {
    return R.tryCatch(
      () => this.ollamaService.showModelInformation(args),
      (error) => {
        this.logger.error('Error showing model information:', error);
        throw error;
      }
    )();
  }

  @Get('/version')
  async showModelVersion() {
    return R.tryCatch(
      () => this.ollamaService.showModelVersion(),
      (error) => {
        this.logger.error('Error showing model version:', error);
        throw error;
      }
    )();
  }

  @Post('/embed')
  async generateEmbeddings(@Body() args: OllamaEmbedRequestDto) {
    return R.tryCatch(
      () => this.ollamaService.generateEmbeddings(args),
      (error) => {
        this.logger.error('Error generating embeddings:', error);
        throw error;
      }
    )();
  }

  @Get('/ps')
  async listRunningModels() {
    return R.tryCatch(
      () => this.ollamaService.listRunningModels(),
      (error) => {
        this.logger.error('Error listing running models:', error);
        throw error;
      }
    )();
  }
}
