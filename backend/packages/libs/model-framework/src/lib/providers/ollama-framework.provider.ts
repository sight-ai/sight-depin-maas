import axios from 'axios';
import { AbstractFrameworkProvider, FrameworkProviderConfig, FrameworkHealthStatus, ServiceCreationOptions } from '../abstracts/framework-provider.abstract';
import { ModelFramework } from '../types/framework.types';

/**
 * Ollama 框架提供者
 */
export class OllamaFrameworkProvider extends AbstractFrameworkProvider {
  readonly frameworkId = ModelFramework.OLLAMA;
  
  readonly config: FrameworkProviderConfig = {
    name: 'ollama',
    displayName: 'Ollama',
    defaultUrl: 'http://127.0.0.1:11434',
    defaultPort: 11434,
    healthCheckPath: '/api/version',
    timeout: 5000,
    retries: 3
  };

  /**
   * 检查 Ollama 服务健康状态
   */
  async checkHealth(url: string, options?: Record<string, any>): Promise<FrameworkHealthStatus> {
    const startTime = Date.now();
    const healthCheckUrl = `${url.replace(/\/$/, '')}/api/version`;
    
    try {
      const timeout = options?.['timeout'] || this.config.timeout || 5000;
      
      const response = await axios.get(healthCheckUrl, {
        timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SightAI-Framework-Detector'
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        const version = response.data?.version || 'unknown';
        
        return {
          isAvailable: true,
          url,
          version,
          lastChecked: new Date(),
          responseTime,
          additionalInfo: {
            status: response.status,
            data: response.data
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
   * 创建 Ollama 服务实例
   * 注意：这是遗留代码，新架构使用依赖注入
   */
  async createService(options?: ServiceCreationOptions): Promise<any> {
    try {
      // 这是遗留的实现，新架构应该使用 FrameworkManagerService
      if (options?.logger) {
        options.logger.warn('Using legacy service creation - consider migrating to FrameworkManagerService');
      }

      // 返回一个简单的代理对象，指向新架构
      return {
        framework: 'ollama',
        legacy: true,
        message: 'Please use FrameworkManagerService for service creation'
      };
    } catch (error) {
      const errorMessage = `Failed to create Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (options?.logger) {
        options.logger.error(errorMessage);
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 验证 Ollama 特定配置
   */
  protected override validateFrameworkSpecificConfig(config: Record<string, any>): boolean {
    // Ollama 特定的配置验证
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
    
    return true;
  }

  /**
   * 获取 Ollama 版本信息
   */
  protected override async getVersion(): Promise<string> {
    try {
      const defaultUrl = process.env['OLLAMA_API_URL'] || this.config.defaultUrl;
      const healthStatus = await this.checkHealth(defaultUrl);
      return healthStatus.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Ollama 特定的初始化逻辑
   */
  protected override async initialize(): Promise<void> {
    this.logger.log('Initializing Ollama framework provider');
    
    // 可以在这里添加 Ollama 特定的初始化逻辑
    // 例如：检查必要的环境变量、预加载模型等
    
    const ollamaUrl = process.env['OLLAMA_API_URL'];
    if (ollamaUrl) {
      this.logger.log(`Using Ollama URL from environment: ${ollamaUrl}`);
    }
  }

  /**
   * 获取 Ollama 特定的配置选项 - Ollama使用默认配置
   */
  getOllamaSpecificConfig() {
    return {
      // Ollama使用默认配置，不需要额外配置项
    };
  }

  /**
   * 检查 Ollama 模型是否可用
   */
  async checkModelAvailability(modelName: string, url?: string): Promise<boolean> {
    try {
      const baseUrl = url || process.env['OLLAMA_API_URL'] || this.config.defaultUrl;
      const modelsUrl = `${baseUrl.replace(/\/$/, '')}/api/tags`;
      
      const response = await axios.get(modelsUrl, {
        timeout: this.config.timeout
      });
      
      if (response.status === 200 && response.data?.models) {
        return response.data.models.some((model: any) => 
          model.name === modelName || model.name.startsWith(`${modelName}:`)
        );
      }
      
      return false;
    } catch {
      return false;
    }
  }
}
