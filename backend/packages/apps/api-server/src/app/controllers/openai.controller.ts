import { Body, Controller, Get, Inject, Logger, Post, Res, Param, Delete } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import * as R from 'ramda';
import { OpenAI } from "@saito/models";
import { ModelOpenaiService } from '@saito/openai';

export class OpenAIChatRequestDto extends createZodDto(OpenAI.OpenAIChatParams) {}
export class OpenAICompletionRequestDto extends createZodDto(OpenAI.OpenAICompletionParams) {}
export class OpenAIEmbeddingRequestDto extends createZodDto(OpenAI.OpenAIEmbeddingParams) {}

@Controller(['openai/', 'openai/v1'])
export class OpenAIController {
  private readonly logger = new Logger(OpenAIController.name);

  constructor(
    @Inject(ModelOpenaiService)
    private readonly modelOpenaiService: ModelOpenaiService,
  ) {}

  @Post('chat/completions')
  async chat(@Body() body: OpenAIChatRequestDto, @Res() res: Response) {
    await this.modelOpenaiService.handleChat({...body, model: 'deepscaler'}, res);
  }

  @Post('completions')
  async complete(@Body() body: OpenAICompletionRequestDto, @Res() res: Response) {
    await this.modelOpenaiService.handleCompletion(body, res);
  }

  @Post('embeddings')
  async embed(@Body() body: OpenAIEmbeddingRequestDto) {
    return await this.modelOpenaiService.handleEmbedding(body);
  }

  @Get('models')
  async listModels() {
    return await this.modelOpenaiService.listModels();
  }

  @Get('models/tags')
  async listModelTags() {
    return await this.modelOpenaiService.listModelTags();
  }

  @Get('models/:name')
  async showModelInformation(@Param('name') name: string) {
    return await this.modelOpenaiService.showModelInformation({ name });
  }

  @Get('version')
  async showModelVersion() {
    return await this.modelOpenaiService.showModelVersion();
  }

}
