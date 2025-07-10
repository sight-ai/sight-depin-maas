import { Injectable, Logger } from '@nestjs/common';
import {
  IConfigManager,
  IConfigStorage,
  IConfigValidator,
  IConfigListener,
  ConfigValue,
  ConfigMetadata,
  ConfigValidationResult,
  ConfigChangeEvent,
  ConfigBackup,
  ConfigType,
  ConfigScope
} from '../interfaces/unified-config.interface';

/**
 * 统一配置管理器服务
 * 
 * 职责：
 * 1. 协调配置存储和验证
 * 2. 管理配置变更监听
 * 3. 提供配置备份和恢复
 * 4. 遵循依赖倒置原则，依赖抽象接口
 */
@Injectable()
export class UnifiedConfigManagerService implements IConfigManager {
  private readonly logger = new Logger(UnifiedConfigManagerService.name);
  private readonly listeners = new Map<string, IConfigListener>();
  private readonly metadata = new Map<string, ConfigMetadata>();
  private readonly backups = new Map<string, ConfigBackup>();

  constructor(
    private readonly storage: IConfigStorage,
    private readonly validator: IConfigValidator,
    private readonly configType: ConfigType,
    private readonly configScope: ConfigScope
  ) {}

  /**
   * 获取配置值
   */
  async get<T = ConfigValue>(key: string, defaultValue?: T): Promise<T> {
    try {
      const value = await this.storage.get(key, this.configScope);
      
      if (value !== null && value !== undefined) {
        return value as T;
      }

      // 尝试从元数据获取默认值
      const meta = this.metadata.get(key);
      if (meta && meta.defaultValue !== undefined) {
        return meta.defaultValue as T;
      }

      // 使用验证器获取默认值
      if (meta) {
        const validatorDefault = this.validator.getDefaultValue(key, meta);
        if (validatorDefault !== null && validatorDefault !== undefined) {
          return validatorDefault as T;
        }
      }

      // 返回提供的默认值
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      return null as T;
    } catch (error) {
      this.logger.error(`Failed to get config ${key}:`, error);
      return defaultValue !== undefined ? defaultValue : null as T;
    }
  }

  /**
   * 设置配置值
   */
  async set(key: string, value: ConfigValue): Promise<boolean> {
    try {
      // 获取旧值用于变更事件
      const oldValue = await this.storage.get(key, this.configScope);

      // 验证配置值
      const meta = this.metadata.get(key);
      if (meta) {
        const validationResult = await this.validator.validateItem(key, value, meta);
        if (!validationResult.isValid) {
          this.logger.warn(`Validation failed for ${key}:`, validationResult.errors);
          return false;
        }
      }

      // 保存配置
      const success = await this.storage.set(key, value, this.configScope);
      
      if (success) {
        // 触发变更事件
        this.notifyConfigChange({
          key,
          oldValue,
          newValue: value,
          timestamp: new Date().toISOString(),
          source: this.configType
        });

        this.logger.debug(`Config ${key} updated successfully`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to set config ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除配置
   */
  async delete(key: string): Promise<boolean> {
    try {
      const oldValue = await this.storage.get(key, this.configScope);
      const success = await this.storage.delete(key, this.configScope);
      
      if (success) {
        // 触发变更事件
        this.notifyConfigChange({
          key,
          oldValue,
          newValue: null,
          timestamp: new Date().toISOString(),
          source: this.configType
        });

        this.logger.debug(`Config ${key} deleted successfully`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to delete config ${key}:`, error);
      return false;
    }
  }

  /**
   * 检查配置是否存在
   */
  async has(key: string): Promise<boolean> {
    return await this.storage.has(key, this.configScope);
  }

  /**
   * 获取配置分组
   */
  async getGroup(prefix: string): Promise<Record<string, ConfigValue>> {
    try {
      const allConfigs = await this.storage.getAll(this.configScope);
      const groupConfigs: Record<string, ConfigValue> = {};

      for (const [key, value] of Object.entries(allConfigs)) {
        if (key.startsWith(prefix)) {
          groupConfigs[key] = value;
        }
      }

      return groupConfigs;
    } catch (error) {
      this.logger.error(`Failed to get config group ${prefix}:`, error);
      return {};
    }
  }

  /**
   * 设置配置分组
   */
  async setGroup(prefix: string, config: Record<string, ConfigValue>): Promise<boolean> {
    try {
      let allSuccess = true;

      for (const [key, value] of Object.entries(config)) {
        const fullKey = key.startsWith(prefix) ? key : `${prefix}.${key}`;
        const success = await this.set(fullKey, value);
        if (!success) {
          allSuccess = false;
        }
      }

      return allSuccess;
    } catch (error) {
      this.logger.error(`Failed to set config group ${prefix}:`, error);
      return false;
    }
  }

  /**
   * 验证配置
   */
  async validate(): Promise<ConfigValidationResult> {
    try {
      const allConfigs = await this.storage.getAll(this.configScope);
      const allMetadata: Record<string, ConfigMetadata> = {};

      // 收集所有元数据
      for (const [key, meta] of this.metadata.entries()) {
        allMetadata[key] = meta;
      }

      return await this.validator.validateConfig(allConfigs, allMetadata);
    } catch (error) {
      this.logger.error('Failed to validate config:', error);
      return {
        isValid: false,
        errors: [{
          key: 'validation',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * 重置到默认值
   */
  async reset(keys?: string[]): Promise<boolean> {
    try {
      const keysToReset = keys || Array.from(this.metadata.keys());
      let allSuccess = true;

      for (const key of keysToReset) {
        const meta = this.metadata.get(key);
        if (meta) {
          const defaultValue = this.validator.getDefaultValue(key, meta);
          if (defaultValue !== null) {
            const success = await this.set(key, defaultValue);
            if (!success) {
              allSuccess = false;
            }
          } else {
            // 如果没有默认值，删除配置
            const success = await this.delete(key);
            if (!success) {
              allSuccess = false;
            }
          }
        }
      }

      if (allSuccess) {
        this.logger.log(`Reset ${keysToReset.length} configurations to defaults`);
      }

      return allSuccess;
    } catch (error) {
      this.logger.error('Failed to reset config:', error);
      return false;
    }
  }

  /**
   * 备份配置
   */
  async backup(description?: string): Promise<ConfigBackup> {
    try {
      const configs = await this.storage.getAll(this.configScope);
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const backup: ConfigBackup = {
        id: backupId,
        timestamp: new Date().toISOString(),
        description: description || `Backup created at ${new Date().toLocaleString()}`,
        configs,
        metadata: {
          version: '1.0.0',
          source: `${this.configType}:${this.configScope}`,
          size: JSON.stringify(configs).length
        }
      };

      this.backups.set(backupId, backup);
      this.logger.log(`Created config backup: ${backupId}`);

      return backup;
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * 恢复配置
   */
  async restore(backupId: string): Promise<boolean> {
    try {
      const backup = this.backups.get(backupId);
      if (!backup) {
        this.logger.error(`Backup not found: ${backupId}`);
        return false;
      }

      // 清空当前配置
      await this.storage.clear(this.configScope);

      // 恢复配置
      let allSuccess = true;
      for (const [key, value] of Object.entries(backup.configs)) {
        const success = await this.storage.set(key, value, this.configScope);
        if (!success) {
          allSuccess = false;
        }
      }

      if (allSuccess) {
        this.logger.log(`Restored config from backup: ${backupId}`);
      }

      return allSuccess;
    } catch (error) {
      this.logger.error(`Failed to restore backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * 注册配置监听器
   */
  addListener(listener: IConfigListener): void {
    this.listeners.set(listener.getId(), listener);
    this.logger.debug(`Added config listener: ${listener.getId()}`);
  }

  /**
   * 移除配置监听器
   */
  removeListener(listenerId: string): void {
    this.listeners.delete(listenerId);
    this.logger.debug(`Removed config listener: ${listenerId}`);
  }

  /**
   * 获取配置元数据
   */
  async getMetadata(key: string): Promise<ConfigMetadata | null> {
    return this.metadata.get(key) || null;
  }

  /**
   * 设置配置元数据
   */
  async setMetadata(key: string, metadata: ConfigMetadata): Promise<boolean> {
    try {
      this.metadata.set(key, metadata);
      this.logger.debug(`Set metadata for config: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set metadata for ${key}:`, error);
      return false;
    }
  }

  /**
   * 获取配置统计信息
   */
  async getStats(): Promise<{
    totalConfigs: number;
    configsByType: Record<ConfigType, number>;
    configsByScope: Record<ConfigScope, number>;
    lastModified: string;
    storageSize: number;
  }> {
    try {
      const configs = await this.storage.getAll(this.configScope);
      const configCount = Object.keys(configs).length;
      
      return {
        totalConfigs: configCount,
        configsByType: { [this.configType]: configCount } as Record<ConfigType, number>,
        configsByScope: { [this.configScope]: configCount } as Record<ConfigScope, number>,
        lastModified: new Date().toISOString(),
        storageSize: JSON.stringify(configs).length
      };
    } catch (error) {
      this.logger.error('Failed to get config stats:', error);
      return {
        totalConfigs: 0,
        configsByType: {} as Record<ConfigType, number>,
        configsByScope: {} as Record<ConfigScope, number>,
        lastModified: new Date().toISOString(),
        storageSize: 0
      };
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 通知配置变更
   */
  private notifyConfigChange(event: ConfigChangeEvent): void {
    for (const listener of this.listeners.values()) {
      try {
        const watchedKeys = listener.getWatchedKeys();
        if (watchedKeys.length === 0 || watchedKeys.includes(event.key)) {
          listener.onConfigChange(event);
        }
      } catch (error) {
        this.logger.error(`Error notifying listener ${listener.getId()}:`, error);
      }
    }
  }

  /**
   * 获取备份列表
   */
  getBackups(): ConfigBackup[] {
    return Array.from(this.backups.values());
  }

  /**
   * 删除备份
   */
  deleteBackup(backupId: string): boolean {
    return this.backups.delete(backupId);
  }

  /**
   * 清理过期备份
   */
  cleanupBackups(maxAge: number = 30 * 24 * 60 * 60 * 1000): number { // 30天
    const now = Date.now();
    let cleaned = 0;

    for (const [id, backup] of this.backups.entries()) {
      const backupTime = new Date(backup.timestamp).getTime();
      if (now - backupTime > maxAge) {
        this.backups.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired backups`);
    }

    return cleaned;
  }
}
