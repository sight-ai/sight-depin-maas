import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModelFramework } from './types/framework.types';
import axios from 'axios';

/**
 * 框架健康状态
 */
export interface FrameworkHealthStatus {
  isAvailable: boolean;
  url: string;
  version?: string;
  error?: string;
  lastChecked: Date;
  responseTime?: number;
}

/**
 * 框架检测结果（简化版本）
 */
export interface FrameworkDetectionResultV2 {
  available: ModelFramework[];
  unavailable: ModelFramework[];
  details: Record<ModelFramework, FrameworkHealthStatus>;
  recommended?: ModelFramework;
}

/**
 * 简化的框架管理器服务
 *
 * 负责：
 * 1. 框架检测和管理
 * 2. 动态框架切换
 * 3. 服务实例创建
 */
@Injectable()
export class FrameworkManagerService implements OnModuleInit {
  private readonly logger = new Logger(FrameworkManagerService.name);
  private currentFramework: ModelFramework | null = null;
  private overriddenFramework: ModelFramework | null = null;

  async onModuleInit() {
    await this.initializeCurrentFramework();
  }

  /**
   * 检查 Ollama 框架状态
   */
  private async checkOllamaHealth(): Promise<FrameworkHealthStatus> {
    const url = process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
    const startTime = Date.now();

    try {
      const response = await axios.get(`${url}/api/version`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        isAvailable: response.status === 200,
        url,
        version: response.data?.version || 'unknown',
        lastChecked: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        isAvailable: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 检查 vLLM 框架状态
   */
  private async checkVllmHealth(): Promise<FrameworkHealthStatus> {
    const url = process.env['VLLM_API_URL'] || 'http://localhost:8000';
    const startTime = Date.now();

    try {
      const response = await axios.get(`${url}/v1/models`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        isAvailable: response.status === 200,
        url,
        version: 'vLLM (OpenAI Compatible)',
        lastChecked: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        isAvailable: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 初始化当前框架
   */
  private async initializeCurrentFramework(): Promise<void> {
    const envFramework = this.parseFrameworkFromEnv();
    this.currentFramework = envFramework;
    this.logger.log(`Initialized with framework: ${this.currentFramework}`);
  }

  /**
   * 从环境变量解析框架
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
   * 获取当前框架
   */
  getCurrentFramework(): ModelFramework {
    return this.overriddenFramework || this.currentFramework || ModelFramework.OLLAMA;
  }

  /**
   * 设置框架覆盖
   */
  setFrameworkOverride(framework: ModelFramework | null): void {
    this.overriddenFramework = framework;
    this.logger.log(`Framework override set to: ${framework || 'none'}`);
  }

  /**
   * 切换框架 (简化版本)
   */
  async switchFramework(framework: ModelFramework, options: { force?: boolean; validateAvailability?: boolean } = {}): Promise<void> {
    this.logger.log(`Switching to framework: ${framework}`);

    // 验证框架是否支持
    if (![ModelFramework.OLLAMA, ModelFramework.VLLM].includes(framework)) {
      throw new Error(`Unsupported framework: ${framework}. Available frameworks: ollama, vllm`);
    }

    // 如果需要验证可用性且不是强制切换
    if (options.validateAvailability !== false && !options.force) {
      const isAvailable = await this.isFrameworkAvailable(framework);
      if (!isAvailable) {
        throw new Error(`Framework ${framework} is not available. Use force=true to switch anyway, or start the ${framework} service first.`);
      }
    }

    // 设置框架覆盖
    this.setFrameworkOverride(framework);

    // 持久化框架选择到环境变量
    process.env['MODEL_INFERENCE_FRAMEWORK'] = framework;

    this.logger.log(`Successfully switched to framework: ${framework}`);
  }

  /**
   * 检测所有框架的可用性 (简化版本)
   */
  async detectFrameworks(): Promise<FrameworkDetectionResultV2> {
    const available: ModelFramework[] = [];
    const unavailable: ModelFramework[] = [];
    const details: Record<ModelFramework | string, FrameworkHealthStatus> = {};

    // 并行检查所有框架
    const [ollamaStatus, vllmStatus] = await Promise.all([
      this.checkOllamaHealth(),
      this.checkVllmHealth()
    ]);

    // 处理 Ollama 结果
    details[ModelFramework.OLLAMA] = ollamaStatus;
    if (ollamaStatus.isAvailable) {
      available.push(ModelFramework.OLLAMA);
    } else {
      unavailable.push(ModelFramework.OLLAMA);
    }

    // 处理 vLLM 结果
    details[ModelFramework.VLLM] = vllmStatus;
    if (vllmStatus.isAvailable) {
      available.push(ModelFramework.VLLM);
    } else {
      unavailable.push(ModelFramework.VLLM);
    }

    // 确定推荐框架（优先 Ollama）
    const recommended = available.includes(ModelFramework.OLLAMA)
      ? ModelFramework.OLLAMA
      : available[0];

    return {
      available,
      unavailable,
      details,
      recommended
    };
  }

  /**
   * 检查特定框架是否可用 (简化版本)
   */
  async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    try {
      switch (framework) {
        case ModelFramework.OLLAMA:
          const ollamaStatus = await this.checkOllamaHealth();
          return ollamaStatus.isAvailable;
        case ModelFramework.VLLM:
          const vllmStatus = await this.checkVllmHealth();
          return vllmStatus.isAvailable;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * 创建框架服务实例 (简化版本)
   */
  async createFrameworkService(framework?: ModelFramework): Promise<any> {
    const targetFramework = framework || this.getCurrentFramework();

    // 直接创建服务，无需复杂的 provider 层
    switch (targetFramework) {
      case ModelFramework.OLLAMA:
        const { CleanOllamaService } = await import('./services/clean-ollama.service');
        return new CleanOllamaService();

      case ModelFramework.VLLM:
        const { CleanVllmService } = await import('./services/clean-vllm.service');
        return new CleanVllmService();

      default:
        throw new Error(`Unsupported framework: ${targetFramework}`);
    }
  }

  /**
   * 获取框架URL
   */
  private getFrameworkUrl(framework: ModelFramework): string {
    switch (framework) {
      case ModelFramework.OLLAMA:
        return process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
      case ModelFramework.VLLM:
        return process.env['VLLM_API_URL'] || 'http://localhost:8000';
      default:
        throw new Error(`Unknown framework: ${framework}`);
    }
  }
}
