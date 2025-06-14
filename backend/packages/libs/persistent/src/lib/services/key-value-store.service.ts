import { Injectable, Logger } from '@nestjs/common';
import { Level } from 'level';
import { IKeyValueStore } from '../abstractions/database.interfaces';
import { ErrorHandlerService, OperationResult } from '@saito/common';

/**
 * 键值存储服务实现 
 * 只负责键值存储操作，不处理其他数据库功能
 */
@Injectable()
export class KeyValueStoreService implements IKeyValueStore {
  private readonly logger = new Logger(KeyValueStoreService.name);

  constructor(
    private readonly db: Level,
    private readonly errorHandler: ErrorHandlerService,
    private readonly storeName: string = 'default'
  ) {}

  /**
   * 获取值
   */
  async get(key: string): Promise<any> {
    try {
      this.logger.debug(`Getting key: ${key} from store: ${this.storeName}`);
      
      const value = await this.db.get(key);
      const parsedValue = this.parseValue(value);
      
      this.logger.debug(`Retrieved value for key: ${key}`);
      return parsedValue;
    } catch (error: any) {
      if (error?.code === 'LEVEL_NOT_FOUND') {
        this.logger.debug(`Key not found: ${key}`);
        return null;
      }
      
      this.logger.error(`Failed to get key ${key}:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'get',
        key,
        store: this.storeName
      });
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: any): Promise<void> {
    try {
      this.logger.debug(`Setting key: ${key} in store: ${this.storeName}`);
      
      const serializedValue = this.serializeValue(value);
      await this.db.put(key, serializedValue);
      
      this.logger.debug(`Set value for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'set',
        key,
        store: this.storeName
      });
    }
  }

  /**
   * 删除键
   */
  async delete(key: string): Promise<void> {
    try {
      this.logger.debug(`Deleting key: ${key} from store: ${this.storeName}`);
      
      await this.db.del(key);
      
      this.logger.debug(`Deleted key: ${key}`);
    } catch (error: any) {
      if (error?.code === 'LEVEL_NOT_FOUND') {
        this.logger.debug(`Key not found for deletion: ${key}`);
        return; // 不存在的键删除操作视为成功
      }
      
      this.logger.error(`Failed to delete key ${key}:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'delete',
        key,
        store: this.storeName
      });
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.db.get(key);
      return true;
    } catch (error: any) {
      if (error?.code === 'LEVEL_NOT_FOUND') {
        return false;
      }
      
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'exists',
        key,
        store: this.storeName
      });
    }
  }

  /**
   * 获取所有键
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      this.logger.debug(`Getting keys with pattern: ${pattern || 'all'} from store: ${this.storeName}`);
      
      const keys: string[] = [];
      
      for await (const [key] of this.db.iterator({ keys: true, values: false })) {
        if (!pattern || this.matchesPattern(key, pattern)) {
          keys.push(key);
        }
      }
      
      this.logger.debug(`Retrieved ${keys.length} keys`);
      return keys;
    } catch (error) {
      this.logger.error(`Failed to get keys:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'keys',
        pattern,
        store: this.storeName
      });
    }
  }

  /**
   * 清空存储
   */
  async clear(): Promise<void> {
    try {
      this.logger.debug(`Clearing store: ${this.storeName}`);
      
      await this.db.clear();
      
      this.logger.debug(`Cleared store: ${this.storeName}`);
    } catch (error) {
      this.logger.error(`Failed to clear store:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'clear',
        store: this.storeName
      });
    }
  }

  /**
   * 批量获取
   */
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      this.logger.debug(`Getting multiple keys: ${keys.length} from store: ${this.storeName}`);
      
      const result: Record<string, any> = {};
      
      for (const key of keys) {
        try {
          result[key] = await this.get(key);
        } catch (error) {
          // 单个键的错误不影响其他键的获取
          this.logger.warn(`Failed to get key ${key}:`, error);
          result[key] = null;
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get multiple keys:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'multiGet',
        keyCount: keys.length,
        store: this.storeName
      });
    }
  }

  /**
   * 批量设置
   */
  async multiSet(data: Record<string, any>): Promise<void> {
    try {
      const keys = Object.keys(data);
      this.logger.debug(`Setting multiple keys: ${keys.length} in store: ${this.storeName}`);
      
      const batch = this.db.batch();
      
      for (const [key, value] of Object.entries(data)) {
        const serializedValue = this.serializeValue(value);
        batch.put(key, serializedValue);
      }
      
      await batch.write();
      
      this.logger.debug(`Set ${keys.length} keys in batch`);
    } catch (error) {
      this.logger.error(`Failed to set multiple keys:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'multiSet',
        keyCount: Object.keys(data).length,
        store: this.storeName
      });
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<{
    keyCount: number;
    storeName: string;
    approximateSize: number;
  }> {
    try {
      const keys = await this.keys();
      
      return {
        keyCount: keys.length,
        storeName: this.storeName,
        approximateSize: await this.getApproximateSize()
      };
    } catch (error) {
      this.logger.error(`Failed to get stats:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'getStats',
        store: this.storeName
      });
    }
  }

  /**
   * 序列化值
   */
  private serializeValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * 解析值
   */
  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      // 如果不是JSON，返回原始字符串
      return value;
    }
  }

  /**
   * 模式匹配
   */
  private matchesPattern(key: string, pattern: string): boolean {
    // 简单的通配符匹配，支持 * 和 ?
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * 获取近似大小
   */
  private async getApproximateSize(): Promise<number> {
    try {
      // LevelDB 没有直接的大小API，这里返回一个估算值
      const keys = await this.keys();
      return keys.length * 100; // 粗略估算每个键值对100字节
    } catch {
      return 0;
    }
  }
}
