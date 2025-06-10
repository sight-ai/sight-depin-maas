import { Injectable, Logger } from '@nestjs/common';
import got from 'got-cjs';
import { z } from 'zod';
import { ModelOfMiner, OllamaModelListSchema } from '@saito/models';
import { UnifiedModelService } from '@saito/model-inference-client';
import { ModelFramework } from '@saito/models';
// import { FrameworkSwitchService } from '@saito/model-inference-framework-management';
import { ErrorHandler } from '../utils/error-handler';

const STATUS_CHECK_TIMEOUT = 2000;

/**
 * 模型管理器
 * 
 * 负责：
 * 1. 本地模型列表获取
 * 2. 框架状态检查
 * 3. 模型格式转换
 */
@Injectable()
export class ModelManager {
  private readonly logger = new Logger(ModelManager.name);
  private readonly errorHandler = new ErrorHandler(ModelManager.name);

  constructor(
    private readonly unifiedModelService: UnifiedModelService,
    // private readonly frameworkSwitchService: FrameworkSwitchService
  ) {}

  /**
   * 检查框架状态
   */
  async checkFrameworkStatus(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        // 简化实现：直接检查 Ollama
        try {
          const ollamaUrl = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
          const response = await got.get(`${ollamaUrl}/api/tags`, {
            timeout: { request: STATUS_CHECK_TIMEOUT },
            retry: { limit: 0 }
          });
          return response.statusCode === 200;
        } catch {
          return false;
        }
      },
      'check-framework-status',
      false
    );
  }

  /**
   * 获取本地模型列表
   */
  async getLocalModels(): Promise<z.infer<typeof OllamaModelListSchema>> {
    return this.errorHandler.safeExecute(
      async () => {
        // 简化实现：默认使用 Ollama
        const ollamaUrl = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
        const url = new URL(`api/tags`, ollamaUrl);

        const response = await got.get(url.toString(), {
          timeout: { request: STATUS_CHECK_TIMEOUT },
          retry: { limit: 0 }
        }).json();

        return response as z.infer<typeof OllamaModelListSchema>;
      },
      'get-local-models',
      { models: [] }
    );
  }

  /**
   * 转换 vLLM 响应格式
   */
  private convertVllmResponse(response: any): z.infer<typeof OllamaModelListSchema> {
    const vllmResponse = response as any;
    return {
      models: vllmResponse.data?.map((model: any) => ({
        name: model.id,
        size: 0,
        digest: '',
        modified_at: new Date(model.created * 1000).toISOString(),
        details: { family: 'vllm', format: 'vllm' }
      })) || []
    };
  }

  /**
   * 获取框架检测信息
   */
  async getFrameworkInfo(): Promise<{
    detected: ModelFramework | null;
    available: ModelFramework[];
    unavailable: ModelFramework[];
    recommended: ModelFramework | null;
  }> {
    return this.errorHandler.safeExecute(
      async () => {
        // 简化实现：检查 Ollama 是否可用
        const isOllamaAvailable = await this.checkFrameworkStatus();

        return {
          detected: isOllamaAvailable ? ModelFramework.OLLAMA : null,
          available: isOllamaAvailable ? [ModelFramework.OLLAMA] : [],
          unavailable: isOllamaAvailable ? [ModelFramework.VLLM] : [ModelFramework.OLLAMA, ModelFramework.VLLM],
          recommended: isOllamaAvailable ? ModelFramework.OLLAMA : null
        };
      },
      'get-framework-info',
      {
        detected: ModelFramework.OLLAMA,
        available: [],
        unavailable: [ModelFramework.OLLAMA, ModelFramework.VLLM],
        recommended: null
      }
    );
  }

  /**
   * 检查特定框架是否在线
   */
  async isFrameworkOnline(framework?: ModelFramework): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        // 简化实现：只检查 Ollama
        if (framework && framework !== ModelFramework.OLLAMA) {
          return false;
        }
        return this.checkFrameworkStatus();
      },
      'check-framework-online',
      false
    );
  }

  /**
   * 获取模型统计信息
   */
  async getModelStats(): Promise<{
    totalModels: number;
    framework: ModelFramework | null;
    isOnline: boolean;
  }> {
    return this.errorHandler.safeExecute(
      async () => {
        const [models, frameworkInfo, isOnline] = await Promise.all([
          this.getLocalModels(),
          this.getFrameworkInfo(),
          this.checkFrameworkStatus()
        ]);

        return {
          totalModels: models.models.length,
          framework: frameworkInfo.detected,
          isOnline
        };
      },
      'get-model-stats',
      {
        totalModels: 0,
        framework: ModelFramework.OLLAMA,
        isOnline: false
      }
    );
  }

  /**
   * 刷新模型列表（清除缓存并重新获取）
   */
  async refreshModels(): Promise<z.infer<typeof OllamaModelListSchema>> {
    // 这里可以添加清除缓存的逻辑
    return this.getLocalModels();
  }

  /**
   * 检查模型是否存在
   */
  async hasModel(modelName: string): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        const models = await this.getLocalModels();
        return models.models.some(model => model.name === modelName);
      },
      'check-model-exists',
      false
    );
  }

  /**
   * 获取模型详情
   */
  async getModelDetails(modelName: string): Promise<any | null> {
    return this.errorHandler.safeExecute(
      async () => {
        const models = await this.getLocalModels();
        return models.models.find(model => model.name === modelName) || null;
      },
      'get-model-details',
      null
    );
  }
}
