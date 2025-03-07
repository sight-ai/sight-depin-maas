import { Body, Controller, Inject, Logger, Post } from '@nestjs/common';
import {
  MemoryKeeperPipeline,
} from "@saito/keeper";
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OllamaService } from "@saito/ollama";
import { m } from "@saito/models";

export class OllamaGenerateRequestMessage extends createZodDto(m.ollama('generate_request')) {}

@Controller('/api/v1/model')
export class ModelController {
  private readonly logger = new Logger(ModelController.name);
  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService
  ) {}

  @Post('/generate')
  async generateResponse(@Body() req: OllamaGenerateRequestMessage) {
    return this.ollamaService.complete(req);
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: any) {
  }

}
