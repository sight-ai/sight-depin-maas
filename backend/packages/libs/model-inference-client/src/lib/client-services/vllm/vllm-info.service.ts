import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '@saito/models';
import { IInfoService } from '../contracts/request-handler.contract';

/**
 * vLLM 信息服务
 * 专门负责获取模型列表、版本信息等基础信息
 *
 * 实现 IInfoService 
 */
@Injectable()
export class VllmInfoService {
  private readonly logger = new Logger(VllmInfoService.name);

  /**
   * 获取模型列表
   */
  async fetchModelList(baseUrl: string): Promise<UnifiedModelList> {
    try {
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/v1/models`, config);

      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        this.logger.warn('Invalid response format from vLLM API');
        return {
          models: [],
          total: 0,
          framework: ModelFramework.VLLM
        };
      }

      const models = response.data.data.map((model: any) => ({
        name: model.id || model.model || 'unknown',
        size: 'unknown', // vLLM 通常不提供大小信息
        modified_at: model.created ? new Date(model.created * 1000).toISOString() : undefined,
        details: {
          object: model.object,
          owned_by: model.owned_by,
          permission: model.permission
        }
      }));

      this.logger.debug(`Found ${models.length} models`);

      return {
        models,
        total: models.length,
        framework: ModelFramework.VLLM
      };
    } catch (error) {
      this.logger.error('Failed to fetch model list:', error);
      throw error;
    }
  }

  /**
   * 获取特定模型信息
   */
  async fetchModelInfo(modelName: string, baseUrl: string): Promise<UnifiedModelInfo> {
    try {
      const modelList = await this.fetchModelList(baseUrl);
      const normalizedName = this.normalizeModelName(modelName);
      
      const model = modelList.models.find((m: any) =>
        this.normalizeModelName(m.name) === normalizedName
      );

      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }

      this.logger.debug(`Found model info for: ${modelName}`);
      return model;
    } catch (error) {
      this.logger.error(`Failed to fetch model info for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * 获取版本信息
   */
  async fetchVersion(baseUrl: string): Promise<string> {
    try {
      // vLLM 通常不提供专门的版本端点，我们通过模型列表来确认服务可用
      await this.fetchModelList(baseUrl);
      return 'vllm'; // 返回框架名称作为版本标识
    } catch (error) {
      this.logger.error('Failed to fetch version:', error);
      throw error;
    }
  }

  /**
   * 获取详细的服务信息
   */
  async fetchServiceInfo(baseUrl: string): Promise<{
    version: string;
    modelCount: number;
    models: string[];
    status: 'healthy' | 'unhealthy';
  }> {
    try {
      const [version, modelList] = await Promise.all([
        this.fetchVersion(baseUrl),
        this.fetchModelList(baseUrl)
      ]);

      return {
        version,
        modelCount: modelList.total,
        models: modelList.models.map((m: any) => m.name),
        status: 'healthy'
      };
    } catch (error) {
      this.logger.error('Failed to fetch service info:', error);
      return {
        version: 'unknown',
        modelCount: 0,
        models: [],
        status: 'unhealthy'
      };
    }
  }

  /**
   * 检查模型是否存在
   */
  async checkModelExists(modelName: string, baseUrl: string): Promise<boolean> {
    try {
      const modelList = await this.fetchModelList(baseUrl);
      const normalizedName = this.normalizeModelName(modelName);
      
      const exists = modelList.models.some((m: any) =>
        this.normalizeModelName(m.name) === normalizedName
      );

      this.logger.debug(`Model ${modelName} exists: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check if model ${modelName} exists:`, error);
      return false;
    }
  }

  /**
   * 获取推荐的模型
   */
  async getRecommendedModel(baseUrl: string): Promise<string | null> {
    try {
      const modelList = await this.fetchModelList(baseUrl);
      
      if (modelList.models.length === 0) {
        return null;
      }

      // 返回第一个可用模型
      const firstModel = modelList.models[0].name;
      this.logger.debug(`Recommended model: ${firstModel} (first available)`);
      return firstModel;
    } catch (error) {
      this.logger.error('Failed to get recommended model:', error);
      return null;
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 标准化模型名称
   */
  private normalizeModelName(modelName: string): string {
    return modelName.trim().toLowerCase();
  }

  /**
   * 获取HTTP配置
   */
  private getHttpConfig(): any {
    return {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
}
