import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { OllamaService } from "@saito/ollama";
import { Response } from 'express';
import { z } from 'zod';
import { ModelReportingService } from "@saito/model-reporting";

// Define DTOs for the new endpoints
const ModelReportRequestSchema = z.object({
  models: z.array(z.string()).min(1)
});

export class ModelReportRequestDto extends createZodDto(ModelReportRequestSchema) { }

@Controller('/api/v1/models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService,
    @Inject(ModelReportingService) private readonly modelReportingService: ModelReportingService
  ) { }

  @Get('/list')
  async listModels(@Res() res: Response) {
    try {
      const ollamaModels = await this.ollamaService.listModelTags();

      res.status(200).json({
        success: true,
        models: ollamaModels.models
      });
    } catch (error) {
      this.logger.error('Error listing models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        models: []
      });
    }
  }

  @Post('/report')
  async reportModels(@Body() args: ModelReportRequestDto, @Res() res: Response) {
    try {
      // Use the model reporting service to report models
      const success = await this.modelReportingService.reportModels(args.models);

      res.status(200).json({
        success: true,
        message: success ? 'Models reported successfully' : 'Models stored locally but not reported to gateway',
        reportedModels: args.models
      });
    } catch (error) {
      this.logger.error('Error reporting models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
