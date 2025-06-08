import { Logger } from '@nestjs/common';
import { ModelFramework, FrameworkHealthStatus, EnhancedFrameworkDetectionResult } from '../types/framework.types';
import { IFrameworkManager, IModelService } from '../interfaces/service.interface';

/**
 * 框架管理器抽象基类
 * 提供通用的框架管理功能实现
 */
export abstract class BaseFrameworkManager implements IFrameworkManager {
  protected readonly logger = new Logger(this.constructor.name);
  protected currentFramework: ModelFramework | null = null;
  protected overriddenFramework: ModelFramework | null = null;

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
  async switchFramework(
    framework: ModelFramework, 
    options: { force?: boolean; validateAvailability?: boolean } = {}
  ): Promise<void> {
    this.logger.log(`Switching to framework: ${framework}`);

    // 验证框架是否支持
    if (!this.isSupportedFramework(framework)) {
      throw new Error(`Unsupported framework: ${framework}`);
    }

    // 如果需要验证可用性且不是强制切换
    if (options.validateAvailability !== false && !options.force) {
      const isAvailable = await this.isFrameworkAvailable(framework);
      if (!isAvailable) {
        throw new Error(
          `Framework ${framework} is not available. Use force=true to switch anyway, or start the ${framework} service first.`
        );
      }
    }

    // 设置框架覆盖
    this.setFrameworkOverride(framework);

    // 持久化框架选择
    await this.persistFrameworkChoice(framework);

    this.logger.log(`Successfully switched to framework: ${framework}`);
  }

  /**
   * 检测所有框架的可用性
   */
  async detectFrameworks(): Promise<EnhancedFrameworkDetectionResult> {
    const available: ModelFramework[] = [];
    const unavailable: ModelFramework[] = [];
    const details = {} as Record<ModelFramework, FrameworkHealthStatus>;

    // 并行检查所有支持的框架
    const supportedFrameworks = this.getSupportedFrameworks();
    const healthChecks = await Promise.all(
      supportedFrameworks.map(framework => this.checkFrameworkHealth(framework))
    );

    // 处理检查结果
    supportedFrameworks.forEach((framework, index) => {
      const health = healthChecks[index];
      details[framework] = health;
      
      if (health.isAvailable) {
        available.push(framework);
      } else {
        unavailable.push(framework);
      }
    });

    // 确定推荐框架
    const recommended = this.determineRecommendedFramework(available);

    return {
      available,
      unavailable,
      details,
      recommended
    };
  }

  /**
   * 检查特定框架是否可用
   */
  async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    try {
      const health = await this.checkFrameworkHealth(framework);
      return health.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * 创建框架服务实例
   */
  async createFrameworkService(framework?: ModelFramework): Promise<IModelService> {
    const targetFramework = framework || this.getCurrentFramework();
    return this.createServiceInstance(targetFramework);
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  /**
   * 检查框架健康状态
   */
  protected abstract checkFrameworkHealth(framework: ModelFramework): Promise<FrameworkHealthStatus>;

  /**
   * 创建服务实例
   */
  protected abstract createServiceInstance(framework: ModelFramework): Promise<IModelService>;

  /**
   * 持久化框架选择
   */
  protected abstract persistFrameworkChoice(framework: ModelFramework): Promise<void>;

  // =============================================================================
  // 受保护的辅助方法
  // =============================================================================

  /**
   * 获取支持的框架列表
   */
  protected getSupportedFrameworks(): ModelFramework[] {
    return [ModelFramework.OLLAMA, ModelFramework.VLLM];
  }

  /**
   * 检查框架是否受支持
   */
  protected isSupportedFramework(framework: ModelFramework): boolean {
    return this.getSupportedFrameworks().includes(framework);
  }

  /**
   * 确定推荐框架
   */
  protected determineRecommendedFramework(available: ModelFramework[]): ModelFramework | undefined {
    // 优先推荐 Ollama，然后是第一个可用的框架
    if (available.includes(ModelFramework.OLLAMA)) {
      return ModelFramework.OLLAMA;
    }
    return available[0];
  }

  /**
   * 从环境变量解析框架
   */
  protected parseFrameworkFromEnv(): ModelFramework {
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
   * 获取框架URL
   */
  protected getFrameworkUrl(framework: ModelFramework): string {
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
