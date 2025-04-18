import { Body, Controller, Delete, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OllamaService } from "@saito/ollama";
import { m, ModelOfOllama } from "@saito/models";
import { Response } from 'express';

export class OllamaGenerateRequestMessage extends createZodDto(m.ollama('generate_request')) { }
export class OllamaChatRequestMessage extends createZodDto(m.ollama('chat_request')) { }
export class OllamaCreateRequestMessage extends createZodDto(m.ollama('create_request')) { }
export class OllamaEmbedRequestMessage extends createZodDto(m.ollama('embed_request')) { }


@Controller('/api/')
export class ModelController {
  private readonly logger = new Logger(ModelController.name);
  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService
  ) { }

  @Post('/generate')
  async generateResponse(@Body() args: ModelOfOllama<'generate_request'>, @Res() res: Response) {
    try {
      // Forward directly to ollama service, let the service handle all error cases
      await this.ollamaService.complete(args, res);
    } catch (error) {
      this.logger.error('Error during generate response:', error);
      if (!res.headersSent) {
        // Use 400 status code for errors
        res.status(400).json({ 
          error: 'Error during generate response',
          details: error instanceof Error ? error.message : 'Unknown error',
          model: args.model || 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  /**
   * This method skips ollama DTO check to adapt with "real" ollama behavior
   *
   * @param args
   * @param res
   */
  @Post('/chat')
  async generateChatResponse(@Body() args: ModelOfOllama<'chat_request'>, @Res() res: Response) {
    try {
      // Forward directly to ollama service, let the service handle all error cases
      await this.ollamaService.chat(args, res);
    } catch (error) {
      this.logger.error('Error during chat response:', error);
      if (!res.headersSent) {
        // Use 400 status code for errors
        res.status(400).json({ 
          error: 'Error during chat response',
          details: error instanceof Error ? error.message : 'Unknown error',
          model: args.model || 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  @Get('/tags')
  async listModelTags() {
    try {
      return await this.ollamaService.listModelTags();
    } catch (error) {
      this.logger.error('Error listing model tags:', error);
      throw error; // NestJS will convert this to a 500 response
    }
  }

  @Get('/show')
  async showModelInformation(@Body() args: ModelOfOllama<'show_model_request'>) {
    try {
      return await this.ollamaService.showModelInformation(args);
    } catch (error) {
      this.logger.error('Error showing model information:', error);
      throw error; // NestJS will convert this to a 500 response
    }
  }
  
  @Get('/version')
  async showModelVersion() {
    try {
      return await this.ollamaService.showModelVersion();
    } catch (error) {
      this.logger.error('Error showing model version:', error);
      throw error; // NestJS will convert this to a 500 response
    }
  }

  @Post('/embed')
  async generateEmbeddings(@Body() args: OllamaEmbedRequestMessage) {
    try {
      return await this.ollamaService.generateEmbeddings(args);
    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      throw error; // NestJS will convert this to a 500 response
    }
  }

  @Get('/ps')
  async listRunningModels() {
    try {
      return await this.ollamaService.listRunningModels();
    } catch (error) {
      this.logger.error('Error listing running models:', error);
      throw error; // NestJS will convert this to a 500 response
    }
  }
}
