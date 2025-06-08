import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ModelFramework } from '../types/framework.types';

/**
 * 模型信息接口
 */
interface ModelInfo {
  name: string;
  size?: string;
  modified?: string;
  digest?: string;
  details?: any;
}

/**
 * 动态模型配置服务
 * 
 * 自动从 Ollama 或 vLLM 获取可用模型列表，
 * 并选择第一个作为默认模型，替代硬编码的 OLLAMA_MODEL 环境变量
 */
@Injectable()
export class DynamicModelConfigService {
  private readonly logger = new Logger(DynamicModelConfigService.name);
  private modelCache = new Map<ModelFramework, ModelInfo[]>();
  private defaultModelCache = new Map<ModelFramework, string>();
  private lastFetchTime = new Map<ModelFramework, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(private readonly httpService: HttpService) {}

  /**
   * 获取默认模型
   * 根据当前框架自动选择第一个可用模型
   */
  async getDefaultModel(framework?: ModelFramework): Promise<string> {
    const targetFramework = framework || this.getCurrentFramework();
    
    // 检查缓存
    const cached = this.defaultModelCache.get(targetFramework);
    const lastFetch = this.lastFetchTime.get(targetFramework) || 0;
    const now = Date.now();
    
    if (cached && (now - lastFetch) < this.CACHE_TTL) {
      this.logger.debug(`Using cached default model for ${targetFramework}: ${cached}`);
      return cached;
    }

    try {
      // 获取可用模型列表
      const models = await this.getAvailableModels(targetFramework);
      
      if (models.length === 0) {
        const fallback = this.getFallbackModel(targetFramework);
        this.logger.warn(`No models found for ${targetFramework}, using fallback: ${fallback}`);
        return fallback;
      }

      // 选择第一个模型作为默认
      const defaultModel = models[0].name;
      
      // 更新缓存
      this.defaultModelCache.set(targetFramework, defaultModel);
      this.lastFetchTime.set(targetFramework, now);
      
      this.logger.log(`Auto-selected default model for ${targetFramework}: ${defaultModel}`);
      return defaultModel;
      
    } catch (error) {
      this.logger.error(`Failed to get default model for ${targetFramework}:`, error);
      
      // 返回缓存的值或回退值
      const fallback = cached || this.getFallbackModel(targetFramework);
      this.logger.warn(`Using fallback model: ${fallback}`);
      return fallback;
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(framework: ModelFramework): Promise<ModelInfo[]> {
    // 检查缓存
    const cached = this.modelCache.get(framework);
    const lastFetch = this.lastFetchTime.get(framework) || 0;
    const now = Date.now();
    
    if (cached && (now - lastFetch) < this.CACHE_TTL) {
      this.logger.debug(`Using cached models for ${framework}: ${cached.length} models`);
      return cached;
    }

    try {
      let models: ModelInfo[] = [];
      
      switch (framework) {
        case ModelFramework.OLLAMA:
          models = await this.getOllamaModels();
          break;
        case ModelFramework.VLLM:
          models = await this.getVllmModels();
          break;
        default:
          this.logger.warn(`Unsupported framework: ${framework}`);
          return [];
      }

      // 更新缓存
      this.modelCache.set(framework, models);
      this.lastFetchTime.set(framework, now);
      
      this.logger.log(`Found ${models.length} models for ${framework}`);
      return models;
      
    } catch (error) {
      this.logger.error(`Failed to get models for ${framework}:`, error);
      
      // 返回缓存的值或空数组
      return cached || [];
    }
  }

  /**
   * 获取 Ollama 模型列表
   */
  private async getOllamaModels(): Promise<ModelInfo[]> {
    const ollamaUrl = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
    const url = `${ollamaUrl}/api/tags`;
    
    this.logger.debug(`Fetching Ollama models from: ${url}`);
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 10000 })
      );
      
      const data = response.data;
      if (!data || !data.models || !Array.isArray(data.models)) {
        this.logger.warn('Invalid response format from Ollama API');
        return [];
      }

      const models: ModelInfo[] = data.models.map((model: any) => ({
        name: model.name || model.model || 'unknown',
        size: model.size ? this.formatSize(model.size) : undefined,
        modified: model.modified_at || model.modified,
        digest: model.digest,
        details: model.details
      }));

      this.logger.debug(`Ollama models: ${models.map(m => m.name).join(', ')}`);
      return models;
      
    } catch (error) {
      this.logger.error('Failed to fetch Ollama models:', error);
      throw error;
    }
  }

  /**
   * 获取 vLLM 模型列表
   */
  private async getVllmModels(): Promise<ModelInfo[]> {
    const vllmUrl = process.env['VLLM_API_URL'] || 'http://localhost:8000';
    const url = `${vllmUrl}/v1/models`;
    
    this.logger.debug(`Fetching vLLM models from: ${url}`);
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 10000 })
      );
      
      const data = response.data;
      if (!data || !data.data || !Array.isArray(data.data)) {
        this.logger.warn('Invalid response format from vLLM API');
        return [];
      }

      const models: ModelInfo[] = data.data.map((model: any) => ({
        name: model.id || model.model || 'unknown',
        size: undefined, // vLLM 通常不提供大小信息
        modified: model.created ? new Date(model.created * 1000).toISOString() : undefined,
        details: {
          object: model.object,
          owned_by: model.owned_by,
          permission: model.permission
        }
      }));

      this.logger.debug(`vLLM models: ${models.map(m => m.name).join(', ')}`);
      return models;
      
    } catch (error) {
      this.logger.error('Failed to fetch vLLM models:', error);
      throw error;
    }
  }

  /**
   * 获取当前框架
   */
  private getCurrentFramework(): ModelFramework {
    const framework = process.env['MODEL_INFERENCE_FRAMEWORK']?.toLowerCase();
    
    switch (framework) {
      case 'ollama':
        return ModelFramework.OLLAMA;
      case 'vllm':
        return ModelFramework.VLLM;
      default:
        return ModelFramework.OLLAMA; // 默认使用 Ollama
    }
  }

  /**
   * 获取回退模型
   */
  private getFallbackModel(framework: ModelFramework): string {
    switch (framework) {
      case ModelFramework.OLLAMA:
        return process.env['OLLAMA_MODEL'] || 'llama3.2:latest';
      case ModelFramework.VLLM:
        return process.env['VLLM_MODEL'] || 'microsoft/DialoGPT-medium';
      default:
        return 'llama3.2:latest';
    }
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
   * 清除缓存
   */
  clearCache(): void {
    this.modelCache.clear();
    this.defaultModelCache.clear();
    this.lastFetchTime.clear();
    this.logger.debug('Model cache cleared');
  }

  /**
   * 刷新模型列表
   */
  async refreshModels(framework?: ModelFramework): Promise<void> {
    const targetFramework = framework || this.getCurrentFramework();
    
    // 清除特定框架的缓存
    this.modelCache.delete(targetFramework);
    this.defaultModelCache.delete(targetFramework);
    this.lastFetchTime.delete(targetFramework);
    
    // 重新获取
    await this.getAvailableModels(targetFramework);
    await this.getDefaultModel(targetFramework);
    
    this.logger.log(`Refreshed models for ${targetFramework}`);
  }

  /**
   * 获取模型统计信息
   */
  async getModelStats(): Promise<{
    framework: ModelFramework;
    totalModels: number;
    defaultModel: string;
    models: ModelInfo[];
    lastUpdated: Date | null;
  }> {
    const framework = this.getCurrentFramework();
    const models = await this.getAvailableModels(framework);
    const defaultModel = await this.getDefaultModel(framework);
    const lastFetch = this.lastFetchTime.get(framework);
    
    return {
      framework,
      totalModels: models.length,
      defaultModel,
      models,
      lastUpdated: lastFetch ? new Date(lastFetch) : null
    };
  }
}
