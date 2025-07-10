import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IUnifiedConfigService,
  IConfigManager,
  ConfigType,
  ConfigScope,
  ConfigValidationResult,
  ConfigBackup
} from '../interfaces/unified-config.interface';
import { UnifiedConfigFactoryService } from './unified-config-factory.service';

/**
 * 增强的统一配置服务
 * 
 * 职责：
 * 1. 提供统一的配置管理入口
 * 2. 协调不同类型和作用域的配置管理器
 * 3. 提供全局配置操作
 * 4. 遵循门面模式，简化配置管理的复杂性
 */
@Injectable()
export class EnhancedUnifiedConfigService implements IUnifiedConfigService, OnModuleInit {
  private readonly logger = new Logger(EnhancedUnifiedConfigService.name);
  private readonly configManagers = new Map<string, IConfigManager>();
  private isInitialized = false;

  constructor(
    private readonly configFactory: UnifiedConfigFactoryService
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.initializeConfigManagers();
      this.isInitialized = true;
      this.logger.log('Enhanced unified config service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize enhanced unified config service:', error);
      throw error;
    }
  }

  /**
   * 获取应用配置管理器
   */
  getAppConfigManager(): IConfigManager {
    return this.getConfigManager(ConfigType.APPLICATION, ConfigScope.GLOBAL);
  }

  /**
   * 获取框架配置管理器
   */
  getFrameworkConfigManager(): IConfigManager {
    return this.getConfigManager(ConfigType.FRAMEWORK, ConfigScope.USER);
  }

  /**
   * 获取设备配置管理器
   */
  getDeviceConfigManager(): IConfigManager {
    return this.getConfigManager(ConfigType.DEVICE, ConfigScope.DEVICE);
  }

  /**
   * 获取系统配置管理器
   */
  getSystemConfigManager(): IConfigManager {
    return this.getConfigManager(ConfigType.SYSTEM, ConfigScope.GLOBAL);
  }

  /**
   * 获取用户配置管理器
   */
  getUserConfigManager(): IConfigManager {
    return this.getConfigManager(ConfigType.USER, ConfigScope.USER);
  }

  /**
   * 执行全局配置验证
   */
  async validateAllConfigs(): Promise<Record<ConfigType, ConfigValidationResult>> {
    const results: Record<ConfigType, ConfigValidationResult> = {} as any;

    try {
      const validationPromises = [
        { type: ConfigType.APPLICATION, manager: this.getAppConfigManager() },
        { type: ConfigType.FRAMEWORK, manager: this.getFrameworkConfigManager() },
        { type: ConfigType.DEVICE, manager: this.getDeviceConfigManager() },
        { type: ConfigType.SYSTEM, manager: this.getSystemConfigManager() },
        { type: ConfigType.USER, manager: this.getUserConfigManager() }
      ].map(async ({ type, manager }) => {
        const result = await manager.validate();
        return { type, result };
      });

      const validationResults = await Promise.all(validationPromises);
      
      for (const { type, result } of validationResults) {
        results[type] = result;
      }

      this.logger.debug('Completed global config validation');
      return results;

    } catch (error) {
      this.logger.error('Failed to validate all configs:', error);
      throw error;
    }
  }

  /**
   * 备份所有配置
   */
  async backupAllConfigs(description?: string): Promise<ConfigBackup> {
    try {
      const timestamp = new Date().toISOString();
      const backupId = `global_backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const allConfigs: Record<string, any> = {};
      
      // 收集所有配置
      const configTypes = [
        { type: ConfigType.APPLICATION, manager: this.getAppConfigManager() },
        { type: ConfigType.FRAMEWORK, manager: this.getFrameworkConfigManager() },
        { type: ConfigType.DEVICE, manager: this.getDeviceConfigManager() },
        { type: ConfigType.SYSTEM, manager: this.getSystemConfigManager() },
        { type: ConfigType.USER, manager: this.getUserConfigManager() }
      ];

      for (const { type, manager } of configTypes) {
        const configs = await manager.getGroup('');
        allConfigs[type] = configs;
      }

      const backup: ConfigBackup = {
        id: backupId,
        timestamp,
        description: description || `Global backup created at ${new Date().toLocaleString()}`,
        configs: allConfigs,
        metadata: {
          version: '1.0.0',
          source: 'global',
          size: JSON.stringify(allConfigs).length
        }
      };

      this.logger.log(`Created global config backup: ${backupId}`);
      return backup;

    } catch (error) {
      this.logger.error('Failed to backup all configs:', error);
      throw error;
    }
  }

  /**
   * 恢复所有配置
   */
  async restoreAllConfigs(backupId: string): Promise<boolean> {
    try {
      // 这里需要实现从备份恢复的逻辑
      // 由于备份可能存储在不同的地方，这里提供一个基本框架
      
      this.logger.warn('Global config restore is not fully implemented yet');
      return false;

    } catch (error) {
      this.logger.error(`Failed to restore configs from backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * 获取配置健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: Record<ConfigType, {
      valid: boolean;
      errors: number;
      warnings: number;
    }>;
    lastCheck: string;
  }> {
    try {
      const validationResults = await this.validateAllConfigs();
      const details: Record<ConfigType, { valid: boolean; errors: number; warnings: number }> = {} as any;
      
      let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      let totalErrors = 0;
      let totalWarnings = 0;

      for (const [type, result] of Object.entries(validationResults)) {
        const errors = result.errors.filter(e => e.severity === 'error').length;
        const warnings = result.warnings.length + result.errors.filter(e => e.severity === 'warning').length;
        
        details[type as ConfigType] = {
          valid: result.isValid,
          errors,
          warnings
        };

        totalErrors += errors;
        totalWarnings += warnings;
      }

      // 确定整体状态
      if (totalErrors > 0) {
        overallStatus = 'error';
      } else if (totalWarnings > 0) {
        overallStatus = 'warning';
      }

      return {
        status: overallStatus,
        details,
        lastCheck: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get health status:', error);
      return {
        status: 'error',
        details: {} as any,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * 获取配置统计信息
   */
  async getConfigStats(): Promise<{
    totalConfigs: number;
    configsByType: Record<ConfigType, number>;
    healthStatus: 'healthy' | 'warning' | 'error';
    lastUpdated: string;
  }> {
    try {
      const managers = [
        { type: ConfigType.APPLICATION, manager: this.getAppConfigManager() },
        { type: ConfigType.FRAMEWORK, manager: this.getFrameworkConfigManager() },
        { type: ConfigType.DEVICE, manager: this.getDeviceConfigManager() },
        { type: ConfigType.SYSTEM, manager: this.getSystemConfigManager() },
        { type: ConfigType.USER, manager: this.getUserConfigManager() }
      ];

      const statsPromises = managers.map(async ({ type, manager }) => {
        const stats = await manager.getStats();
        return { type, count: stats.totalConfigs };
      });

      const statsResults = await Promise.all(statsPromises);
      const configsByType: Record<ConfigType, number> = {} as any;
      let totalConfigs = 0;

      for (const { type, count } of statsResults) {
        configsByType[type] = count;
        totalConfigs += count;
      }

      const healthStatus = await this.getHealthStatus();

      return {
        totalConfigs,
        configsByType,
        healthStatus: healthStatus.status,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get config stats:', error);
      return {
        totalConfigs: 0,
        configsByType: {} as any,
        healthStatus: 'error',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 重置所有配置到默认值
   */
  async resetAllConfigs(): Promise<boolean> {
    try {
      const managers = [
        this.getAppConfigManager(),
        this.getFrameworkConfigManager(),
        this.getDeviceConfigManager(),
        this.getSystemConfigManager(),
        this.getUserConfigManager()
      ];

      const resetPromises = managers.map(manager => manager.reset());
      const results = await Promise.all(resetPromises);
      
      const allSuccess = results.every(result => result);
      
      if (allSuccess) {
        this.logger.log('All configurations reset to defaults successfully');
      } else {
        this.logger.warn('Some configurations failed to reset');
      }

      return allSuccess;

    } catch (error) {
      this.logger.error('Failed to reset all configs:', error);
      return false;
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 获取配置管理器
   */
  private getConfigManager(type: ConfigType, scope: ConfigScope): IConfigManager {
    const key = `${type}:${scope}`;
    
    if (!this.configManagers.has(key)) {
      const manager = this.configFactory.createManager(type, scope);
      this.configManagers.set(key, manager);
    }

    return this.configManagers.get(key)!;
  }

  /**
   * 初始化配置管理器
   */
  private async initializeConfigManagers(): Promise<void> {
    // 预创建常用的配置管理器
    const managersToCreate = [
      { type: ConfigType.APPLICATION, scope: ConfigScope.GLOBAL },
      { type: ConfigType.FRAMEWORK, scope: ConfigScope.USER },
      { type: ConfigType.DEVICE, scope: ConfigScope.DEVICE },
      { type: ConfigType.SYSTEM, scope: ConfigScope.GLOBAL },
      { type: ConfigType.USER, scope: ConfigScope.USER }
    ];

    for (const { type, scope } of managersToCreate) {
      this.getConfigManager(type, scope);
    }

    this.logger.debug(`Initialized ${managersToCreate.length} config managers`);
  }

  /**
   * 检查服务是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Enhanced unified config service is not initialized');
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.configManagers.clear();
    this.configFactory.cleanup();
    this.isInitialized = false;
    this.logger.debug('Enhanced unified config service cleaned up');
  }
}
