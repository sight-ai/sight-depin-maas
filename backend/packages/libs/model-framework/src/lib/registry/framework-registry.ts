import { Logger } from '@nestjs/common';
import { AbstractFrameworkProvider } from '../abstracts/framework-provider.abstract';
import { ModelFramework } from '../types/framework.types';

/**
 * 框架注册信息
 */
export interface FrameworkRegistration {
  provider: AbstractFrameworkProvider;
  priority: number; // 优先级，数字越小优先级越高
  enabled: boolean;
  registeredAt: Date;
}

/**
 * 框架注册表
 * 
 * 负责管理所有可用的推理框架提供者
 * 支持动态注册、注销和查询框架
 */
export class FrameworkRegistry {
  private static instance: FrameworkRegistry;
  private readonly logger = new Logger(FrameworkRegistry.name);
  private readonly providers = new Map<ModelFramework, FrameworkRegistration>();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): FrameworkRegistry {
    if (!FrameworkRegistry.instance) {
      FrameworkRegistry.instance = new FrameworkRegistry();
    }
    return FrameworkRegistry.instance;
  }

  /**
   * 注册框架提供者
   * @param provider 框架提供者
   * @param priority 优先级（可选，默认为100）
   * @param enabled 是否启用（可选，默认为true）
   */
  register(
    provider: AbstractFrameworkProvider, 
    priority: number = 100, 
    enabled: boolean = true
  ): void {
    const frameworkId = provider.frameworkId;
    
    if (this.providers.has(frameworkId)) {
      this.logger.warn(`Framework ${frameworkId} is already registered. Overriding...`);
    }

    const registration: FrameworkRegistration = {
      provider,
      priority,
      enabled,
      registeredAt: new Date()
    };

    this.providers.set(frameworkId, registration);
    this.logger.log(`Registered framework provider: ${frameworkId} (priority: ${priority})`);
  }

  /**
   * 注销框架提供者
   * @param frameworkId 框架ID
   */
  unregister(frameworkId: ModelFramework): boolean {
    const removed = this.providers.delete(frameworkId);
    if (removed) {
      this.logger.log(`Unregistered framework provider: ${frameworkId}`);
    }
    return removed;
  }

  /**
   * 获取框架提供者
   * @param frameworkId 框架ID
   */
  getProvider(frameworkId: ModelFramework): AbstractFrameworkProvider | undefined {
    const registration = this.providers.get(frameworkId);
    return registration?.enabled ? registration.provider : undefined;
  }

  /**
   * 获取所有已注册的框架ID
   * @param enabledOnly 是否只返回启用的框架
   */
  getRegisteredFrameworks(enabledOnly: boolean = true): ModelFramework[] {
    const frameworks: ModelFramework[] = [];
    
    for (const [frameworkId, registration] of this.providers) {
      if (!enabledOnly || registration.enabled) {
        frameworks.push(frameworkId);
      }
    }

    // 按优先级排序
    return frameworks.sort((a, b) => {
      const priorityA = this.providers.get(a)?.priority || 100;
      const priorityB = this.providers.get(b)?.priority || 100;
      return priorityA - priorityB;
    });
  }

  /**
   * 获取所有已注册的提供者
   * @param enabledOnly 是否只返回启用的提供者
   */
  getAllProviders(enabledOnly: boolean = true): AbstractFrameworkProvider[] {
    const providers: AbstractFrameworkProvider[] = [];
    
    for (const registration of this.providers.values()) {
      if (!enabledOnly || registration.enabled) {
        providers.push(registration.provider);
      }
    }

    // 按优先级排序
    return providers.sort((a, b) => {
      const priorityA = this.providers.get(a.frameworkId)?.priority || 100;
      const priorityB = this.providers.get(b.frameworkId)?.priority || 100;
      return priorityA - priorityB;
    });
  }

  /**
   * 启用/禁用框架
   * @param frameworkId 框架ID
   * @param enabled 是否启用
   */
  setEnabled(frameworkId: ModelFramework, enabled: boolean): boolean {
    const registration = this.providers.get(frameworkId);
    if (registration) {
      registration.enabled = enabled;
      this.logger.log(`Framework ${frameworkId} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * 设置框架优先级
   * @param frameworkId 框架ID
   * @param priority 新的优先级
   */
  setPriority(frameworkId: ModelFramework, priority: number): boolean {
    const registration = this.providers.get(frameworkId);
    if (registration) {
      registration.priority = priority;
      this.logger.log(`Framework ${frameworkId} priority set to ${priority}`);
      return true;
    }
    return false;
  }

  /**
   * 检查框架是否已注册
   * @param frameworkId 框架ID
   */
  isRegistered(frameworkId: ModelFramework): boolean {
    return this.providers.has(frameworkId);
  }

  /**
   * 检查框架是否启用
   * @param frameworkId 框架ID
   */
  isEnabled(frameworkId: ModelFramework): boolean {
    const registration = this.providers.get(frameworkId);
    return registration?.enabled || false;
  }

  /**
   * 获取注册信息
   * @param frameworkId 框架ID
   */
  getRegistration(frameworkId: ModelFramework): FrameworkRegistration | undefined {
    return this.providers.get(frameworkId);
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.providers.clear();
    this.logger.log('Cleared all framework registrations');
  }

  /**
   * 获取注册统计信息
   */
  getStats() {
    const total = this.providers.size;
    const enabled = Array.from(this.providers.values()).filter(r => r.enabled).length;
    
    return {
      total,
      enabled,
      disabled: total - enabled,
      frameworks: this.getRegisteredFrameworks(false)
    };
  }
}
