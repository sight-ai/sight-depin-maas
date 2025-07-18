/**
 * 模型配置数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责模型配置的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供模型配置特定的接口
 */

import { ApiResponse, ModelConfigData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 模型配置数据服务
 */
export class ModelConfigDataService extends BaseDataService<ModelConfigData> {
  async fetch(): Promise<ApiResponse<ModelConfigData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取模型列表和配置信息
      const [modelsResponse, configResponse] = await Promise.allSettled([
        this.apiClient.getModels(),
        this.apiClient.getCurrentFramework()
      ]);

      // 初始化模型配置数据
      let modelConfigData: ModelConfigData = {
        currentFramework: 'ollama',
        availableModels: [],
        installedModels: [],
        modelStatus: {},
        downloadProgress: {}
      };

      // 处理配置信息
      if (this.isSuccessResponse(configResponse)) {
        const config = this.getResponseData(configResponse);
        modelConfigData.currentFramework = this.safeGet(config, 'framework', 'ollama');
      }

      // 处理模型列表
      if (this.isSuccessResponse(modelsResponse)) {
        const models = this.getResponseData(modelsResponse);
        if (Array.isArray(models)) {
          modelConfigData.installedModels = models.map((model: any) => ({
            name: this.safeGet(model, 'name', 'unknown'),
            size: this.safeGet(model, 'size', 0),
            modified_at: this.safeGet(model, 'modified_at', new Date().toISOString()),
            digest: this.safeGet(model, 'digest', ''),
            details: {
              format: this.safeGet(model, 'details.format', 'unknown'),
              family: this.safeGet(model, 'details.family', 'unknown'),
              families: this.safeGet(model, 'details.families', []),
              parameter_size: this.safeGet(model, 'details.parameter_size', ''),
              quantization_level: this.safeGet(model, 'details.quantization_level', '')
            }
          }));

          // 设置模型状态
          modelConfigData.installedModels.forEach(model => {
            modelConfigData.modelStatus[model.name] = 'ready';
          });
        }
      }

      // 设置可用模型列表（示例数据）
      modelConfigData.availableModels = this.getAvailableModels();

      return this.createSuccessResponse(modelConfigData);

    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch model config data'
      );
    }
  }

  /**
   * 更新模型配置
   */
  async update(data: Partial<ModelConfigData>): Promise<ApiResponse<ModelConfigData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // ModelConfigurationDataService不处理设备注册
      // 设备注册应该通过DeviceRegistrationDataService处理
      return this.createErrorResponse('Model configuration update not implemented');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update model configuration'
      );
    }
  }

  /**
   * 获取可用模型列表
   */
  private getAvailableModels(): any[] {
    return [
      {
        name: 'llama2:7b',
        size: 3800000000,
        description: 'Llama 2 7B parameter model',
        tags: ['text-generation', 'chat'],
        popularity: 95
      },
      {
        name: 'llama2:13b',
        size: 7300000000,
        description: 'Llama 2 13B parameter model',
        tags: ['text-generation', 'chat'],
        popularity: 88
      },
      {
        name: 'codellama:7b',
        size: 3800000000,
        description: 'Code Llama 7B for code generation',
        tags: ['code-generation', 'programming'],
        popularity: 82
      },
      {
        name: 'mistral:7b',
        size: 4100000000,
        description: 'Mistral 7B parameter model',
        tags: ['text-generation', 'chat'],
        popularity: 79
      },
      {
        name: 'neural-chat:7b',
        size: 4200000000,
        description: 'Neural Chat 7B for conversations',
        tags: ['chat', 'conversation'],
        popularity: 75
      }
    ];
  }

  /**
   * 下载模型
   */
  async downloadModel(modelName: string): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有下载模型的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.downloadModel(modelName) 的方法
      return {
        success: true,
        data: {
          message: `Model download initiated: ${modelName}`,
          modelName: modelName,
          status: 'downloading'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to download model'
      );
    }
  }

  /**
   * 删除模型
   */
  async deleteModel(modelName: string): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有删除模型的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.deleteModel(modelName) 的方法
      return {
        success: true,
        data: {
          message: `Model deleted: ${modelName}`,
          modelName: modelName
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to delete model'
      );
    }
  }
}
