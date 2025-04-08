import { Body, Controller, Delete, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OllamaService } from "@saito/ollama";
import { m, ModelOfOllama } from "@saito/models";
import { Response } from 'express';

export class OllamaGenerateRequestMessage extends createZodDto(m.ollama('generate_request')) { }
export class OllamaChatRequestMessage extends createZodDto(m.ollama('chat_request')) { }
export class OllamaCreateRequestMessage extends createZodDto(m.ollama('create_request')) { }
export class OllamaCopyRequestMessage extends createZodDto(m.ollama('copy_request')) { }
export class OllamaDeleteRequestMessage extends createZodDto(m.ollama('delete_request')) { }
export class OllamaPullRequestMessage extends createZodDto(m.ollama('pull_request')) { }
export class OllamaPushRequestMessage extends createZodDto(m.ollama('push_request')) { }
export class OllamaEmbedRequestMessage extends createZodDto(m.ollama('embed_request')) { }

@Controller('/api/')
export class ModelController {
  private readonly logger = new Logger(ModelController.name);
  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService
  ) { }

  @Post('/generate')
  async generateResponse(@Body() req: OllamaGenerateRequestMessage, @Res() res: Response) {
    try {
      await this.ollamaService.complete(req, res);
    } catch (error) {
      this.logger.error('Error during chat response:', error);
      res.status(500).send('Error during generate response');
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
      await this.ollamaService.chat(args, res);
    } catch (error) {
      this.logger.error('Error during chat response:', error);
      res.status(500).send('Error during chat response');
    }
  }

  @Get('/tags')
  async listModelTags() {
    return this.ollamaService.listModelTags();
  }

  @Get('/show')
  async showModelInformation(@Body() args: ModelOfOllama<'show_model_request'>) {
    return this.ollamaService.showModelInformation(args);
  }
  @Get('/version')
  async showModelVersion() {
    return this.ollamaService.showModelVersion();
  }

  @Post('/create')
  async createModel(@Body() args: OllamaCreateRequestMessage) {
    return this.ollamaService.createModel(args);
  }

  @Post('/copy')
  async copyModel(@Body() args: OllamaCopyRequestMessage) {
    return this.ollamaService.copyModel(args);
  }

  @Delete('/delete')
  async deleteModel(@Body() args: OllamaDeleteRequestMessage) {
    return this.ollamaService.deleteModel(args);
  }

  @Post('/pull')
  async pullModel(@Body() args: OllamaPullRequestMessage, @Res() res: Response) {
    try {
      await this.ollamaService.pullModel(args, res);
    } catch (error) {
      this.logger.error('Error during model pull:', error);
      res.status(500).send('Error during model pull');
    }
  }

  @Post('/push')
  async pushModel(@Body() args: OllamaPushRequestMessage, @Res() res: Response) {
    try {
      await this.ollamaService.pushModel(args, res);
    } catch (error) {
      this.logger.error('Error during model push:', error);
      res.status(500).send('Error during model push');
    }
  }

  @Post('/embed')
  async generateEmbeddings(@Body() args: OllamaEmbedRequestMessage) {
    return this.ollamaService.generateEmbeddings(args);
  }

  @Get('/ps')
  async listRunningModels() {
    return this.ollamaService.listRunningModels();
  }
}
