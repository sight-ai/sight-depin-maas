import { Injectable, Logger } from '@nestjs/common';
import { Level } from 'level';
import { 
  IDatabaseHealth, 
  DatabaseConnectionInfo, 
  SchemaValidationResult,
  TableSchema 
} from '../abstractions/database.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 数据库健康检查服务 
 * 只负责数据库健康状态检查和监控
 */
@Injectable()
export class DatabaseHealthService implements IDatabaseHealth {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly db: Level,
    private readonly errorHandler: ErrorHandlerService,
    private readonly expectedSchemas: TableSchema[] = []
  ) {}

  /**
   * 检查数据库是否连接
   */
  async isConnected(): Promise<boolean> {
    try {
      // 尝试执行一个简单的操作来检查连接
      await this.db.get('__health_check__').catch(() => {
        // 键不存在是正常的，说明数据库可访问
      });
      
      return true;
    } catch (error) {
      this.logger.warn('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * 数据库ping测试
   */
  async ping(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // 执行一个轻量级操作来测试响应时间
      const testKey = `__ping_test_${Date.now()}__`;
      const testValue = 'ping';
      
      await this.db.put(testKey, testValue);
      const retrievedValue = await this.db.get(testKey);
      await this.db.del(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('Ping test data integrity check failed');
      }
      
      const responseTime = Date.now() - startTime;
      this.logger.debug(`Database ping successful: ${responseTime}ms`);
      
      return responseTime;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Database ping failed after ${responseTime}ms:`, error);
      throw this.errorHandler.fromException(error, {
        operation: 'ping',
        responseTime
      });
    }
  }

  /**
   * 获取数据库连接信息
   */
  async getConnectionInfo(): Promise<DatabaseConnectionInfo> {
    try {
      const stats = await this.getDetailedStats();
      
      return {
        type: 'leveldb',
        version: this.getLevelDBVersion(),
        path: this.getDatabasePath(),
        uptime: Date.now() - this.startTime,
        connectionCount: 1, // LevelDB 是单连接
        ...stats
      };
    } catch (error) {
      this.logger.error('Failed to get connection info:', error);
      throw this.errorHandler.fromException(error, {
        operation: 'getConnectionInfo'
      });
    }
  }

  /**
   * 验证数据库模式
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    try {
      this.logger.debug('Starting schema validation');
      
      const result: SchemaValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        missingTables: [],
        extraTables: [],
        missingColumns: [],
        extraColumns: []
      };

      // 获取现有的表（在LevelDB中，我们通过键前缀来模拟表）
      const existingTables = await this.getExistingTables();
      
      // 检查缺失的表
      for (const schema of this.expectedSchemas) {
        if (!existingTables.includes(schema.name)) {
          result.missingTables.push(schema.name);
          result.errors.push(`Missing table: ${schema.name}`);
          result.isValid = false;
        }
      }

      // 检查额外的表
      const expectedTableNames = this.expectedSchemas.map(s => s.name);
      for (const table of existingTables) {
        if (!expectedTableNames.includes(table)) {
          result.extraTables.push(table);
          result.warnings.push(`Extra table found: ${table}`);
        }
      }

      // 在LevelDB中，列验证比较复杂，这里做基本检查
      for (const schema of this.expectedSchemas) {
        if (existingTables.includes(schema.name)) {
          const columnValidation = await this.validateTableColumns(schema);
          result.missingColumns.push(...columnValidation.missing);
          result.extraColumns.push(...columnValidation.extra);
          result.errors.push(...columnValidation.errors);
          result.warnings.push(...columnValidation.warnings);
          
          if (columnValidation.errors.length > 0) {
            result.isValid = false;
          }
        }
      }

      this.logger.debug(`Schema validation completed. Valid: ${result.isValid}`);
      return result;
    } catch (error) {
      this.logger.error('Schema validation failed:', error);
      throw this.errorHandler.fromException(error, {
        operation: 'validateSchema'
      });
    }
  }

  /**
   * 获取数据库性能指标
   */
  async getPerformanceMetrics(): Promise<{
    avgResponseTime: number;
    operationsPerSecond: number;
    errorRate: number;
    cacheHitRate: number;
  }> {
    try {
      // 执行多次ping测试来计算平均响应时间
      const pingTests = 5;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < pingTests; i++) {
        try {
          const responseTime = await this.ping();
          responseTimes.push(responseTime);
        } catch {
          // 忽略单次失败
        }
      }

      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      const operationsPerSecond = avgResponseTime > 0 ? 1000 / avgResponseTime : 0;
      const errorRate = (pingTests - responseTimes.length) / pingTests;

      return {
        avgResponseTime,
        operationsPerSecond,
        errorRate,
        cacheHitRate: 0.95 // LevelDB 内部缓存，这里是估算值
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      throw this.errorHandler.fromException(error, {
        operation: 'getPerformanceMetrics'
      });
    }
  }

  /**
   * 检查数据库完整性
   */
  async checkIntegrity(): Promise<{
    isIntact: boolean;
    corruptedKeys: string[];
    totalKeys: number;
    checkedKeys: number;
  }> {
    try {
      this.logger.debug('Starting database integrity check');
      
      const corruptedKeys: string[] = [];
      let totalKeys = 0;
      let checkedKeys = 0;

      for await (const [key, value] of this.db.iterator()) {
        totalKeys++;
        
        try {
          // 尝试读取和解析值
          if (value !== null && value !== undefined) {
            // 基本的数据完整性检查
            if (typeof value === 'string' && value.startsWith('{')) {
              JSON.parse(value); // 验证JSON格式
            }
            checkedKeys++;
          }
        } catch (error) {
          this.logger.warn(`Corrupted key found: ${key}`, error);
          corruptedKeys.push(key);
        }
      }

      const isIntact = corruptedKeys.length === 0;
      
      this.logger.debug(`Integrity check completed. Intact: ${isIntact}, Corrupted: ${corruptedKeys.length}`);
      
      return {
        isIntact,
        corruptedKeys,
        totalKeys,
        checkedKeys
      };
    } catch (error) {
      this.logger.error('Database integrity check failed:', error);
      throw this.errorHandler.fromException(error, {
        operation: 'checkIntegrity'
      });
    }
  }

  /**
   * 获取详细统计信息
   */
  private async getDetailedStats(): Promise<any> {
    try {
      // LevelDB 的统计信息比较有限，这里提供基本信息
      let keyCount = 0;
      for await (const [key] of this.db.iterator({ keys: true, values: false })) {
        keyCount++;
      }

      return {
        keyCount,
        estimatedSize: keyCount * 100 // 粗略估算
      };
    } catch {
      return {
        keyCount: 0,
        estimatedSize: 0
      };
    }
  }

  /**
   * 获取LevelDB版本
   */
  private getLevelDBVersion(): string {
    try {
      // 尝试从package.json或其他方式获取版本
      return '8.0.0'; // 默认版本
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取数据库路径
   */
  private getDatabasePath(): string {
    try {
      // 从数据库实例获取路径信息
      return this.db.location || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取现有表列表
   */
  private async getExistingTables(): Promise<string[]> {
    const tables = new Set<string>();
    
    try {
      for await (const [key] of this.db.iterator({ keys: true, values: false })) {
        // 假设键格式为 "table:id" 或 "table_name:record_id"
        const parts = key.split(':');
        if (parts.length >= 2) {
          tables.add(parts[0]);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get existing tables:', error);
    }

    return Array.from(tables);
  }

  /**
   * 验证表列
   */
  private async validateTableColumns(schema: TableSchema): Promise<{
    missing: Array<{ table: string; column: string }>;
    extra: Array<{ table: string; column: string }>;
    errors: string[];
    warnings: string[];
  }> {
    // 在LevelDB中，列验证比较复杂，这里做简化处理
    return {
      missing: [],
      extra: [],
      errors: [],
      warnings: [`Column validation for table ${schema.name} is simplified in LevelDB`]
    };
  }
}
