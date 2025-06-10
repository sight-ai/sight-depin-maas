import { Injectable, Logger } from '@nestjs/common';
import { LocalConfigService } from '@saito/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * 环境检测结果
 */
export interface EnvironmentDetectionResult {
  framework: 'ollama' | 'vllm' | null;
  isAvailable: boolean;
  baseUrl: string;
  version?: string;
  models?: string[];
  error?: string;
}

/**
 * 框架可用性检测结果
 */
export interface FrameworkAvailabilityResult {
  ollama: {
    available: boolean;
    baseUrl: string;
    version?: string;
    models?: string[];
    error?: string;
  };
  vllm: {
    available: boolean;
    baseUrl: string;
    models?: string[];
    error?: string;
  };
  recommended: 'ollama' | 'vllm' | null;
}

/**
 * 环境检测服务
 * 
 */
@Injectable()
export class EnvironmentDetectorService {
  private readonly logger = new Logger(EnvironmentDetectorService.name);

  // 默认配置
  private readonly DEFAULT_OLLAMA_URL = 'http://localhost:11434';
  private readonly DEFAULT_VLLM_URL = 'http://localhost:8000';
  private readonly REQUEST_TIMEOUT = 5000; // 5秒超时

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly httpService: HttpService
  ) {}

  /**
   * 检测当前环境配置
   */
  async detectCurrentEnvironment(): Promise<EnvironmentDetectionResult> {
    try {
      // 从配置中获取当前框架类型
      const clientType = this.localConfigService.getClientType();
      
      if (!clientType) {
        this.logger.debug('No client type configured, performing auto-detection');
        return await this.autoDetectFramework();
      }

      this.logger.debug(`Detecting configured framework: ${clientType}`);

      // 检测配置的框架
      if (clientType === 'ollama') {
        return await this.detectOllama();
      } else if (clientType === 'vllm') {
        return await this.detectVllm();
      }

      return {
        framework: null,
        isAvailable: false,
        baseUrl: '',
        error: `Unsupported client type: ${clientType}`
      };

    } catch (error) {
      this.logger.error('Failed to detect current environment:', error);
      return {
        framework: null,
        isAvailable: false,
        baseUrl: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 检测所有框架的可用性
   */
  async detectAllFrameworks(): Promise<FrameworkAvailabilityResult> {
    this.logger.debug('Detecting all available frameworks');

    const [ollamaResult, vllmResult] = await Promise.all([
      this.detectOllama(),
      this.detectVllm()
    ]);

    // 确定推荐的框架
    let recommended: 'ollama' | 'vllm' | null = null;
    if (ollamaResult.isAvailable && vllmResult.isAvailable) {
      // 如果两个都可用，优先推荐 Ollama（更简单）
      recommended = 'ollama';
    } else if (ollamaResult.isAvailable) {
      recommended = 'ollama';
    } else if (vllmResult.isAvailable) {
      recommended = 'vllm';
    }

    return {
      ollama: {
        available: ollamaResult.isAvailable,
        baseUrl: ollamaResult.baseUrl,
        version: ollamaResult.version,
        models: ollamaResult.models,
        error: ollamaResult.error
      },
      vllm: {
        available: vllmResult.isAvailable,
        baseUrl: vllmResult.baseUrl,
        models: vllmResult.models,
        error: vllmResult.error
      },
      recommended
    };
  }

  /**
   * 自动检测可用的框架
   */
  async autoDetectFramework(): Promise<EnvironmentDetectionResult> {
    this.logger.debug('Auto-detecting available framework');

    const allFrameworks = await this.detectAllFrameworks();

    if (allFrameworks.recommended) {
      const framework = allFrameworks.recommended;
      const result = allFrameworks[framework];
      
      return {
        framework,
        isAvailable: result.available,
        baseUrl: result.baseUrl,
        version: framework === 'ollama' ? (result as any).version : undefined,
        models: result.models,
        error: result.error
      };
    }

    return {
      framework: null,
      isAvailable: false,
      baseUrl: '',
      error: 'No available inference framework detected'
    };
  }

  /**
   * 检测 Ollama 可用性
   */
  async detectOllama(): Promise<EnvironmentDetectionResult> {
    const baseUrl = this.getOllamaBaseUrl();
    
    try {
      this.logger.debug(`Checking Ollama at: ${baseUrl}`);

      // 检查版本信息
      const versionResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/api/version`).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError(error => of({ data: null, error }))
        )
      );

      if ((versionResponse as any).error) {
        throw (versionResponse as any).error;
      }

      const version = versionResponse.data?.version;

      // 获取模型列表
      const modelsResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/api/tags`).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError(error => of({ data: null, error }))
        )
      );

      const models = modelsResponse.data?.models?.map((model: any) => model.name) || [];

      this.logger.debug(`Ollama detected: version=${version}, models=${models.length}`);

      return {
        framework: 'ollama',
        isAvailable: true,
        baseUrl,
        version,
        models
      };

    } catch (error) {
      this.logger.debug(`Ollama not available at ${baseUrl}:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        framework: 'ollama',
        isAvailable: false,
        baseUrl,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * 检测 vLLM 可用性
   */
  async detectVllm(): Promise<EnvironmentDetectionResult> {
    const baseUrl = this.getVllmBaseUrl();
    
    try {
      this.logger.debug(`Checking vLLM at: ${baseUrl}`);

      // 检查模型列表（vLLM 使用 OpenAI 兼容 API）
      const modelsResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/v1/models`).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError(error => of({ data: null, error }))
        )
      );

      if ((modelsResponse as any).error) {
        throw (modelsResponse as any).error;
      }

      const models = modelsResponse.data?.data?.map((model: any) => model.id) || [];

      this.logger.debug(`vLLM detected: models=${models.length}`);

      return {
        framework: 'vllm',
        isAvailable: true,
        baseUrl,
        models
      };

    } catch (error) {
      this.logger.debug(`vLLM not available at ${baseUrl}:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        framework: 'vllm',
        isAvailable: false,
        baseUrl,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * 检查特定框架是否在线
   */
  async isFrameworkOnline(framework: 'ollama' | 'vllm'): Promise<boolean> {
    try {
      const result = framework === 'ollama' 
        ? await this.detectOllama()
        : await this.detectVllm();
      
      return result.isAvailable;
    } catch (error) {
      this.logger.debug(`Framework ${framework} online check failed:`, error);
      return false;
    }
  }

  /**
   * 获取环境状态摘要
   */
  async getEnvironmentSummary(): Promise<{
    current: EnvironmentDetectionResult;
    available: FrameworkAvailabilityResult;
    recommendations: string[];
  }> {
    const [current, available] = await Promise.all([
      this.detectCurrentEnvironment(),
      this.detectAllFrameworks()
    ]);

    const recommendations: string[] = [];

    // 生成建议
    if (!current.isAvailable && available.recommended) {
      recommendations.push(`Switch to ${available.recommended} (available and working)`);
    }

    if (current.framework && current.isAvailable && current.models?.length === 0) {
      recommendations.push(`No models found in ${current.framework}. Consider pulling some models.`);
    }

    if (!available.ollama.available && !available.vllm.available) {
      recommendations.push('No inference frameworks detected. Please install Ollama or vLLM.');
    }

    return {
      current,
      available,
      recommendations
    };
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 获取 Ollama 基础 URL
   */
  private getOllamaBaseUrl(): string {
    // 优先级：环境变量 > 配置文件 > 默认值
    return process.env['OLLAMA_BASE_URL'] || 
           this.localConfigService.get('ollama-config.json', 'baseUrl') || 
           this.DEFAULT_OLLAMA_URL;
  }

  /**
   * 获取 vLLM 基础 URL
   */
  private getVllmBaseUrl(): string {
    // 优先级：环境变量 > 配置文件 > 默认值
    return process.env['VLLM_BASE_URL'] || 
           this.localConfigService.get('vllm-config.json', 'baseUrl') || 
           this.DEFAULT_VLLM_URL;
  }
}
