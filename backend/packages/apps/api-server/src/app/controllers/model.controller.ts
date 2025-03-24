import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import {
  MemoryKeeperPipeline,
} from "@saito/keeper";
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OllamaService } from "@saito/ollama";
import { m } from "@saito/models";
import { Response } from 'express';

export class OllamaGenerateRequestMessage extends createZodDto(m.ollama('generate_request')) { }
export class OllamaChatRequestMessage extends createZodDto(m.ollama('chat_request')) { }
@Controller('/api/v1/model')
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
      console.error('Error during chat response:', error);
      res.status(500).send('Error during chat response');
    }
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: OllamaChatRequestMessage, @Res() res: Response) {
    try {
      await this.ollamaService.chat(args, res);
    } catch (error) {
      console.error('Error during chat response:', error);
      res.status(500).send('Error during chat response');
    }
  }

  @Get('/tags')
  async listModels() {
    return this.ollamaService.listModel();
  }
}
