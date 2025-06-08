import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { DynamicModelConfigService } from '@saito/model-framework';
import { ModelFramework } from '@saito/model-framework';

/**
 * 模型配置控制器
 * 
 * 提供动态模型配置相关的 API 端点
 */
@Controller('api/model-config')
export class ModelConfigController {
  private readonly logger = new Logger(ModelConfigController.name);

  constructor(private readonly dynamicModelConfig: DynamicModelConfigService) {}

  /**
   * 获取默认模型
   * GET /api/model-config/default
   */
  @Get('default')
  async getDefaultModel(@Query('framework') framework?: string) {
    try {
      const targetFramework = this.parseFramework(framework);
      const defaultModel = await this.dynamicModelConfig.getDefaultModel(targetFramework);
      
      this.logger.log(`Default model for ${targetFramework}: ${defaultModel}`);
      
      return {
        success: true,
        data: {
          framework: targetFramework,
          defaultModel,
          source: 'dynamic_detection'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get default model:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          framework: framework || 'ollama',
          defaultModel: null,
          source: 'error'
        }
      };
    }
  }

  /**
   * 获取可用模型列表
   * GET /api/model-config/models
   */
  @Get('models')
  async getAvailableModels(@Query('framework') framework?: string) {
    try {
      const targetFramework = this.parseFramework(framework);
      const models = await this.dynamicModelConfig.getAvailableModels(targetFramework);
      
      this.logger.log(`Found ${models.length} models for ${targetFramework}`);
      
      return {
        success: true,
        data: {
          framework: targetFramework,
          totalModels: models.length,
          models: models.map((model, index) => ({
            ...model,
            isDefault: index === 0
          }))
        }
      };
    } catch (error) {
      this.logger.error('Failed to get available models:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          framework: framework || 'ollama',
          totalModels: 0,
          models: []
        }
      };
    }
  }

  /**
   * 获取模型统计信息
   * GET /api/model-config/stats
   */
  @Get('stats')
  async getModelStats() {
    try {
      const stats = await this.dynamicModelConfig.getModelStats();
      
      this.logger.log(`Model stats: ${stats.totalModels} models, default: ${stats.defaultModel}`);
      
      return {
        success: true,
        data: {
          ...stats,
          environmentVariable: {
            current: process.env['OLLAMA_MODEL'] || null,
            framework: process.env['MODEL_INFERENCE_FRAMEWORK'] || 'ollama',
            migration: {
              before: 'Manual OLLAMA_MODEL environment variable',
              after: 'Auto-detected from available models',
              benefit: 'Always uses available models, no manual updates needed'
            }
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get model stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  /**
   * 刷新模型缓存
   * POST /api/model-config/refresh
   */
  @Post('refresh')
  async refreshModels(@Query('framework') framework?: string) {
    try {
      const targetFramework = this.parseFramework(framework);
      await this.dynamicModelConfig.refreshModels(targetFramework);
      
      this.logger.log(`Refreshed models for ${targetFramework}`);
      
      return {
        success: true,
        message: `Models refreshed for ${targetFramework}`,
        data: {
          framework: targetFramework,
          refreshedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to refresh models:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  /**
   * 清除模型缓存
   * POST /api/model-config/clear-cache
   */
  @Post('clear-cache')
  async clearCache() {
    try {
      this.dynamicModelConfig.clearCache();
      
      this.logger.log('Model cache cleared');
      
      return {
        success: true,
        message: 'Model cache cleared successfully',
        data: {
          clearedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  /**
   * 解析框架参数
   */
  private parseFramework(framework?: string): ModelFramework {
    if (!framework) {
      const envFramework = process.env['MODEL_INFERENCE_FRAMEWORK']?.toLowerCase();
      return envFramework === 'vllm' ? ModelFramework.VLLM : ModelFramework.OLLAMA;
    }

    switch (framework.toLowerCase()) {
      case 'vllm':
        return ModelFramework.VLLM;
      case 'ollama':
        return ModelFramework.OLLAMA;
      default:
        this.logger.warn(`Unknown framework: ${framework}, defaulting to ollama`);
        return ModelFramework.OLLAMA;
    }
  }
}
