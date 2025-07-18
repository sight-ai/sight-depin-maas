import { 
  UnifiedConfigFactoryService,
  EnhancedUnifiedConfigService
} from '@saito/common';
import { DesktopConfigService } from './desktop-config.service';
import { IDesktopConfigService } from '../interfaces/desktop-config.interface';

/**
 * Desktop 配置服务工厂
 * 
 * 负责创建和管理 Desktop 配置服务实例
 * 遵循工厂模式和单例模式
 */
export class DesktopConfigFactory {
  private static instance: DesktopConfigFactory;
  private desktopConfigService: IDesktopConfigService | null = null;
  private configFactory: UnifiedConfigFactoryService | null = null;
  private enhancedConfigService: EnhancedUnifiedConfigService | null = null;

  private constructor() {}

  /**
   * 获取工厂实例
   */
  static getInstance(): DesktopConfigFactory {
    if (!DesktopConfigFactory.instance) {
      DesktopConfigFactory.instance = new DesktopConfigFactory();
    }
    return DesktopConfigFactory.instance;
  }

  /**
   * 初始化工厂
   */
  async initialize(): Promise<void> {
    if (!this.configFactory) {
      this.configFactory = new UnifiedConfigFactoryService();
    }

    if (!this.enhancedConfigService) {
      this.enhancedConfigService = new EnhancedUnifiedConfigService(this.configFactory);
      await this.enhancedConfigService.onModuleInit();
    }
  }

  /**
   * 创建 Desktop 配置服务
   */
  async createDesktopConfigService(): Promise<IDesktopConfigService> {
    if (!this.desktopConfigService) {
      await this.initialize();
      
      if (!this.configFactory || !this.enhancedConfigService) {
        throw new Error('Failed to initialize config services');
      }

      this.desktopConfigService = new DesktopConfigService(
        this.configFactory,
        this.enhancedConfigService
      );

      await this.desktopConfigService.initialize();
    }

    return this.desktopConfigService;
  }

  /**
   * 获取现有的 Desktop 配置服务
   */
  getDesktopConfigService(): IDesktopConfigService | null {
    return this.desktopConfigService;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.desktopConfigService) {
      await this.desktopConfigService.cleanup();
      this.desktopConfigService = null;
    }

    if (this.enhancedConfigService) {
      await this.enhancedConfigService.cleanup();
      this.enhancedConfigService = null;
    }

    if (this.configFactory) {
      this.configFactory.cleanup();
      this.configFactory = null;
    }
  }

  /**
   * 重置工厂
   */
  static reset(): void {
    if (DesktopConfigFactory.instance) {
      DesktopConfigFactory.instance.cleanup();
      DesktopConfigFactory.instance = null as any;
    }
  }
}

/**
 * 全局 Desktop 配置服务实例获取器
 */
export async function getDesktopConfigService(): Promise<IDesktopConfigService> {
  const factory = DesktopConfigFactory.getInstance();
  return await factory.createDesktopConfigService();
}

/**
 * 全局 Desktop 配置服务清理
 */
export async function cleanupDesktopConfigService(): Promise<void> {
  const factory = DesktopConfigFactory.getInstance();
  await factory.cleanup();
}
