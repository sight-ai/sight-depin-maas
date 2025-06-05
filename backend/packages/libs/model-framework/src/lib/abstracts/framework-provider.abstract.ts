import { Logger } from '@nestjs/common';
import { ModelFramework } from '../types/framework.types';

/**
 * 框架配置接口
 */
export interface FrameworkProviderConfig {
  name: string;
  displayName: string;
  defaultUrl: string;
  defaultPort?: number;
  healthCheckPath?: string;
  timeout?: number;
  retries?: number;
  [key: string]: any; // 允许框架特定的配置
}

/**
 * 框架状态检查结果
 */
export interface FrameworkHealthStatus {
  isAvailable: boolean;
  url: string;
  version?: string;
  error?: string;
  lastChecked: Date;
  responseTime?: number;
  additionalInfo?: Record<string, any>;
}

/**
 * 框架服务创建选项
 */
export interface ServiceCreationOptions {
  config?: Record<string, any>;
  logger?: Logger;
  [key: string]: any;
}

/**
 * 抽象框架提供者
 * 
 * 每个推理框架都需要实现这个抽象类
 * 提供统一的接口用于：
 * 1. 框架配置管理
 * 2. 健康状态检查
 * 3. 服务实例创建
 * 4. 协议适配
 */
export abstract class AbstractFrameworkProvider {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * 框架唯一标识符
   */
  abstract readonly frameworkId: ModelFramework;

  /**
   * 框架配置
   */
  abstract readonly config: FrameworkProviderConfig;

  /**
   * 检查框架是否可用
   * @param url 框架服务URL
   * @param options 检查选项
   */
  abstract checkHealth(url: string, options?: Record<string, any>): Promise<FrameworkHealthStatus>;

  /**
   * 创建框架服务实例
   * @param options 创建选项
   */
  abstract createService(options?: ServiceCreationOptions): Promise<any>;

  /**
   * 获取框架默认配置
   */
  getDefaultConfig(): FrameworkProviderConfig {
    return { ...this.config };
  }

  /**
   * 验证框架配置
   * @param config 配置对象
   */
  validateConfig(config: Record<string, any>): boolean {
    try {
      // 基础验证
      if (!config['url'] || typeof config['url'] !== 'string') {
        return false;
      }

      // 子类可以重写此方法进行更详细的验证
      return this.validateFrameworkSpecificConfig(config);
    } catch {
      return false;
    }
  }

  /**
   * 框架特定的配置验证
   * 子类可以重写此方法
   */
  protected validateFrameworkSpecificConfig(config: Record<string, any>): boolean {
    return true;
  }

  /**
   * 获取框架信息
   */
  getFrameworkInfo() {
    return {
      id: this.frameworkId,
      name: this.config.name,
      displayName: this.config.displayName,
      defaultUrl: this.config.defaultUrl,
      version: this.getVersion?.() || 'unknown'
    };
  }

  /**
   * 获取框架版本（可选实现）
   */
  protected getVersion?(): string | Promise<string>;

  /**
   * 框架特定的初始化逻辑（可选实现）
   */
  protected initialize?(): Promise<void>;

  /**
   * 框架特定的清理逻辑（可选实现）
   */
  protected cleanup?(): Promise<void>;
}
