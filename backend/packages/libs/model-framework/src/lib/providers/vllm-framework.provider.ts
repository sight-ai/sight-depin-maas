import axios from 'axios';
import { AbstractFrameworkProvider, FrameworkProviderConfig, FrameworkHealthStatus, ServiceCreationOptions } from '../abstracts/framework-provider.abstract';
import { ModelFramework } from '../types/framework.types';

/**
 * vLLM 框架提供者
 */
export class VllmFrameworkProvider extends AbstractFrameworkProvider {
  readonly frameworkId = ModelFramework.VLLM;
  
  readonly config: FrameworkProviderConfig = {
    name: 'vllm',
    displayName: 'vLLM',
    defaultUrl: 'http://localhost:8000',
    defaultPort: 8000,
    healthCheckPath: '/health',
    timeout: 5000,
    retries: 3
  };

  /**
   * 检查 vLLM 服务健康状态
   */
  async checkHealth(url: string, options?: Record<string, any>): Promise<FrameworkHealthStatus> {
    const startTime = Date.now();
    
    try {
      const timeout = options?.['timeout'] || this.config.timeout || 5000;
      
      // vLLM 通常使用 /health 端点进行健康检查
      const healthCheckUrl = `${url.replace(/\/$/, '')}/health`;
      
      const response = await axios.get(healthCheckUrl, {
        timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SightAI-Framework-Detector'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        // 尝试获取版本信息
        const version = await this.getVersionFromModels(url, timeout);
        
        return {
          isAvailable: true,
          url,
          version,
          lastChecked: new Date(),
          responseTime,
          additionalInfo: {
            status: response.status,
            healthData: response.data
          }
        };
      } else {
        return {
          isAvailable: false,
          url,
          error: `HTTP ${response.status}: ${response.statusText}`,
          lastChecked: new Date(),
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        isAvailable: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTime
      };
    }
  }

  /**
   * 从 /v1/models 端点获取版本信息
   */
  private async getVersionFromModels(url: string, timeout: number): Promise<string> {
    try {
      const modelsUrl = `${url.replace(/\/$/, '')}/v1/models`;
      const response = await axios.get(modelsUrl, { timeout });
      
      if (response.status === 200) {
        return this.extractVersionFromModelsResponse(response.data);
      }
    } catch {
      // 忽略错误
    }
    
    return 'unknown';
  }

  /**
   * 从模型响应中提取版本信息
   */
  private extractVersionFromModelsResponse(data: any): string {
    // vLLM 通常在响应头或数据中包含版本信息
    if (data?.object === 'list' && Array.isArray(data.data)) {
      return 'vLLM (OpenAI Compatible)';
    }
    
    return 'unknown';
  }

  /**
   * 创建 vLLM 服务实例
   */
  async createService(options?: ServiceCreationOptions): Promise<any> {
    try {
      // 动态导入 vLLM 服务
      const { CleanVllmService } = await import('../services/clean-vllm.service');
      
      const service = new CleanVllmService();
      
      if (options?.logger) {
        options.logger.log('Created vLLM service instance');
      }
      
      return service;
    } catch (error) {
      const errorMessage = `Failed to create vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      if (options?.logger) {
        options.logger.error(errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 验证 vLLM 特定配置
   */
  protected override validateFrameworkSpecificConfig(config: Record<string, any>): boolean {
    // vLLM 特定的配置验证
    if (config['model'] && typeof config['model'] !== 'string') {
      return false;
    }

    // 验证 URL 格式
    try {
      const url = new URL(config['url']);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
    } catch {
      return false;
    }

    // vLLM 特定的端口验证（通常使用 8000）
    if (config['port'] && (typeof config['port'] !== 'number' || config['port'] < 1 || config['port'] > 65535)) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取 vLLM 版本信息
   */
  protected override async getVersion(): Promise<string> {
    try {
      const defaultUrl = process.env['VLLM_API_URL'] || this.config.defaultUrl;
      const healthStatus = await this.checkHealth(defaultUrl);
      return healthStatus.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * vLLM 特定的初始化逻辑
   */
  protected override async initialize(): Promise<void> {
    this.logger.log('Initializing vLLM framework provider');
    
    // 可以在这里添加 vLLM 特定的初始化逻辑
    // 例如：检查必要的环境变量、验证 GPU 可用性等
    
    const vllmUrl = process.env['VLLM_API_URL'];
    if (vllmUrl) {
      this.logger.log(`Using vLLM URL from environment: ${vllmUrl}`);
    }
  }

  /**
   * 获取 vLLM 特定的配置选项 - 只保留核心配置
   */
  getVllmSpecificConfig() {
    return {
      model: process.env['VLLM_MODEL'],
      gpuMemoryUtilization: process.env['VLLM_GPU_MEMORY_UTILIZATION'],
      maxModelLen: process.env['VLLM_MAX_MODEL_LEN']
    };
  }

  /**
   * 检查 vLLM 模型是否可用
   */
  async checkModelAvailability(modelName: string, url?: string): Promise<boolean> {
    try {
      const baseUrl = url || process.env['VLLM_API_URL'] || this.config.defaultUrl;
      const modelsUrl = `${baseUrl.replace(/\/$/, '')}/v1/models`;
      
      const response = await axios.get(modelsUrl, {
        timeout: this.config.timeout
      });
      
      if (response.status === 200 && response.data?.data) {
        return response.data.data.some((model: any) => 
          model.id === modelName || model.id.includes(modelName)
        );
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 获取 vLLM 支持的功能列表
   */
  getSupportedFeatures() {
    return {
      chat: true,
      completion: true,
      embeddings: false, // vLLM 主要专注于生成任务
      streaming: true,
      batchProcessing: true,
      tensorParallel: true,
      pipelineParallel: true,
      quantization: true
    };
  }
}
