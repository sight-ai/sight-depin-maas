import { Injectable, Logger } from '@nestjs/common';
import { FrameworkManagerService } from '../framework-manager.service';
import { ModelFramework, FrameworkDetectionResult, FrameworkStatus } from '../types/framework.types';
import { UnifiedModelService, ModelServiceFactory } from '../interfaces/service.interface';

/**
 * Legacy Compatibility Adapter
 * 
 * 提供向后兼容的接口，将旧的 API 调用转发到新的架构
 * 这样可以在不破坏现有代码的情况下逐步迁移
 */

/**
 * Legacy Framework Detector Service Adapter
 */
@Injectable()
export class LegacyFrameworkDetectorAdapter {
  private readonly logger = new Logger(LegacyFrameworkDetectorAdapter.name);

  constructor(private readonly frameworkManager: FrameworkManagerService) {}

  /**
   * 检测框架 - 兼容旧接口
   */
  async detectFrameworks(forceRefresh = false): Promise<FrameworkDetectionResult> {
    const detection = await this.frameworkManager.detectFrameworks();

    // 转换新格式到旧格式
    const primaryFramework = detection.available[0] || ModelFramework.OLLAMA;
    const secondaryFramework = detection.available[1] || detection.unavailable[0] || ModelFramework.VLLM;

    return {
      detected: detection.recommended || primaryFramework,
      available: detection.available,
      primary: {
        framework: primaryFramework,
        isAvailable: detection.available.length > 0,
        url: this.getFrameworkUrl(primaryFramework),
        version: detection.details[primaryFramework]?.version || 'unknown',
        error: detection.details[primaryFramework]?.error,
        lastChecked: new Date()
      },
      secondary: {
        framework: secondaryFramework,
        isAvailable: detection.available.includes(secondaryFramework),
        url: this.getFrameworkUrl(secondaryFramework),
        version: detection.details[secondaryFramework]?.version || 'unknown',
        error: detection.details[secondaryFramework]?.error,
        lastChecked: new Date()
      },
      config: this.getFrameworkConfig()
    };
  }

  /**
   * 获取框架配置 - 兼容旧接口
   */
  getFrameworkConfig() {
    const framework = this.frameworkManager.getCurrentFramework();
    return {
      framework,
      ollamaUrl: process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434',
      vllmUrl: process.env['VLLM_API_URL'] || 'http://localhost:8000',
      defaultModel: process.env['OLLAMA_MODEL'] || 'deepscaler',
      timeout: 60000,
      retries: 3
    };
  }

  /**
   * 设置框架覆盖 - 兼容旧接口
   */
  setFrameworkOverride(framework: ModelFramework | null): void {
    if (framework) {
      this.frameworkManager.setFrameworkOverride(framework);
    }
  }

  private getFrameworkUrl(framework: ModelFramework): string {
    switch (framework) {
      case ModelFramework.OLLAMA:
        return process.env['OLLAMA_API_URL'] || 'http://127.0.0.1:11434';
      case ModelFramework.VLLM:
        return process.env['VLLM_API_URL'] || 'http://localhost:8000';
      default:
        return 'http://localhost:8000';
    }
  }
}

/**
 * Legacy Model Service Factory Adapter
 */
@Injectable()
export class LegacyModelServiceFactoryAdapter implements ModelServiceFactory {
  private readonly logger = new Logger(LegacyModelServiceFactoryAdapter.name);
  private serviceCache = new Map<ModelFramework, UnifiedModelService>();

  constructor(private readonly frameworkManager: FrameworkManagerService) {}

  /**
   * 创建服务实例 - 兼容旧接口
   */
  async createService(framework: ModelFramework): Promise<UnifiedModelService> {
    // 检查缓存
    if (this.serviceCache.has(framework)) {
      return this.serviceCache.get(framework)!;
    }

    // 使用新架构创建服务
    const service = await this.frameworkManager.createFrameworkService(framework);
    
    // 缓存服务
    this.serviceCache.set(framework, service);
    
    return service;
  }

  /**
   * 获取当前服务 - 兼容旧接口
   */
  async getCurrentService(): Promise<UnifiedModelService> {
    const currentFramework = this.frameworkManager.getCurrentFramework();
    return this.createService(currentFramework);
  }

  /**
   * 切换框架 - 兼容旧接口
   */
  async switchFramework(framework: ModelFramework, options?: any): Promise<UnifiedModelService> {
    await this.frameworkManager.switchFramework(framework);
    this.clearCache(); // 清除缓存以确保使用新框架
    return this.getCurrentService();
  }

  /**
   * 获取可用框架 - 兼容旧接口
   */
  async getAvailableFrameworks(): Promise<ModelFramework[]> {
    const detection = await this.frameworkManager.detectFrameworks();
    return detection.available;
  }

  /**
   * 获取当前框架 - 兼容旧接口
   */
  getCurrentFramework(): ModelFramework | null {
    return this.frameworkManager.getCurrentFramework();
  }

  /**
   * 检查框架是否可用 - 兼容旧接口
   */
  async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    const detection = await this.frameworkManager.detectFrameworks();
    return detection.available.includes(framework);
  }

  /**
   * 获取框架状态 - 兼容旧接口
   */
  async getFrameworkStatus(): Promise<any> {
    const detection = await this.frameworkManager.detectFrameworks();
    return {
      current: this.getCurrentFramework(),
      available: detection.available,
      details: detection.details
    };
  }

  /**
   * 获取健康状态 - 兼容旧接口
   */
  async getHealthStatus(): Promise<any> {
    const detection = await this.frameworkManager.detectFrameworks();
    return {
      frameworks: detection.details,
      current: this.getCurrentFramework(),
      available: detection.available,
      unavailable: detection.unavailable,
      recommended: detection.recommended
    };
  }

  /**
   * 清除缓存 - 兼容旧接口
   */
  clearCache(): void {
    this.serviceCache.clear();
  }
}
