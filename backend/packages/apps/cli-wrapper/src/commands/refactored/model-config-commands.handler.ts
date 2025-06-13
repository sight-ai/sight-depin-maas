import {
  IDirectServiceAccess,
  IUserInterface,
  CommandResult,
  TableData,
  MessageType,
  BoxType
} from '../../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';
import { ModelFramework } from '@saito/model-inference-client';

/**
 * 模型配置命令处理器 
 * 只负责动态模型配置相关命令的处理逻辑，直接使用libs服务
 */
export class ModelConfigCommandsHandler {
  constructor(
    private readonly serviceAccess: IDirectServiceAccess,
    private readonly ui: IUserInterface,
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {}

  /**
   * 处理获取默认模型命令
   */
  async handleGetDefaultModel(framework?: string): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Getting default model...');
    spinner.start();

    try {
      const dynamicModelConfig = await this.serviceAccess.getDynamicModelConfigService();
      const targetFramework = this.parseFramework(framework);
      
      const defaultModel = await dynamicModelConfig.getDefaultModel(targetFramework);
      
      spinner.succeed('Default model retrieved successfully');

      this.showDefaultModel(defaultModel, targetFramework);

      return {
        success: true,
        data: {
          framework: targetFramework,
          defaultModel,
          source: 'dynamic_detection'
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to get default model');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Get default model failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'GET_DEFAULT_MODEL_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理获取可用模型列表命令
   */
  async handleGetAvailableModels(framework?: string): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Fetching available models...');
    spinner.start();

    try {
      const dynamicModelConfig = await this.serviceAccess.getDynamicModelConfigService();
      const targetFramework = this.parseFramework(framework);
      
      const models = await dynamicModelConfig.getAvailableModels(targetFramework);
      
      spinner.succeed('Available models fetched successfully');

      if (models.length === 0) {
        this.ui.warning(`No models available for ${targetFramework} framework`);
      } else {
        this.showAvailableModelsTable(models, targetFramework);
      }

      return {
        success: true,
        data: {
          framework: targetFramework,
          totalModels: models.length,
          models: models.map((model: any, index: number) => ({
            ...model,
            isDefault: index === 0
          }))
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to fetch available models');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Get available models failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'GET_AVAILABLE_MODELS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理获取模型统计信息命令
   */
  async handleGetModelStats(): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Getting model statistics...');
    spinner.start();

    try {
      const dynamicModelConfig = await this.serviceAccess.getDynamicModelConfigService();
      
      const stats = await dynamicModelConfig.getModelStats();
      
      spinner.succeed('Model statistics retrieved successfully');

      this.showModelStats(stats);

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
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to get model statistics');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Get model stats failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'GET_MODEL_STATS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理刷新模型缓存命令
   */
  async handleRefreshModels(framework?: string): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Refreshing models...');
    spinner.start();

    try {
      const dynamicModelConfig = await this.serviceAccess.getDynamicModelConfigService();
      const targetFramework = this.parseFramework(framework);
      
      await dynamicModelConfig.refreshModels(targetFramework);
      
      spinner.succeed(`Models refreshed for ${targetFramework} framework`);

      this.ui.showBox(
        'Models Refreshed',
        `Successfully refreshed models for ${targetFramework.toUpperCase()} framework.\n\n` +
        `Framework: ${targetFramework}\n` +
        `Refreshed at: ${new Date().toISOString()}\n\n` +
        `The model cache has been updated with the latest available models.`,
        BoxType.SUCCESS
      );

      return {
        success: true,
        data: {
          framework: targetFramework,
          refreshedAt: new Date().toISOString(),
          message: `Models refreshed for ${targetFramework}`
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to refresh models');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Refresh models failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'REFRESH_MODELS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理清除模型缓存命令
   */
  async handleClearCache(): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Clearing model cache...');
    spinner.start();

    try {
      const dynamicModelConfig = await this.serviceAccess.getDynamicModelConfigService();
      
      dynamicModelConfig.clearCache();
      
      spinner.succeed('Model cache cleared successfully');

      this.ui.showBox(
        'Cache Cleared',
        `Model cache has been cleared successfully.\n\n` +
        `Cleared at: ${new Date().toISOString()}\n\n` +
        `All cached model information has been removed. ` +
        `The next model operation will fetch fresh data from the inference frameworks.`,
        BoxType.SUCCESS
      );

      return {
        success: true,
        data: {
          clearedAt: new Date().toISOString(),
          message: 'Model cache cleared successfully'
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to clear cache');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Clear cache failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'CLEAR_CACHE_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 显示默认模型信息
   */
  private showDefaultModel(defaultModel: string, framework: string): void {
    this.ui.showBox(
      `Default Model - ${framework.toUpperCase()}`,
      `Framework: ${framework}\n` +
      `Default Model: ${defaultModel}\n` +
      `Source: Dynamic Detection\n\n` +
      `This model will be used automatically when no specific model is specified.`,
      BoxType.INFO
    );
  }

  /**
   * 显示可用模型表格
   */
  private showAvailableModelsTable(models: any[], framework: string): void {
    const tableData: TableData = {
      title: `Available Models - ${framework.toUpperCase()} (${models.length})`,
      headers: ['Name', 'Size', 'Modified', 'Default'],
      rows: models.map((model, index) => [
        model.name || 'N/A',
        model.size || 'N/A',
        this.formatDate(model.modified),
        index === 0 ? '✓' : ''
      ])
    };

    this.ui.showTable(tableData);
  }

  /**
   * 显示模型统计信息
   */
  private showModelStats(stats: any): void {
    this.ui.showTitle('Model Statistics');

    this.ui.showSubtitle('Overview');
    this.ui.showKeyValue('Total Models', stats.totalModels?.toString() || '0');
    this.ui.showKeyValue('Default Model', stats.defaultModel || 'None');
    this.ui.showKeyValue('Framework', stats.framework || 'Unknown');

    console.log();

    this.ui.showSubtitle('Environment Configuration');
    this.ui.showKeyValue('Current OLLAMA_MODEL', process.env['OLLAMA_MODEL'] || 'Not set');
    this.ui.showKeyValue('Current Framework', process.env['MODEL_INFERENCE_FRAMEWORK'] || 'ollama');

    console.log();

    this.ui.showSubtitle('Migration Benefits');
    this.ui.info('• Before: Manual OLLAMA_MODEL environment variable');
    this.ui.info('• After: Auto-detected from available models');
    this.ui.info('• Benefit: Always uses available models, no manual updates needed');
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
        this.ui.warning(`Unknown framework: ${framework}, defaulting to ollama`);
        return ModelFramework.OLLAMA;
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }
}
