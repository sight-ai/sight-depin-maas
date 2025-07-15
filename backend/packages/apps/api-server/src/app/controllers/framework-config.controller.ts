import { Body, Controller, Get, Logger, Post, Put, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { UnifiedModelService } from "@saito/model-inference-client";
import { VllmConfigService, VllmErrorHandlerService } from "@saito/model-inference-framework-management";
import { SystemInfoService } from "@saito/common";

// vLLM 配置更新 Schema
const VllmConfigUpdateSchema = z.object({
  gpuMemoryUtilization: z.number().min(0.1).max(1.0).optional(),
  maxModelLen: z.number().int().positive().optional(),
  maxNumSeqs: z.number().int().positive().optional(),
  maxNumBatchedTokens: z.number().int().positive().optional(),
  enforceEager: z.boolean().optional(),
  swapSpace: z.number().nonnegative().optional(),
  tensorParallelSize: z.number().int().positive().optional(),
  pipelineParallelSize: z.number().int().positive().optional(),
  blockSize: z.number().int().positive().optional(),
  quantization: z.enum(['awq', 'gptq', 'squeezellm', 'fp8', 'int8']).nullable().optional()
});

export class VllmConfigUpdateDto extends createZodDto(VllmConfigUpdateSchema) { }

/**
 * 框架配置管理控制器
 * 
 * 职责：
 * 1. vLLM 配置管理（获取、更新、推荐）
 * 2. 错误分析和诊断
 * 3. 遵循单一职责原则 - 只负责配置管理
 */
@Controller('/api/v1/framework/config')
export class FrameworkConfigController {
  private readonly logger = new Logger(FrameworkConfigController.name);

  constructor(
    private readonly unifiedModelService: UnifiedModelService,
    private readonly vllmConfigService: VllmConfigService,
    private readonly vllmErrorHandlerService: VllmErrorHandlerService,
    private readonly systemInfoService: SystemInfoService
  ) {}

  /**
   * 获取 vLLM 配置
   */
  @Get('/vllm')
  async getVllmConfig(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      const config = this.vllmConfigService.getFullConfig();

      res.status(200).json({
        success: true,
        framework: currentFramework,
        config
      });
    } catch (error) {
      this.logger.error('Error getting vLLM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 更新 vLLM 配置
   */
  @Put('/vllm')
  async updateVllmConfig(@Body() args: VllmConfigUpdateDto, @Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // 更新配置
      const success = this.vllmConfigService.setMemoryConfig(args);

      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Failed to update vLLM configuration. Please check the provided values.'
        });
        return;
      }

      const updatedConfig = this.vllmConfigService.getFullConfig();

      res.status(200).json({
        success: true,
        message: 'vLLM configuration updated successfully',
        config: updatedConfig,
        note: 'Configuration saved. Restart vLLM service to apply changes.'
      });
    } catch (error) {
      this.logger.error('Error updating vLLM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取基于系统硬件的 vLLM 推荐配置
   */
  @Get('/vllm/recommended')
  async getVllmRecommendedConfig(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      // Get system info and generate recommendations
      const systemInfo = await this.systemInfoService.getSystemInfo();
      const recommendedConfig = this.systemInfoService.getRecommendedVllmConfig(systemInfo.gpus);

      res.status(200).json({
        success: true,
        framework: currentFramework,
        systemInfo: {
          gpus: systemInfo.gpus,
          totalMemory: systemInfo.totalMemory,
          cudaVersion: systemInfo.cudaVersion,
          torchVersion: systemInfo.torchVersion
        },
        recommendedConfig,
        note: 'Configuration recommendations based on detected hardware. Adjust as needed for your specific use case.'
      });
    } catch (error) {
      this.logger.error('Error getting system-based vLLM recommended config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 分析 vLLM 错误消息并返回用户友好的解决方案
   */
  @Post('/vllm/error/analyze')
  async analyzeVllmError(@Body() body: { errorMessage: string; currentConfig?: any }, @Res() res: Response) {
    try {
      const { errorMessage, currentConfig = {} } = body;

      if (!errorMessage) {
        return res.status(400).json({
          success: false,
          message: '错误消息不能为空'
        });
      }

      const analysis = this.vllmErrorHandlerService.analyzeErrorWithRecommendations(errorMessage, currentConfig);
      const userFriendlyMessage = this.vllmErrorHandlerService.generateUserFriendlyMessage(analysis);

      res.status(200).json({
        success: true,
        analysis,
        userFriendlyMessage
      });
    } catch (error) {
      this.logger.error('Error analyzing vLLM error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取 vLLM 错误处理建议
   */
  @Post('/vllm/error/suggestions')
  async getVllmErrorSuggestions(@Body() body: { errorType: string; currentConfig?: any }, @Res() res: Response) {
    try {
      const { errorType, currentConfig = {} } = body;

      if (!errorType) {
        return res.status(400).json({
          success: false,
          message: '错误类型不能为空'
        });
      }

      const suggestions = this.vllmErrorHandlerService.getConfigurationRecommendations(errorType, currentConfig);

      res.status(200).json({
        success: true,
        errorType,
        suggestions
      });
    } catch (error) {
      this.logger.error('Error getting vLLM error suggestions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
