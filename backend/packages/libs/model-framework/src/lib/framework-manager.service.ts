import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FrameworkRegistry } from './registry/framework-registry';
import { AbstractFrameworkProvider, FrameworkHealthStatus } from './abstracts/framework-provider.abstract';
import { ModelFramework } from './types/framework.types';
import { OllamaFrameworkProvider } from './providers/ollama-framework.provider';
import { VllmFrameworkProvider } from './providers/vllm-framework.provider';

/**
 * 框架检测结果（新版本）
 */
export interface FrameworkDetectionResultV2 {
  available: ModelFramework[];
  unavailable: ModelFramework[];
  details: Record<ModelFramework, FrameworkHealthStatus>;
  recommended?: ModelFramework;
}

/**
 * 框架管理器服务
 * 
 * 负责：
 * 1. 自动注册内置框架提供者
 * 2. 统一的框架检测和管理
 * 3. 动态框架切换
 * 4. 服务实例创建
 */
@Injectable()
export class FrameworkManagerService implements OnModuleInit {
  private readonly logger = new Logger(FrameworkManagerService.name);
  private readonly registry = FrameworkRegistry.getInstance();
  private currentFramework: ModelFramework | null = null;
  private overriddenFramework: ModelFramework | null = null;

  async onModuleInit() {
    await this.registerBuiltinProviders();
    await this.initializeCurrentFramework();
  }

  /**
   * 注册内置框架提供者
   */
  private async registerBuiltinProviders(): Promise<void> {
    try {
      // 注册 Ollama 提供者（优先级较高）
      const ollamaProvider = new OllamaFrameworkProvider();
      this.registry.register(ollamaProvider, 10, true);

      // 注册 vLLM 提供者
      const vllmProvider = new VllmFrameworkProvider();
      this.registry.register(vllmProvider, 20, true);

      this.logger.log('Built-in framework providers registered successfully');
    } catch (error) {
      this.logger.error(`Failed to register built-in providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * 切换框架
   */
  async switchFramework(framework: ModelFramework, options: { force?: boolean; validateAvailability?: boolean } = {}): Promise<void> {
    this.logger.log(`Switching to framework: ${framework}`);

    // 验证框架是否已注册
    const provider = this.registry.getProvider(framework);
    if (!provider) {
      throw new Error(`Framework provider not found: ${framework}. Available frameworks: ${this.getRegisteredFrameworks().join(', ')}`);
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
   * 检查框架是否已注册（不检查服务是否运行）
   */
  isFrameworkRegistered(framework: ModelFramework): boolean {
    return this.registry.getProvider(framework) !== null;
  }

  /**
   * 检测所有框架的可用性
   */
  async detectFrameworks(): Promise<FrameworkDetectionResultV2> {
    const providers = this.registry.getAllProviders(true);
    const available: ModelFramework[] = [];
    const unavailable: ModelFramework[] = [];
    const details: Record<string, FrameworkHealthStatus> = {};

    // 并行检查所有框架
    const checkPromises = providers.map(async (provider) => {
      try {
        const url = this.getFrameworkUrl(provider.frameworkId);
        const status = await provider.checkHealth(url);
        
        details[provider.frameworkId] = status;
        
        if (status.isAvailable) {
          available.push(provider.frameworkId);
        } else {
          unavailable.push(provider.frameworkId);
        }
      } catch (error) {
        const errorStatus: FrameworkHealthStatus = {
          isAvailable: false,
          url: this.getFrameworkUrl(provider.frameworkId),
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date()
        };
        
        details[provider.frameworkId] = errorStatus;
        unavailable.push(provider.frameworkId);
      }
    });

    await Promise.all(checkPromises);

    // 确定推荐框架（优先级最高的可用框架）
    const recommended = available.length > 0 ? available[0] : undefined;

    return {
      available,
      unavailable,
      details: details as Record<ModelFramework, FrameworkHealthStatus>,
      recommended
    };
  }

  /**
   * 检查特定框架是否可用
   */
  async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    const provider = this.registry.getProvider(framework);
    if (!provider) {
      return false;
    }

    try {
      const url = this.getFrameworkUrl(framework);
      const status = await provider.checkHealth(url);
      return status.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * 创建框架服务实例
   */
  async createFrameworkService(framework?: ModelFramework): Promise<any> {
    const targetFramework = framework || this.getCurrentFramework();
    const provider = this.registry.getProvider(targetFramework);
    
    if (!provider) {
      throw new Error(`Framework provider not found: ${targetFramework}`);
    }

    return provider.createService({
      logger: this.logger,
      config: this.getFrameworkConfig(targetFramework)
    });
  }

  /**
   * 获取框架配置
   */
  private getFrameworkConfig(framework: ModelFramework): Record<string, any> {
    const url = this.getFrameworkUrl(framework);
    
    return {
      url,
      timeout: 5000,
      retries: 3
    };
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

  /**
   * 注册新的框架提供者
   */
  registerProvider(provider: AbstractFrameworkProvider, priority?: number): void {
    this.registry.register(provider, priority);
    this.logger.log(`Registered external framework provider: ${provider.frameworkId}`);
  }

  /**
   * 注销框架提供者
   */
  unregisterProvider(frameworkId: ModelFramework): boolean {
    return this.registry.unregister(frameworkId);
  }

  /**
   * 获取所有已注册的框架
   */
  getRegisteredFrameworks(): ModelFramework[] {
    return this.registry.getRegisteredFrameworks();
  }

  /**
   * 获取框架提供者信息
   */
  getProviderInfo(framework: ModelFramework) {
    const provider = this.registry.getProvider(framework);
    return provider?.getFrameworkInfo();
  }

  /**
   * 获取所有框架信息
   */
  getAllFrameworksInfo() {
    const providers = this.registry.getAllProviders();
    return providers.map(provider => provider.getFrameworkInfo());
  }

  /**
   * 启用/禁用框架
   */
  setFrameworkEnabled(framework: ModelFramework, enabled: boolean): boolean {
    return this.registry.setEnabled(framework, enabled);
  }

  /**
   * 设置框架优先级
   */
  setFrameworkPriority(framework: ModelFramework, priority: number): boolean {
    return this.registry.setPriority(framework, priority);
  }

  /**
   * 获取注册统计信息
   */
  getRegistryStats() {
    return this.registry.getStats();
  }
}
