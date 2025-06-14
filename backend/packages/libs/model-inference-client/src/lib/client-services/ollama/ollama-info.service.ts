import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '@saito/models';
import { IInfoService } from '../contracts/request-handler.contract';

/**
 * Ollama 信息服务
 * 专门负责获取模型列表、版本信息等基础信息
 *
 * 实现 IInfoService 
 */
@Injectable()
export class OllamaInfoService {
  private readonly logger = new Logger(OllamaInfoService.name);

  /**
   * 获取模型列表
   */
  async fetchModelList(baseUrl: string): Promise<UnifiedModelList> {
    try {
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/api/tags`, config);

      if (!response.data || !response.data.models || !Array.isArray(response.data.models)) {
        this.logger.warn('Invalid response format from Ollama API');
        return {
          models: [],
          total: 0,
          framework: ModelFramework.OLLAMA
        };
      }

      const models = response.data.models.map((model: any) => ({
        name: this.normalizeModelName(model.name || model.model || 'unknown'),
        size: model.size ? this.formatSize(model.size) : 'unknown',
        modified_at: model.modified_at || model.modified,
        digest: model.digest,
        details: model.details
      }));

      this.logger.debug(`Found ${models.length} models`);

      return {
        models,
        total: models.length,
        framework: ModelFramework.OLLAMA
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
      
      const model = modelList.models.find(m => 
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
      const config = this.getHttpConfig();
      const response = await axios.get(`${baseUrl}/api/version`, config);
      
      const version = response.data?.version || 'unknown';
      this.logger.debug(`Ollama version: ${version}`);
      
      return version;
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
        models: modelList.models.map(m => m.name),
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
      
      const exists = modelList.models.some(m => 
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

      // 优先推荐包含 'llama' 的模型
      const llamaModel = modelList.models.find(m => 
        m.name.toLowerCase().includes('llama')
      );

      if (llamaModel) {
        this.logger.debug(`Recommended model: ${llamaModel.name} (llama variant)`);
        return llamaModel.name;
      }

      // 否则返回第一个模型
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
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
