import { Injectable, Logger } from '@nestjs/common';
import got from 'got-cjs';
import { 
  ModelFramework, 
  FrameworkConfig, 
  FrameworkStatus, 
  FrameworkDetectionResult,
  FrameworkConfigSchema 
} from './types/framework.types';

/**
 * Service for detecting and managing model inference frameworks
 */
@Injectable()
export class FrameworkDetectorService {
  private readonly logger = new Logger(FrameworkDetectorService.name);
  private cachedDetection: FrameworkDetectionResult | null = null;
  private lastDetectionTime: Date | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private overriddenFramework: ModelFramework | null = null; // For runtime framework switching

  constructor() {}

  /**
   * Get framework configuration from environment variables
   */
  private getFrameworkConfig(): FrameworkConfig {
    const config = {
      framework: this.parseFrameworkFromEnv(),
      ollamaUrl: process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434',
      vllmUrl: process.env['VLLM_API_URL'] || 'http://localhost:8000',
      defaultModel: process.env['OLLAMA_MODEL'] || 'deepscaler',
      timeout: parseInt(process.env['MODEL_REQUEST_TIMEOUT'] || '60000'),
      retries: parseInt(process.env['MODEL_REQUEST_RETRIES'] || '3')
    };

    try {
      return FrameworkConfigSchema.parse(config);
    } catch (error) {
      this.logger.warn('Invalid framework configuration, using defaults:', error);
      return {
        framework: ModelFramework.OLLAMA,
        ollamaUrl: 'http://127.0.0.1:11434',
        vllmUrl: 'http://localhost:8000',
        defaultModel: 'deepscaler',
        timeout: 60000,
        retries: 3
      };
    }
  }

  /**
   * Parse framework from environment variable
   */
  private parseFrameworkFromEnv(): ModelFramework {
    const envFramework = process.env['MODEL_INFERENCE_FRAMEWORK']?.toLowerCase();

    switch (envFramework) {
      case 'ollama':
        return ModelFramework.OLLAMA;
      case 'vllm':
        return ModelFramework.VLLM;
      default:
        this.logger.warn(`Unknown framework: ${envFramework}, defaulting to ollama`);
        return ModelFramework.OLLAMA;
    }
  }

  /**
   * Check if Ollama service is available
   */
  private async checkOllamaStatus(url: string): Promise<FrameworkStatus> {
    const status: FrameworkStatus = {
      framework: ModelFramework.OLLAMA,
      isAvailable: false,
      url,
      lastChecked: new Date()
    };

    try {
      const response = await got.get(`${url}/api/version`, {
        timeout: { request: 5000 },
        retry: { limit: 0 }
      });

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        status.isAvailable = true;
        status.version = data.version;
      }
    } catch (error: any) {
      status.error = error.message;
      this.logger.debug(`Ollama not available at ${url}: ${error.message}`);
    }

    return status;
  }

  /**
   * Check if vLLM service is available
   */
  private async checkVllmStatus(url: string): Promise<FrameworkStatus> {
    const status: FrameworkStatus = {
      framework: ModelFramework.VLLM,
      isAvailable: false,
      url,
      lastChecked: new Date()
    };

    try {
      // vLLM uses OpenAI-compatible endpoints
      const response = await got.get(`${url}/version`, {
        timeout: { request: 5000 },
        retry: { limit: 0 }
      });

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        status.isAvailable = true;
        status.version = data.version;
      }
    } catch (error: any) {
      // Try alternative health check endpoint
      try {
        const healthResponse = await got.get(`${url}/health`, {
          timeout: { request: 5000 },
          retry: { limit: 0 }
        });
        
        if (healthResponse.statusCode === 200) {
          status.isAvailable = true;
          status.version = 'unknown';
        }
      } catch (healthError: any) {
        status.error = error.message;
        this.logger.debug(`vLLM not available at ${url}: ${error.message}`);
      }
    }

    return status;
  }

  /**
   * Detect available frameworks and determine which to use
   */
  async detectFrameworks(forceRefresh = false): Promise<FrameworkDetectionResult> {
    // Return cached result if still valid
    if (!forceRefresh && this.cachedDetection && this.lastDetectionTime) {
      const timeSinceLastCheck = Date.now() - this.lastDetectionTime.getTime();
      if (timeSinceLastCheck < this.CACHE_DURATION) {
        return this.cachedDetection;
      }
    }

    const config = this.getFrameworkConfig();
    
    // Check both frameworks in parallel
    const [ollamaStatus, vllmStatus] = await Promise.all([
      this.checkOllamaStatus(config.ollamaUrl!),
      this.checkVllmStatus(config.vllmUrl!)
    ]);

    const available: ModelFramework[] = [];
    if (ollamaStatus.isAvailable) available.push(ModelFramework.OLLAMA);
    if (vllmStatus.isAvailable) available.push(ModelFramework.VLLM);

    let detected: ModelFramework;
    let primary: FrameworkStatus;
    let secondary: FrameworkStatus | undefined;

    // 使用当前框架（包括运行时切换的框架）
    detected = await this.getCurrentFramework();

    if (detected === ModelFramework.OLLAMA) {
      primary = ollamaStatus;
      secondary = vllmStatus.isAvailable ? vllmStatus : undefined;
    } else {
      primary = vllmStatus;
      secondary = ollamaStatus.isAvailable ? ollamaStatus : undefined;
    }

    const result: FrameworkDetectionResult = {
      detected,
      available,
      primary,
      secondary,
      config
    };

    // Cache the result
    this.cachedDetection = result;
    this.lastDetectionTime = new Date();

    this.logger.log(`Framework detection completed: using ${detected}, available: [${available.join(', ')}]`);
    
    return result;
  }

  /**
   * Get current framework status
   * 优先级：运行时切换 > 环境变量设置
   */
  async getCurrentFramework(): Promise<ModelFramework> {
    // 如果有运行时切换的框架，优先使用
    if (this.overriddenFramework) {
      return this.overriddenFramework;
    }

    // 获取配置并直接使用
    const config = this.getFrameworkConfig();
    return config.framework as ModelFramework;
  }



  /**
   * Check if a specific framework is available
   */
  async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    const detection = await this.detectFrameworks();
    return detection.available.includes(framework);
  }

  /**
   * Get framework URL
   */
  async getFrameworkUrl(framework?: ModelFramework): Promise<string> {
    const detection = await this.detectFrameworks();
    const targetFramework = framework || detection.detected;
    
    if (targetFramework === ModelFramework.OLLAMA) {
      return detection.config.ollamaUrl!;
    } else {
      return detection.config.vllmUrl!;
    }
  }

  /**
   * Set runtime framework override (for framework switching)
   */
  setFrameworkOverride(framework: ModelFramework): void {
    this.overriddenFramework = framework;
    this.clearCache(); // Clear cache to force re-detection with new framework
  }

  /**
   * Clear runtime framework override
   */
  clearFrameworkOverride(): void {
    this.overriddenFramework = null;
    this.clearCache();
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.cachedDetection = null;
    this.lastDetectionTime = null;
  }
}
