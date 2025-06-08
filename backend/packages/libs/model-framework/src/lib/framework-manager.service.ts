import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModelFramework, FrameworkHealthStatus } from './types/framework.types';
import { IModelService } from './interfaces/service.interface';
import { BaseFrameworkManager } from './abstracts/base-framework-manager';
import { CleanOllamaService } from './services/clean-ollama.service';
import { CleanVllmService } from './services/clean-vllm.service';
import axios from 'axios';

/**
 * 优化的框架管理器服务
 * 继承抽象基类，实现具体的框架管理逻辑
 */
@Injectable()
export class FrameworkManagerService extends BaseFrameworkManager implements OnModuleInit {

  constructor(
    private readonly ollamaService: CleanOllamaService,
    private readonly vllmService: CleanVllmService
  ) {
    super();
  }

  async onModuleInit() {
    await this.initializeCurrentFramework();
  }

  // =============================================================================
  // 实现抽象方法
  // =============================================================================

  /**
   * 检查框架健康状态
   */
  protected async checkFrameworkHealth(framework: ModelFramework): Promise<FrameworkHealthStatus> {
    switch (framework) {
      case ModelFramework.OLLAMA:
        return this.checkOllamaHealth();
      case ModelFramework.VLLM:
        return this.checkVllmHealth();
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * 创建服务实例
   */
  protected async createServiceInstance(framework: ModelFramework): Promise<IModelService> {
    switch (framework) {
      case ModelFramework.OLLAMA:
        return this.ollamaService;
      case ModelFramework.VLLM:
        return this.vllmService;
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * 持久化框架选择
   */
  protected async persistFrameworkChoice(framework: ModelFramework): Promise<void> {
    process.env['MODEL_INFERENCE_FRAMEWORK'] = framework;
    // 这里可以添加更多持久化逻辑，比如写入配置文件
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 检查 Ollama 框架状态
   */
  private async checkOllamaHealth(): Promise<FrameworkHealthStatus> {
    const url = this.getFrameworkUrl(ModelFramework.OLLAMA);
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
    const url = this.getFrameworkUrl(ModelFramework.VLLM);
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

  // =============================================================================
  // 私有初始化方法
  // =============================================================================

  /**
   * 初始化当前框架
   */
  private async initializeCurrentFramework(): Promise<void> {
    const envFramework = this.parseFrameworkFromEnv();
    this.currentFramework = envFramework;
    this.logger.log(`Initialized with framework: ${this.currentFramework}`);
  }
}
