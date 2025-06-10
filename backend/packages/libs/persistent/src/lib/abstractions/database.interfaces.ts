import { DatabaseTransactionConnection } from 'slonik';

/**
 * 数据库连接接口 
 * 只包含基本的数据库连接操作
 */
export interface IDatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  exec(sql: string, params?: any[]): Promise<void>;
  run(sql: string, params?: any[]): Promise<any>;
}

/**
 * 事务管理接口 
 * 只包含事务相关操作
 */
export interface ITransactionManager {
  transaction<T>(callback: (connection: IDatabaseConnection) => Promise<T>): Promise<T>;
  beginTransaction(): Promise<IDatabaseConnection>;
  commitTransaction(connection: IDatabaseConnection): Promise<void>;
  rollbackTransaction(connection: IDatabaseConnection): Promise<void>;
}

/**
 * 数据库存储接口 
 * 只包含键值存储操作
 */
export interface IKeyValueStore {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * 批量操作接口 
 * 只包含批量操作
 */
export interface IBatchOperations {
  batch(operations: BatchOperation[]): Promise<void>;
  bulkInsert<T>(table: string, records: T[]): Promise<void>;
  bulkUpdate<T>(table: string, records: Partial<T>[], whereClause: string): Promise<void>;
  bulkDelete(table: string, ids: string[]): Promise<void>;
}

/**
 * 数据库迁移接口 
 * 只包含迁移相关操作
 */
export interface IDatabaseMigration {
  createTable(schema: TableSchema): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  addColumn(tableName: string, columnName: string, columnDef: ColumnDefinition): Promise<void>;
  dropColumn(tableName: string, columnName: string): Promise<void>;
  createIndex(tableName: string, indexName: string, columns: string[]): Promise<void>;
  dropIndex(tableName: string, indexName: string): Promise<void>;
}

/**
 * 数据库健康检查接口 
 * 只包含健康检查操作
 */
export interface IDatabaseHealth {
  isConnected(): Promise<boolean>;
  ping(): Promise<number>; // 返回响应时间(ms)
  getConnectionInfo(): Promise<DatabaseConnectionInfo>;
  validateSchema(): Promise<SchemaValidationResult>;
}

/**
 * 完整的持久化服务接口 - 组合所有子接口
 * 保持向后兼容性
 */
export interface IPersistentService extends 
  IDatabaseConnection, 
  ITransactionManager, 
  IKeyValueStore, 
  IBatchOperations, 
  IDatabaseMigration, 
  IDatabaseHealth {
  
  // 特定数据库访问器
  readonly deviceStatusStore: IKeyValueStore;
  readonly tasksStore: IKeyValueStore;
  readonly earningsStore: IKeyValueStore;
  
  // 向后兼容的属性
  readonly db: any;
  readonly deviceStatusDb: any;
  readonly tasksDb: any;
  readonly earningsDb: any;
  readonly pgPool: {
    transaction<T>(callback: (connection: DatabaseTransactionConnection) => Promise<T>): Promise<T>;
  };
}

/**
 * 批量操作定义
 */
export interface BatchOperation {
  type: 'put' | 'del';
  key: string;
  value?: any;
}

/**
 * 表结构定义
 */
export interface TableSchema {
  name: string;
  fields: Record<string, ColumnDefinition>;
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
}

/**
 * 列定义
 */
export interface ColumnDefinition {
  type: 'text' | 'integer' | 'double' | 'boolean' | 'timestamp' | 'uuid' | 'json';
  primaryKey?: boolean;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  enum?: string[];
  foreignKey?: {
    table: string;
    field: string;
  };
}

/**
 * 索引定义
 */
export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

/**
 * 约束定义
 */
export interface ConstraintDefinition {
  name: string;
  type: 'unique' | 'check' | 'foreign_key';
  columns: string[];
  reference?: {
    table: string;
    columns: string[];
  };
  condition?: string;
}

/**
 * 数据库连接信息
 */
export interface DatabaseConnectionInfo {
  type: 'leveldb' | 'postgresql' | 'sqlite';
  version: string;
  path?: string;
  host?: string;
  port?: number;
  database?: string;
  connectionCount?: number;
  uptime?: number;
}

/**
 * 模式验证结果
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingTables: string[];
  extraTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  extraColumns: Array<{ table: string; column: string }>;
}

/**
 * 操作结果接口
 */
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  affectedRows?: number;
  executionTime?: number;
  timestamp: string;
}
