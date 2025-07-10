import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  IConfigStorage,
  ConfigScope,
  ConfigValue
} from '../interfaces/unified-config.interface';

/**
 * 统一配置存储服务
 * 
 * 职责：
 * 1. 提供统一的配置文件存储
 * 2. 支持不同作用域的配置隔离
 * 3. 确保配置文件的原子性操作
 * 4. 遵循单一职责原则
 */
@Injectable()
export class UnifiedConfigStorageService implements IConfigStorage {
  private readonly logger = new Logger(UnifiedConfigStorageService.name);
  private readonly baseConfigDir: string;
  private readonly configCache = new Map<string, any>();
  private readonly lockFiles = new Set<string>();

  constructor() {
    this.baseConfigDir = path.join(os.homedir(), '.sightai');
    this.ensureConfigDirectory();
  }

  /**
   * 读取配置值
   */
  async get(key: string, scope: ConfigScope = ConfigScope.GLOBAL): Promise<ConfigValue> {
    try {
      const configFile = this.getConfigFileName(scope);
      const config = await this.loadConfigFile(configFile);
      
      return this.getNestedValue(config, key);
    } catch (error) {
      this.logger.debug(`Failed to get config ${key} from scope ${scope}:`, error);
      return null;
    }
  }

  /**
   * 设置配置值
   */
  async set(key: string, value: ConfigValue, scope: ConfigScope = ConfigScope.GLOBAL): Promise<boolean> {
    try {
      const configFile = this.getConfigFileName(scope);
      const config = await this.loadConfigFile(configFile);
      
      this.setNestedValue(config, key, value);
      
      return await this.saveConfigFile(configFile, config);
    } catch (error) {
      this.logger.error(`Failed to set config ${key} in scope ${scope}:`, error);
      return false;
    }
  }

  /**
   * 删除配置
   */
  async delete(key: string, scope: ConfigScope = ConfigScope.GLOBAL): Promise<boolean> {
    try {
      const configFile = this.getConfigFileName(scope);
      const config = await this.loadConfigFile(configFile);
      
      if (this.deleteNestedValue(config, key)) {
        return await this.saveConfigFile(configFile, config);
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete config ${key} from scope ${scope}:`, error);
      return false;
    }
  }

  /**
   * 检查配置是否存在
   */
  async has(key: string, scope: ConfigScope = ConfigScope.GLOBAL): Promise<boolean> {
    const value = await this.get(key, scope);
    return value !== null && value !== undefined;
  }

  /**
   * 获取所有配置
   */
  async getAll(scope: ConfigScope = ConfigScope.GLOBAL): Promise<Record<string, ConfigValue>> {
    try {
      const configFile = this.getConfigFileName(scope);
      return await this.loadConfigFile(configFile);
    } catch (error) {
      this.logger.debug(`Failed to get all configs from scope ${scope}:`, error);
      return {};
    }
  }

  /**
   * 清空配置
   */
  async clear(scope: ConfigScope = ConfigScope.GLOBAL): Promise<boolean> {
    try {
      const configFile = this.getConfigFileName(scope);
      return await this.saveConfigFile(configFile, {});
    } catch (error) {
      this.logger.error(`Failed to clear configs in scope ${scope}:`, error);
      return false;
    }
  }

  /**
   * 获取配置键列表
   */
  async keys(scope: ConfigScope = ConfigScope.GLOBAL): Promise<string[]> {
    try {
      const config = await this.getAll(scope);
      return this.getAllKeys(config);
    } catch (error) {
      this.logger.debug(`Failed to get config keys from scope ${scope}:`, error);
      return [];
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 确保配置目录存在
   */
  private ensureConfigDirectory(): void {
    try {
      if (!fs.existsSync(this.baseConfigDir)) {
        fs.mkdirSync(this.baseConfigDir, { recursive: true });
        this.logger.debug(`Created config directory: ${this.baseConfigDir}`);
      }
    } catch (error) {
      this.logger.error('Failed to create config directory:', error);
      throw error;
    }
  }

  /**
   * 获取配置文件名
   */
  private getConfigFileName(scope: ConfigScope): string {
    const fileNames = {
      [ConfigScope.GLOBAL]: 'global-config.json',
      [ConfigScope.USER]: 'user-config.json',
      [ConfigScope.DEVICE]: 'device-config.json',
      [ConfigScope.SESSION]: 'session-config.json'
    };

    return fileNames[scope] || 'global-config.json';
  }

  /**
   * 获取配置文件路径
   */
  private getConfigFilePath(fileName: string): string {
    return path.join(this.baseConfigDir, fileName);
  }

  /**
   * 加载配置文件
   */
  private async loadConfigFile(fileName: string): Promise<Record<string, any>> {
    const filePath = this.getConfigFilePath(fileName);
    
    // 检查缓存
    if (this.configCache.has(filePath)) {
      return { ...this.configCache.get(filePath) };
    }

    try {
      if (!fs.existsSync(filePath)) {
        return {};
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      
      // 缓存配置
      this.configCache.set(filePath, config);
      
      return { ...config };
    } catch (error) {
      this.logger.warn(`Failed to load config file ${fileName}:`, error);
      return {};
    }
  }

  /**
   * 保存配置文件
   */
  private async saveConfigFile(fileName: string, config: Record<string, any>): Promise<boolean> {
    const filePath = this.getConfigFilePath(fileName);
    
    // 防止并发写入
    if (this.lockFiles.has(filePath)) {
      this.logger.warn(`Config file ${fileName} is locked, waiting...`);
      await this.waitForUnlock(filePath);
    }

    this.lockFiles.add(filePath);

    try {
      // 原子性写入
      const tempFilePath = `${filePath}.tmp`;
      const content = JSON.stringify(config, null, 2);
      
      fs.writeFileSync(tempFilePath, content, 'utf-8');
      fs.renameSync(tempFilePath, filePath);
      
      // 更新缓存
      this.configCache.set(filePath, { ...config });
      
      this.logger.debug(`Saved config file: ${fileName}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to save config file ${fileName}:`, error);
      return false;
    } finally {
      this.lockFiles.delete(filePath);
    }
  }

  /**
   * 等待文件解锁
   */
  private async waitForUnlock(filePath: string): Promise<void> {
    const maxWait = 5000; // 5秒
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (this.lockFiles.has(filePath) && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, key: string): ConfigValue {
    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return null;
      }
      current = current[k];
    }

    return current;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, key: string, value: ConfigValue): void {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (current[k] === null || current[k] === undefined || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: any, key: string): boolean {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (current[k] === null || current[k] === undefined || typeof current[k] !== 'object') {
        return false;
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey in current) {
      delete current[lastKey];
      return true;
    }

    return false;
  }

  /**
   * 获取所有键（包括嵌套键）
   */
  private getAllKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          keys.push(...this.getAllKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
    }

    return keys;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.configCache.clear();
    this.logger.debug('Config cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    files: string[];
  } {
    return {
      size: this.configCache.size,
      files: Array.from(this.configCache.keys())
    };
  }
}
