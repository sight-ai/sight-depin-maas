import { Body, Controller, Get, Inject, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { ModelReportingService } from "@saito/model-reporting";
import { DeviceStatusService, TunnelCommunicationService } from "@saito/device-status";
import { UnifiedModelListService } from '../services/unified-model-list.service';

// 模型上报请求 Schema
const ModelReportRequestSchema = z.object({
  models: z.array(z.string()).min(1)
});

export class ModelReportRequestDto extends createZodDto(ModelReportRequestSchema) { }

/**
 * 模型管理控制器
 *
 * 职责：
 * 1. 模型列表查询
 * 2. 模型上报功能
 * 3. 遵循单一职责原则 - 只负责模型相关操作
 */
@Controller('/api/v1/models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly unifiedModelListService: UnifiedModelListService,
    @Inject(ModelReportingService) private readonly modelReportingService: ModelReportingService,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
    @Inject(TunnelCommunicationService) private readonly tunnelService: TunnelCommunicationService
  ) { }

  /**
   * 获取模型列表
   */
  @Get('/list')
  async listModels(@Res() res: Response) {
    try {
      const result = await this.unifiedModelListService.getInternalFormatModels();
      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error listing models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        models: [],
        total: 0
      });
    }
  }

  /**
   * 上报模型到网关
   */
  @Post('/report')
  async reportModels(@Body() args: ModelReportRequestDto, @Res() res: Response) {
    try {
      // 首先尝试通过tunnel发送模型上报
      try {
        const deviceId = await this.deviceStatusService.getDeviceId();
        const tunnelResult = await this.tunnelService.sendModelReport(
          deviceId,
          'gateway', // 固定发送给网关
          {
            device_id: deviceId,
            models: args.models.map(modelName => ({
              name: modelName,
              modified_at: new Date().toISOString(),
              size: 2048000000,
              digest: `sha256:${Buffer.from(modelName).toString('hex').substring(0, 12)}`,
              details: {
                format: 'gguf',
                family: this.extractModelFamily(modelName),
                families: [this.extractModelFamily(modelName)],
                parameter_size: this.extractParameters(modelName),
                quantization_level: this.extractQuantization(modelName)
              }
            }))
          }
        );

        if (tunnelResult) {
          this.logger.log('Model report sent via tunnel');
        }
      } catch (tunnelError) {
        this.logger.warn('Failed to send model report via tunnel:', tunnelError);
      }

      // 继续执行原有的HTTP上报逻辑
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

  // 辅助方法 - 模型信息提取
  private extractModelFamily(modelName: string): string {
    const familyPatterns = [
      { pattern: /llama/i, value: 'llama' },
      { pattern: /mistral/i, value: 'mistral' },
      { pattern: /deepseek/i, value: 'deepseek' },
      { pattern: /phi/i, value: 'phi' },
      { pattern: /qwen/i, value: 'qwen' },
      { pattern: /gemma/i, value: 'gemma' },
      { pattern: /mixtral/i, value: 'mixtral' },
      { pattern: /vicuna/i, value: 'vicuna' },
      { pattern: /falcon/i, value: 'falcon' }
    ];

    for (const { pattern, value } of familyPatterns) {
      if (pattern.test(modelName)) {
        return value;
      }
    }
    return 'unknown';
  }

  private extractParameters(modelName: string): string {
    const paramMatch = modelName.match(/(\d+)[bB]/);
    return paramMatch ? `${paramMatch[1]}B` : 'unknown';
  }

  private extractQuantization(modelName: string): string {
    const quantMatches = [
      { pattern: /q4_0/i, value: 'Q4_0' },
      { pattern: /q4_k_m/i, value: 'Q4_K_M' },
      { pattern: /q5_0/i, value: 'Q5_0' },
      { pattern: /q5_k_m/i, value: 'Q5_K_M' },
      { pattern: /q6_k/i, value: 'Q6_K' },
      { pattern: /q8_0/i, value: 'Q8_0' }
    ];

    for (const { pattern, value } of quantMatches) {
      if (pattern.test(modelName)) {
        return value;
      }
    }
    return '';
  }
}