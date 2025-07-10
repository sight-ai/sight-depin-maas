import { Body, Controller, Get, Logger, Post, Put, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { UnifiedConfigService } from '../services/unified-config.service';

// 框架切换请求 Schema
const FrameworkSwitchSchema = z.object({
  framework: z.enum(['ollama', 'vllm'])
});

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

// 通用配置设置 Schema
const GenericConfigSchema = z.object({
  configFile: z.string(),
  key: z.string(),
  value: z.any(),
  gatewayPath: z.string().optional()
});

export class FrameworkSwitchDto extends createZodDto(FrameworkSwitchSchema) { }
export class VllmConfigUpdateDto extends createZodDto(VllmConfigUpdateSchema) { }
export class GenericConfigDto extends createZodDto(GenericConfigSchema) { }

/**
 * 统一配置管理控制器
 * 
 * 职责：
 * 1. 提供统一的配置管理接口
 * 2. 整合多个配置服务的功能
 * 3. 遵循单一职责原则 - 只负责配置管理
 */
@Controller('/api/v1/config')
export class UnifiedConfigController {
  private readonly logger = new Logger(UnifiedConfigController.name);

  constructor(
    private readonly unifiedConfigService: UnifiedConfigService
  ) {}

  /**
   * 获取应用配置概览
   */
  @Get('/overview')
  async getConfigOverview(@Res() res: Response) {
    try {
      const appConfig = this.unifiedConfigService.getAppConfig();
      const health = this.unifiedConfigService.getConfigHealth();
      const summary = this.unifiedConfigService.getConfigSummary();

      res.status(200).json({
        success: true,
        data: {
          app: appConfig,
          health,
          summary
        }
      });
    } catch (error) {
      this.logger.error('Error getting config overview:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取当前推理框架
   */
  @Get('/framework')
  async getCurrentFramework(@Res() res: Response) {
    try {
      const framework = this.unifiedConfigService.getCurrentFramework();

      res.status(200).json({
        success: true,
        framework,
        message: framework ? `Current framework: ${framework}` : 'No framework configured'
      });
    } catch (error) {
      this.logger.error('Error getting current framework:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 切换推理框架
   */
  @Put('/framework')
  async switchFramework(@Body() args: FrameworkSwitchDto, @Res() res: Response) {
    try {
      const success = this.unifiedConfigService.setCurrentFramework(args.framework);

      if (success) {
        res.status(200).json({
          success: true,
          framework: args.framework,
          message: `Successfully switched to ${args.framework}`,
          note: 'Please restart the application to apply changes'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to switch framework'
        });
      }
    } catch (error) {
      this.logger.error('Error switching framework:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取 vLLM 配置
   */
  @Get('/vllm')
  async getVllmConfig(@Res() res: Response) {
    try {
      const memoryConfig = this.unifiedConfigService.getVllmMemoryConfig();
      const fullConfig = this.unifiedConfigService.getVllmFullConfig();

      res.status(200).json({
        success: true,
        data: {
          memory: memoryConfig,
          full: fullConfig
        }
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
      const success = this.unifiedConfigService.setVllmMemoryConfig(args);

      if (success) {
        const updatedConfig = this.unifiedConfigService.getVllmMemoryConfig();
        
        res.status(200).json({
          success: true,
          message: 'vLLM configuration updated successfully',
          config: updatedConfig,
          note: 'Restart vLLM service to apply changes'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to update vLLM configuration. Please check the provided values.'
        });
      }
    } catch (error) {
      this.logger.error('Error updating vLLM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 重置 vLLM 配置
   */
  @Post('/vllm/reset')
  async resetVllmConfig(@Res() res: Response) {
    try {
      const success = this.unifiedConfigService.resetVllmConfig();

      if (success) {
        const config = this.unifiedConfigService.getVllmMemoryConfig();
        
        res.status(200).json({
          success: true,
          message: 'vLLM configuration reset to defaults',
          config
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to reset vLLM configuration'
        });
      }
    } catch (error) {
      this.logger.error('Error resetting vLLM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 验证配置
   */
  @Get('/validate')
  async validateConfig(@Res() res: Response) {
    try {
      const validation = this.unifiedConfigService.validateConfiguration();

      res.status(200).json({
        success: true,
        validation
      });
    } catch (error) {
      this.logger.error('Error validating config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 备份配置
   */
  @Post('/backup')
  async backupConfig(@Res() res: Response) {
    try {
      const result = this.unifiedConfigService.backupConfiguration();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Configuration backed up successfully',
          backupPath: result.backupPath
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to backup configuration'
        });
      }
    } catch (error) {
      this.logger.error('Error backing up config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取配置健康状态
   */
  @Get('/health')
  async getConfigHealth(@Res() res: Response) {
    try {
      const health = this.unifiedConfigService.getConfigHealth();

      res.status(200).json({
        success: true,
        health
      });
    } catch (error) {
      this.logger.error('Error getting config health:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 通用配置获取
   */
  @Get('/generic/:configFile/:key')
  async getGenericConfig(@Res() res: Response) {
    try {
      const { configFile, key } = res.req.params;
      const gatewayPath = res.req.query.gatewayPath as string;

      const value = this.unifiedConfigService.getConfig(configFile, key, gatewayPath);

      res.status(200).json({
        success: true,
        configFile,
        key,
        value,
        exists: value !== null
      });
    } catch (error) {
      this.logger.error('Error getting generic config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 通用配置设置
   */
  @Put('/generic')
  async setGenericConfig(@Body() args: GenericConfigDto, @Res() res: Response) {
    try {
      const success = this.unifiedConfigService.setConfig(
        args.configFile,
        args.key,
        args.value,
        args.gatewayPath
      );

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Configuration updated successfully',
          configFile: args.configFile,
          key: args.key
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update configuration'
        });
      }
    } catch (error) {
      this.logger.error('Error setting generic config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
