import { Injectable, Logger } from '@nestjs/common';
import got from 'got-cjs';
import { z } from 'zod';
import { ModelOfMiner, OllamaModelList } from '@saito/models';
import { FrameworkManagerService, ModelFramework } from '@saito/model-framework';
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
    private readonly frameworkManager: FrameworkManagerService
  ) {}

  /**
   * 检查框架状态
   */
  async checkFrameworkStatus(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        const detection = await this.frameworkManager.detectFrameworks();

        // 如果有任何可用的框架，返回 true
        return detection.available.length > 0;
      },
      'check-framework-status',
      false
    );
  }

  /**
   * 获取本地模型列表
   */
  async getLocalModels(): Promise<z.infer<typeof OllamaModelList>> {
    return this.errorHandler.safeExecute(
      async () => {
        const detection = await this.frameworkManager.detectFrameworks();
        const currentFramework = this.frameworkManager.getCurrentFramework();

        if (detection.available.length === 0) {
          return { models: [] };
        }

        let url: URL;
        if (currentFramework === ModelFramework.OLLAMA) {
          const ollamaUrl = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
          url = new URL(`api/tags`, ollamaUrl);
        } else if (currentFramework === ModelFramework.VLLM) {
          const vllmUrl = process.env['VLLM_API_URL'] || 'http://localhost:8000';
          url = new URL(`v1/models`, vllmUrl);
        } else {
          return { models: [] };
        }

        const response = await got.get(url.toString(), {
          timeout: { request: STATUS_CHECK_TIMEOUT },
          retry: { limit: 0 }
        }).json();

        // 转换 vLLM 格式
        if (currentFramework === ModelFramework.VLLM) {
          return this.convertVllmResponse(response);
        }

        return response as z.infer<typeof OllamaModelList>;
      },
      'get-local-models',
      { models: [] }
    );
  }

  /**
   * 转换 vLLM 响应格式
   */
  private convertVllmResponse(response: any): z.infer<typeof OllamaModelList> {
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
        const detection = await this.frameworkManager.detectFrameworks();
        const currentFramework = this.frameworkManager.getCurrentFramework();

        return {
          detected: currentFramework,
          available: detection.available,
          unavailable: detection.unavailable,
          recommended: detection.recommended || null
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
        const detection = await this.frameworkManager.detectFrameworks();

        if (framework) {
          // 检查特定框架
          return detection.available.includes(framework);
        }

        // 检查任何可用框架
        return detection.available.length > 0;
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
  async refreshModels(): Promise<z.infer<typeof OllamaModelList>> {
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
