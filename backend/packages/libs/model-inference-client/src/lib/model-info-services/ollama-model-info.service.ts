import { Injectable, Logger } from '@nestjs/common';
import { IModelInfoService, UnifiedModelList, UnifiedModelInfo } from '@saito/models';

/**
 * Ollama 模型信息服务
 * 
 */
@Injectable()
export class OllamaModelInfoService {
  private readonly logger = new Logger(OllamaModelInfoService.name);

  /**
   * 获取模型列表
   */
  async fetchModelList(baseUrl: string): Promise<UnifiedModelList> {
    try {
      this.logger.debug(`Fetching Ollama model list from: ${baseUrl}`);
      
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch model list: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const models = data.models || [];

      // 转换为统一格式
      const unifiedModels = models.map((model: any) => ({
        id: model.name,
        name: model.name,
        size: model.size || 0,
        digest: model.digest,
        modified_at: model.modified_at,
        details: {
          family: model.details?.family,
          format: model.details?.format,
          parameter_size: model.details?.parameter_size,
          quantization_level: model.details?.quantization_level
        }
      }));

      this.logger.debug(`Successfully fetched ${unifiedModels.length} Ollama models`);

      return {
        models: unifiedModels,
        total: unifiedModels.length,
        framework: 'ollama'
      };

    } catch (error) {
      this.logger.error(`Failed to fetch Ollama model list: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 获取特定模型信息
   */
  async fetchModelInfo(modelName: string, baseUrl: string): Promise<UnifiedModelInfo> {
    try {
      this.logger.debug(`Fetching Ollama model info for: ${modelName}`);
      
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: modelName }),

      });

      if (!response.ok) {
        throw new Error(`Failed to fetch model info: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // 转换为统一格式
      const unifiedInfo: UnifiedModelInfo = {
        name: modelName,
        size: data.size ? String(data.size) : undefined,
        family: data.details?.family,
        format: data.details?.format,
        parameters: data.details?.parameter_size ? String(data.details.parameter_size) : undefined,
        quantization: data.details?.quantization_level,
        modified_at: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString(),
        digest: data.digest || '',
        details: {
          template: data.template,
          system: data.system,
          license: data.license,
          ...data.details
        }
      };

      this.logger.debug(`Successfully fetched Ollama model info for: ${modelName}`);
      return unifiedInfo;

    } catch (error) {
      this.logger.error(`Failed to fetch Ollama model info for ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 获取版本信息
   */
  async fetchVersion(baseUrl: string): Promise<string> {
    try {
      this.logger.debug(`Fetching Ollama version from: ${baseUrl}`);
      
      const response = await fetch(`${baseUrl}/api/version`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch version: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const version = data.version || 'unknown';

      this.logger.debug(`Ollama version: ${version}`);
      return version;

    } catch (error) {
      this.logger.error(`Failed to fetch Ollama version: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 检查模型是否存在
   */
  async checkModelExists(modelName: string, baseUrl: string): Promise<boolean> {
    try {
      await this.fetchModelInfo(modelName, baseUrl);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取模型统计信息
   */
  async getModelStats(baseUrl: string): Promise<{
    totalModels: number;
    totalSize: number;
    families: string[];
  }> {
    try {
      const modelList = await this.fetchModelList(baseUrl);
      const models = modelList.models;

      const totalModels = models.length;
      const totalSize = models.reduce((sum: number, model: any) => sum + (typeof model.size === 'number' ? model.size : 0), 0);
      const families = [...new Set(models.map((model: any) => model.details?.['family']).filter(Boolean))] as string[];

      return {
        totalModels,
        totalSize,
        families
      };

    } catch (error) {
      this.logger.error(`Failed to get Ollama model stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
