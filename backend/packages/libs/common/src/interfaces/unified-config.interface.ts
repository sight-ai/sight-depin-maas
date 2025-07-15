/**
 * 统一配置管理接口
 * 
 * 遵循单一职责原则和依赖倒置原则
 * 提供统一的配置管理抽象
 */

/**
 * 配置类型枚举
 */
export enum ConfigType {
  APPLICATION = 'application',
  FRAMEWORK = 'framework',
  DEVICE = 'device',
  SYSTEM = 'system',
  USER = 'user'
}

/**
 * 配置作用域
 */
export enum ConfigScope {
  GLOBAL = 'global',
  USER = 'user',
  DEVICE = 'device',
  SESSION = 'session'
}

/**
 * 配置值类型
 */
export type ConfigValue = string | number | boolean | object | null | undefined;

/**
 * 配置元数据
 */
export interface ConfigMetadata {
  type: ConfigType;
  scope: ConfigScope;
  version: string;
  description?: string;
  required?: boolean;
  defaultValue?: ConfigValue;
  validationSchema?: any;
  lastModified?: string;
  modifiedBy?: string;
}

/**
 * 配置项定义
 */
export interface ConfigItem {
  key: string;
  value: ConfigValue;
  metadata: ConfigMetadata;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  key: string;
  oldValue: ConfigValue;
  newValue: ConfigValue;
  timestamp: string;
  source: string;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: Array<{
    key: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    key: string;
    message: string;
  }>;
}

/**
 * 配置备份信息
 */
export interface ConfigBackup {
  id: string;
  timestamp: string;
  description: string;
  configs: Record<string, ConfigValue>;
  metadata: {
    version: string;
    source: string;
    size: number;
  };
}

/**
 * 配置存储接口
 */
export interface IConfigStorage {
  /**
   * 读取配置值
   */
  get(key: string, scope?: ConfigScope): Promise<ConfigValue>;

  /**
   * 设置配置值
   */
  set(key: string, value: ConfigValue, scope?: ConfigScope): Promise<boolean>;

  /**
   * 删除配置
   */
  delete(key: string, scope?: ConfigScope): Promise<boolean>;

  /**
   * 检查配置是否存在
   */
  has(key: string, scope?: ConfigScope): Promise<boolean>;

  /**
   * 获取所有配置
   */
  getAll(scope?: ConfigScope): Promise<Record<string, ConfigValue>>;

  /**
   * 清空配置
   */
  clear(scope?: ConfigScope): Promise<boolean>;

  /**
   * 获取配置键列表
   */
  keys(scope?: ConfigScope): Promise<string[]>;
}

/**
 * 配置验证器接口
 */
export interface IConfigValidator {
  /**
   * 验证单个配置项
   */
  validateItem(key: string, value: ConfigValue, metadata: ConfigMetadata): Promise<ConfigValidationResult>;

  /**
   * 验证配置集合
   */
  validateConfig(config: Record<string, ConfigValue>, metadata: Record<string, ConfigMetadata>): Promise<ConfigValidationResult>;

  /**
   * 注册验证规则
   */
  registerRule(key: string, rule: (value: ConfigValue) => boolean | string): void;

  /**
   * 获取默认值
   */
  getDefaultValue(key: string, metadata: ConfigMetadata): ConfigValue;
}

/**
 * 配置监听器接口
 */
export interface IConfigListener {
  /**
   * 监听配置变更
   */
  onConfigChange(event: ConfigChangeEvent): void;

  /**
   * 获取监听器ID
   */
  getId(): string;

  /**
   * 获取监听的配置键
   */
  getWatchedKeys(): string[];
}

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  /**
   * 获取配置值
   */
  get<T = ConfigValue>(key: string, defaultValue?: T): Promise<T>;

  /**
   * 设置配置值
   */
  set(key: string, value: ConfigValue): Promise<boolean>;

  /**
   * 删除配置
   */
  delete(key: string): Promise<boolean>;

  /**
   * 检查配置是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 获取配置分组
   */
  getGroup(prefix: string): Promise<Record<string, ConfigValue>>;

  /**
   * 设置配置分组
   */
  setGroup(prefix: string, config: Record<string, ConfigValue>): Promise<boolean>;

  /**
   * 验证配置
   */
  validate(): Promise<ConfigValidationResult>;

  /**
   * 重置到默认值
   */
  reset(keys?: string[]): Promise<boolean>;

  /**
   * 备份配置
   */
  backup(description?: string): Promise<ConfigBackup>;

  /**
   * 恢复配置
   */
  restore(backupId: string): Promise<boolean>;

  /**
   * 注册配置监听器
   */
  addListener(listener: IConfigListener): void;

  /**
   * 移除配置监听器
   */
  removeListener(listenerId: string): void;

  /**
   * 获取配置元数据
   */
  getMetadata(key: string): Promise<ConfigMetadata | null>;

  /**
   * 设置配置元数据
   */
  setMetadata(key: string, metadata: ConfigMetadata): Promise<boolean>;

  /**
   * 获取配置统计信息
   */
  getStats(): Promise<{
    totalConfigs: number;
    configsByType: Record<ConfigType, number>;
    configsByScope: Record<ConfigScope, number>;
    lastModified: string;
    storageSize: number;
  }>;
}

/**
 * 配置迁移接口
 */
export interface IConfigMigration {
  /**
   * 获取迁移版本
   */
  getVersion(): string;

  /**
   * 检查是否需要迁移
   */
  needsMigration(currentVersion: string): boolean;

  /**
   * 执行迁移
   */
  migrate(config: Record<string, ConfigValue>): Promise<Record<string, ConfigValue>>;

  /**
   * 获取迁移描述
   */
  getDescription(): string;
}

/**
 * 配置工厂接口
 */
export interface IConfigFactory {
  /**
   * 创建配置管理器
   */
  createManager(type: ConfigType, scope: ConfigScope): IConfigManager;

  /**
   * 创建配置存储
   */
  createStorage(type: ConfigType, scope: ConfigScope): IConfigStorage;

  /**
   * 创建配置验证器
   */
  createValidator(type: ConfigType): IConfigValidator;

  /**
   * 注册配置迁移
   */
  registerMigration(migration: IConfigMigration): void;

  /**
   * 获取可用的配置类型
   */
  getAvailableTypes(): ConfigType[];

  /**
   * 获取可用的配置作用域
   */
  getAvailableScopes(): ConfigScope[];
}

/**
 * 配置服务接口
 */
export interface IUnifiedConfigService {
  /**
   * 获取应用配置管理器
   */
  getAppConfigManager(): IConfigManager;

  /**
   * 获取框架配置管理器
   */
  getFrameworkConfigManager(): IConfigManager;

  /**
   * 获取设备配置管理器
   */
  getDeviceConfigManager(): IConfigManager;

  /**
   * 获取系统配置管理器
   */
  getSystemConfigManager(): IConfigManager;

  /**
   * 获取用户配置管理器
   */
  getUserConfigManager(): IConfigManager;

  /**
   * 执行全局配置验证
   */
  validateAllConfigs(): Promise<Record<ConfigType, ConfigValidationResult>>;

  /**
   * 备份所有配置
   */
  backupAllConfigs(description?: string): Promise<ConfigBackup>;

  /**
   * 恢复所有配置
   */
  restoreAllConfigs(backupId: string): Promise<boolean>;

  /**
   * 获取配置健康状态
   */
  getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: Record<ConfigType, {
      valid: boolean;
      errors: number;
      warnings: number;
    }>;
    lastCheck: string;
  }>;
}
