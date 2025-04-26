import { Body, Controller, Get, Inject, Logger, Post, Res, Param, Delete } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { DeepSeek } from "@saito/models";
import { ModelDeepSeekService } from '@saito/deepseek';

export class DeepSeekChatRequestDto extends createZodDto(DeepSeek.DeepSeekChatParams) {}
export class DeepSeekCompletionRequestDto extends createZodDto(DeepSeek.DeepSeekCompletionParams) {}
export class DeepSeekEmbeddingRequestDto extends createZodDto(DeepSeek.DeepSeekEmbeddingParams) {}

@Controller('deepseek')
export class DeepSeekController {
  private readonly logger = new Logger(DeepSeekController.name);

  constructor(
    @Inject(ModelDeepSeekService)
    private readonly modelDeepSeekService: ModelDeepSeekService,
  ) {}

  @Post('chat/completions')
  async chat(@Body() body: DeepSeekChatRequestDto, @Res() res: Response) {
    await this.modelDeepSeekService.handleChat(body, res);
  }

  @Post('completions')
  async complete(@Body() body: DeepSeekCompletionRequestDto, @Res() res: Response) {
    await this.modelDeepSeekService.handleCompletion(body, res);
  }

  @Post('embeddings')
  async embed(@Body() body: DeepSeekEmbeddingRequestDto) {
    return await this.modelDeepSeekService.handleEmbedding(body);
  }

  @Get('models')
  async listModels() {
    return await this.modelDeepSeekService.listModels();
  }

  @Get('models/tags')
  async listModelTags() {
    return await this.modelDeepSeekService.listModelTags();
  }

  @Get('models/:name')
  async showModelInformation(@Param('name') name: string) {
    return await this.modelDeepSeekService.showModelInformation({ name });
  }

  @Get('version')
  async showModelVersion() {
    return await this.modelDeepSeekService.showModelVersion();
  }
}
