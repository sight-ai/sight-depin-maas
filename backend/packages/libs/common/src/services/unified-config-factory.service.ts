import { Injectable, Logger } from '@nestjs/common';
import {
  IConfigFactory,
  IConfigManager,
  IConfigStorage,
  IConfigValidator,
  IConfigMigration,
  ConfigType,
  ConfigScope
} from '../interfaces/unified-config.interface';
import { UnifiedConfigStorageService } from './unified-config-storage.service';
import { UnifiedConfigValidatorService } from './unified-config-validator.service';
import { UnifiedConfigManagerService } from './unified-config-manager.service';

/**
 * 统一配置工厂服务
 * 
 * 职责：
 * 1. 创建和管理配置相关的服务实例
 * 2. 提供配置服务的依赖注入
 * 3. 管理配置迁移
 * 4. 遵循工厂模式和依赖倒置原则
 */
@Injectable()
export class UnifiedConfigFactoryService implements IConfigFactory {
  private readonly logger = new Logger(UnifiedConfigFactoryService.name);
  private readonly managers = new Map<string, IConfigManager>();
  private readonly storages = new Map<string, IConfigStorage>();
  private readonly validators = new Map<ConfigType, IConfigValidator>();
  private readonly migrations = new Map<string, IConfigMigration>();

  constructor() {
    this.initializeDefaultValidators();
  }

  /**
   * 创建配置管理器
   */
  createManager(type: ConfigType, scope: ConfigScope): IConfigManager {
    const key = `${type}:${scope}`;
    
    if (this.managers.has(key)) {
      return this.managers.get(key)!;
    }

    const storage = this.createStorage(type, scope);
    const validator = this.createValidator(type);
    
    const manager = new UnifiedConfigManagerService(storage, validator, type, scope);
    this.managers.set(key, manager);
    
    this.logger.debug(`Created config manager for ${type}:${scope}`);
    return manager;
  }

  /**
   * 创建配置存储
   */
  createStorage(type: ConfigType, scope: ConfigScope): IConfigStorage {
    const key = `${type}:${scope}`;
    
    if (this.storages.has(key)) {
      return this.storages.get(key)!;
    }

    // 目前使用统一的存储实现，未来可以根据类型和作用域创建不同的存储
    const storage = new UnifiedConfigStorageService();
    this.storages.set(key, storage);
    
    this.logger.debug(`Created config storage for ${type}:${scope}`);
    return storage;
  }

  /**
   * 创建配置验证器
   */
  createValidator(type: ConfigType): IConfigValidator {
    if (this.validators.has(type)) {
      return this.validators.get(type)!;
    }

    const validator = new UnifiedConfigValidatorService();
    
    // 根据配置类型注册特定的验证规则
    this.registerTypeSpecificRules(validator, type);
    
    this.validators.set(type, validator);
    
    this.logger.debug(`Created config validator for ${type}`);
    return validator;
  }

  /**
   * 注册配置迁移
   */
  registerMigration(migration: IConfigMigration): void {
    const version = migration.getVersion();
    this.migrations.set(version, migration);
    this.logger.debug(`Registered config migration: ${version}`);
  }

  /**
   * 获取可用的配置类型
   */
  getAvailableTypes(): ConfigType[] {
    return Object.values(ConfigType);
  }

  /**
   * 获取可用的配置作用域
   */
  getAvailableScopes(): ConfigScope[] {
    return Object.values(ConfigScope);
  }

  /**
   * 执行配置迁移
   */
  async executeMigrations(
    currentVersion: string,
    targetVersion: string,
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      let migratedConfig = { ...config };
      const sortedMigrations = this.getSortedMigrations();

      for (const migration of sortedMigrations) {
        if (migration.needsMigration(currentVersion)) {
          this.logger.log(`Executing migration: ${migration.getVersion()} - ${migration.getDescription()}`);
          migratedConfig = await migration.migrate(migratedConfig);
        }
      }

      return migratedConfig;
    } catch (error) {
      this.logger.error('Failed to execute migrations:', error);
      throw error;
    }
  }

  /**
   * 获取迁移列表
   */
  getMigrations(): IConfigMigration[] {
    return Array.from(this.migrations.values());
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.managers.clear();
    this.storages.clear();
    this.validators.clear();
    this.logger.debug('Cleaned up config factory resources');
  }

  /**
   * 获取工厂统计信息
   */
  getStats(): {
    managers: number;
    storages: number;
    validators: number;
    migrations: number;
  } {
    return {
      managers: this.managers.size,
      storages: this.storages.size,
      validators: this.validators.size,
      migrations: this.migrations.size
    };
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 初始化默认验证器
   */
  private initializeDefaultValidators(): void {
    // 为每种配置类型创建默认验证器
    for (const type of this.getAvailableTypes()) {
      this.createValidator(type);
    }
  }

  /**
   * 注册类型特定的验证规则
   */
  private registerTypeSpecificRules(validator: IConfigValidator, type: ConfigType): void {
    switch (type) {
      case ConfigType.APPLICATION:
        this.registerApplicationRules(validator);
        break;
      case ConfigType.FRAMEWORK:
        this.registerFrameworkRules(validator);
        break;
      case ConfigType.DEVICE:
        this.registerDeviceRules(validator);
        break;
      case ConfigType.SYSTEM:
        this.registerSystemRules(validator);
        break;
      case ConfigType.USER:
        this.registerUserRules(validator);
        break;
    }
  }

  /**
   * 注册应用配置验证规则
   */
  private registerApplicationRules(validator: IConfigValidator): void {
    validator.registerRule('environment', (value) => {
      const validEnvs = ['development', 'production', 'test'];
      return validEnvs.includes(value as string) || `Environment must be one of: ${validEnvs.join(', ')}`;
    });

    validator.registerRule('logLevel', (value) => {
      const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
      return validLevels.includes(value as string) || `Log level must be one of: ${validLevels.join(', ')}`;
    });
  }

  /**
   * 注册框架配置验证规则
   */
  private registerFrameworkRules(validator: IConfigValidator): void {
    validator.registerRule('frameworkType', (value) => {
      const validFrameworks = ['ollama', 'vllm'];
      return validFrameworks.includes(value as string) || `Framework must be one of: ${validFrameworks.join(', ')}`;
    });

    validator.registerRule('memoryUtilization', (value) => {
      const num = Number(value);
      return (num >= 0 && num <= 1) || 'Memory utilization must be between 0 and 1';
    });

    validator.registerRule('modelLength', (value) => {
      const num = Number(value);
      return (num > 0 && num <= 32768) || 'Model length must be between 1 and 32768';
    });
  }

  /**
   * 注册设备配置验证规则
   */
  private registerDeviceRules(validator: IConfigValidator): void {
    validator.registerRule('deviceId', (value) => {
      return typeof value === 'string' && value.length > 0 || 'Device ID cannot be empty';
    });

    validator.registerRule('gatewayAddress', (value) => {
      if (!value) return true; // 可选字段
      const urlRegex = /^https?:\/\/.+/;
      return urlRegex.test(value as string) || 'Gateway address must be a valid URL';
    });
  }

  /**
   * 注册系统配置验证规则
   */
  private registerSystemRules(validator: IConfigValidator): void {
    validator.registerRule('cpuUsageThreshold', (value) => {
      const num = Number(value);
      return (num >= 0 && num <= 100) || 'CPU usage threshold must be between 0 and 100';
    });

    validator.registerRule('memoryUsageThreshold', (value) => {
      const num = Number(value);
      return (num >= 0 && num <= 100) || 'Memory usage threshold must be between 0 and 100';
    });
  }

  /**
   * 注册用户配置验证规则
   */
  private registerUserRules(validator: IConfigValidator): void {
    validator.registerRule('theme', (value) => {
      const validThemes = ['light', 'dark', 'auto'];
      return validThemes.includes(value as string) || `Theme must be one of: ${validThemes.join(', ')}`;
    });

    validator.registerRule('language', (value) => {
      const validLanguages = ['en', 'zh', 'ja', 'ko'];
      return validLanguages.includes(value as string) || `Language must be one of: ${validLanguages.join(', ')}`;
    });
  }

  /**
   * 获取排序后的迁移列表
   */
  private getSortedMigrations(): IConfigMigration[] {
    return Array.from(this.migrations.values()).sort((a, b) => {
      return a.getVersion().localeCompare(b.getVersion());
    });
  }

  /**
   * 检查迁移依赖
   */
  private validateMigrationDependencies(): boolean {
    // 这里可以添加迁移依赖检查逻辑
    return true;
  }

  /**
   * 创建配置管理器的键
   */
  private createManagerKey(type: ConfigType, scope: ConfigScope): string {
    return `${type}:${scope}`;
  }

  /**
   * 验证配置类型和作用域组合
   */
  private validateTypeAndScope(type: ConfigType, scope: ConfigScope): boolean {
    // 某些类型和作用域的组合可能不被支持
    const invalidCombinations = [
      // 例如：系统配置不应该有会话作用域
      { type: ConfigType.SYSTEM, scope: ConfigScope.SESSION }
    ];

    return !invalidCombinations.some(combo => 
      combo.type === type && combo.scope === scope
    );
  }
}
