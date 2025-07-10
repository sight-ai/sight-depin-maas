import { Injectable, Logger } from '@nestjs/common';
import { UnifiedModelService } from '@saito/model-inference-client';

/**
 * 统一模型列表服务
 * 
 * 职责：
 * 1. 提供统一的模型列表接口
 * 2. 支持多种返回格式（Ollama、OpenAI、内部格式）
 * 3. 消除控制器中的重复代码
 * 4. 遵循单一职责原则
 */
@Injectable()
export class UnifiedModelListService {
  private readonly logger = new Logger(UnifiedModelListService.name);

  constructor(
    private readonly unifiedModelService: UnifiedModelService
  ) {}

  /**
   * 获取 Ollama 格式的模型列表
   * 用于 /ollama/api/tags 接口
   */
  async getOllamaFormatModels() {
    try {
      const modelList = await this.unifiedModelService.listModels();
      
      return {
        models: modelList.models
      };
    } catch (error) {
      this.logger.error('Error getting Ollama format models:', error);
      throw error;
    }
  }

  /**
   * 获取 OpenAI 格式的模型列表
   * 用于 /openai/v1/models 接口
   */
  async getOpenAIFormatModels() {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();
      const modelList = await this.unifiedModelService.listModels();

      return {
        object: 'list',
        data: modelList.models.map((model: any) => ({
          id: model.name,
          object: 'model',
          created: model.modified_at 
            ? Math.floor(new Date(model.modified_at).getTime() / 1000) 
            : Math.floor(Date.now() / 1000),
          owned_by: currentFramework.toLowerCase()
        }))
      };
    } catch (error) {
      this.logger.error('Error getting OpenAI format models:', error);
      throw error;
    }
  }

  /**
   * 获取内部 API 格式的模型列表
   * 用于 /api/v1/models/list 接口
   */
  async getInternalFormatModels() {
    try {
      const modelList = await this.unifiedModelService.listModels();
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      return {
        success: true,
        framework: currentFramework,
        models: modelList.models,
        total: modelList.total
      };
    } catch (error) {
      this.logger.error('Error getting internal format models:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        models: [],
        total: 0
      };
    }
  }

  /**
   * 获取当前框架信息
   */
  getCurrentFramework(): string {
    return this.unifiedModelService.getCurrentFramework();
  }
}
