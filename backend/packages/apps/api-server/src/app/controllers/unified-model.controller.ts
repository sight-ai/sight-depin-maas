import { Controller, Get, Post, Body, Res, Param, Query, Logger } from '@nestjs/common';
import {
  FrameworkManagerService,
  ModelFramework
} from '@saito/model-framework';

/**
 * Unified model controller that works with both Ollama and vLLM
 * Uses modern FrameworkManagerService architecture
 */
@Controller('/api/unified')
export class UnifiedModelController {
  private readonly logger = new Logger(UnifiedModelController.name);

  constructor(
    private readonly frameworkManager: FrameworkManagerService
  ) {}

  /**
   * Get current framework status
   */
  @Get('/framework/status')
  async getFrameworkStatus() {
    try {
      const detection = await this.frameworkManager.detectFrameworks();
      const currentFramework = this.frameworkManager.getCurrentFramework();

      return {
        success: true,
        data: {
          current: currentFramework,
          recommended: detection.recommended,
          available: detection.available,
          unavailable: detection.unavailable,
          details: detection.details
        }
      };
    } catch (error) {
      this.logger.error('Error getting framework status:', error);

      // 检查是否是框架不可用的特殊错误
      if (error instanceof Error && error.message === 'NO_FRAMEWORKS_AVAILABLE') {
        return {
          success: false,
          error: 'NO_FRAMEWORKS_AVAILABLE: Please start ollama or vLLM service first'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Switch framework
   */
  @Post('/framework/switch')
  async switchFramework(@Body() body: { framework: string; force?: boolean }) {
    try {
      const framework = body.framework as ModelFramework;

      // 验证框架值是否有效
      const validFrameworks = Object.values(ModelFramework);
      if (!validFrameworks.includes(framework)) {
        this.logger.warn(`Invalid framework: ${framework}. Valid frameworks: ${validFrameworks.join(', ')}`);
        return {
          success: false,
          error: `Invalid framework: ${framework}. Must be one of: ${validFrameworks.join(', ')}`
        };
      }

      // 检查框架是否支持
      const supportedFrameworks = [ModelFramework.OLLAMA, ModelFramework.VLLM];
      if (!supportedFrameworks.includes(framework)) {
        return {
          success: false,
          error: `Framework ${framework} is not supported. Available frameworks: ${supportedFrameworks.join(', ')}`
        };
      }

      // 使用新的框架管理器进行切换
      // 对于进程管理功能，我们允许切换到未运行的框架
      await this.frameworkManager.switchFramework(framework, {
        force: body.force,
        validateAvailability: false // 不验证服务是否运行，允许切换到未启动的框架
      });

      return {
        success: true,
        message: `Switched to framework: ${framework}`,
        currentFramework: framework
      };
    } catch (error) {
      this.logger.error('Error switching framework:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List models using current framework
   */
  @Get('/models')
  async listModels(@Query('framework') framework?: string) {
    try {
      let service;

      if (framework && Object.values(ModelFramework).includes(framework as ModelFramework)) {
        service = await this.frameworkManager.createFrameworkService(framework as ModelFramework);
      } else {
        service = await this.frameworkManager.createFrameworkService();
      }

      const models = await service.listModels();

      return {
        success: true,
        data: models
      };
    } catch (error) {
      this.logger.error('Error listing models:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check service health
   */
  @Get('/health')
  async checkHealth() {
    try {
      const detection = await this.frameworkManager.detectFrameworks();
      const currentFramework = this.frameworkManager.getCurrentFramework();

      const healthStatus = {
        current: currentFramework,
        available: detection.available,
        unavailable: detection.unavailable,
        details: detection.details,
        recommended: detection.recommended
      };

      return {
        success: true,
        data: healthStatus
      };
    } catch (error) {
      this.logger.error('Error checking health:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get service version
   */
  @Get('/version')
  async getVersion(@Query('framework') framework?: string) {
    try {
      let service;

      if (framework && Object.values(ModelFramework).includes(framework as ModelFramework)) {
        service = await this.frameworkManager.createFrameworkService(framework as ModelFramework);
      } else {
        service = await this.frameworkManager.createFrameworkService();
      }

      const version = await service.getVersion();

      return {
        success: true,
        data: version
      };
    } catch (error) {
      this.logger.error('Error getting version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
