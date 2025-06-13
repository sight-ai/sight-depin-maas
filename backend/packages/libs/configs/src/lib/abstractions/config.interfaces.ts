/**
 * 配置读取接口 
 * 只包含配置读取相关操作
 */
export interface IConfigReader {
  get<T = any>(key: string): Promise<T | null>;
  getSync<T = any>(key: string): T | null;
  has(key: string): Promise<boolean>;
  hasSync(key: string): boolean;
  getAll(): Promise<Record<string, any>>;
  getAllSync(): Record<string, any>;
}

/**
 * 配置写入接口 
 * 只包含配置写入相关操作
 */
export interface IConfigWriter {
  set<T = any>(key: string, value: T): Promise<void>;
  setSync<T = any>(key: string, value: T): void;
  delete(key: string): Promise<void>;
  deleteSync(key: string): void;
  clear(): Promise<void>;
  clearSync(): void;
  merge(config: Record<string, any>): Promise<void>;
  mergeSync(config: Record<string, any>): void;
}

/**
 * 配置验证接口 
 * 只包含配置验证相关操作
 */
export interface IConfigValidator {
  validate(config: any, schema?: any): Promise<ValidationResult>;
  validateSync(config: any, schema?: any): ValidationResult;
  validateKey(key: string, value: any): Promise<ValidationResult>;
  validateKeySync(key: string, value: any): ValidationResult;
  registerSchema(name: string, schema: any): void;
  getSchema(name: string): any;
}

/**
 * 配置监听接口 
 * 只包含配置变化监听操作
 */
export interface IConfigWatcher {
  watch(key: string, callback: ConfigChangeCallback): Promise<void>;
  watchAll(callback: ConfigChangeCallback): Promise<void>;
  unwatch(key: string): Promise<void>;
  unwatchAll(): Promise<void>;
  isWatching(key: string): boolean;
}

/**
 * 配置持久化接口 
 * 只包含配置持久化操作
 */
export interface IConfigPersistence {
  save(): Promise<void>;
  saveSync(): void;
  load(): Promise<void>;
  loadSync(): void;
  backup(name?: string): Promise<string>;
  restore(backupName: string): Promise<void>;
  listBackups(): Promise<string[]>;
  deleteBackup(backupName: string): Promise<void>;
}

/**
 * 配置健康检查接口 
 * 只包含健康检查操作
 */
export interface IConfigHealth {
  checkHealth(): Promise<ConfigHealthResult>;
  validateIntegrity(): Promise<IntegrityResult>;
  performDiagnostics(): Promise<ConfigDiagnostics>;
  getConfigStats(): Promise<ConfigStats>;
}

/**
 * 完整的配置服务接口 - 组合所有子接口
 * 保持向后兼容性
 */
export interface IConfigService extends 
  IConfigReader, 
  IConfigWriter, 
  IConfigValidator, 
  IConfigWatcher, 
  IConfigPersistence,
  IConfigHealth {
  
  // 配置源管理
  addSource(source: IConfigSource): void;
  removeSource(sourceName: string): void;
  getSources(): IConfigSource[];
  
  // 环境管理
  setEnvironment(env: string): void;
  getEnvironment(): string;
  
  // 向后兼容的方法
  getClientType(): string;
  setClientType(type: string): void;
}

/**
 * 配置源接口 
 */
export interface IConfigSource {
  readonly name: string;
  readonly priority: number;
  readonly isReadonly: boolean;
  
  load(): Promise<Record<string, any>>;
  save(config: Record<string, any>): Promise<void>;
  watch(callback: ConfigChangeCallback): Promise<void>;
  unwatch(): Promise<void>;
  isAvailable(): Promise<boolean>;
}

/**
 * 配置变化回调
 */
export type ConfigChangeCallback = (change: ConfigChange) => void;

/**
 * 配置变化事件
 */
export interface ConfigChange {
  key: string;
  oldValue: any;
  newValue: any;
  source: string;
  timestamp: Date;
  type: 'set' | 'delete' | 'clear';
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  correctedValue?: any;
}

/**
 * 验证错误
 */
export interface ValidationError {
  path: string;
  message: string;
  value: any;
  constraint: string;
}

/**
 * 配置健康结果
 */
export interface ConfigHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  sources: Record<string, {
    available: boolean;
    readable: boolean;
    writable: boolean;
    lastAccess: Date;
    error?: string;
  }>;
  issues: string[];
  lastCheck: Date;
}

/**
 * 完整性检查结果
 */
export interface IntegrityResult {
  isIntact: boolean;
  corruptedKeys: string[];
  missingKeys: string[];
  invalidValues: Array<{
    key: string;
    value: any;
    reason: string;
  }>;
  checksumValid: boolean;
}

/**
 * 配置诊断
 */
export interface ConfigDiagnostics {
  overall: 'pass' | 'warning' | 'fail';
  tests: Array<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
    duration: number;
  }>;
  recommendations: string[];
}

/**
 * 配置统计
 */
export interface ConfigStats {
  totalKeys: number;
  totalSources: number;
  activeSources: number;
  configSize: number;
  lastModified: Date;
  accessCount: number;
  errorCount: number;
}

/**
 * 配置选项
 */
export interface ConfigOptions {
  environment?: string;
  autoSave?: boolean;
  autoLoad?: boolean;
  enableWatching?: boolean;
  enableValidation?: boolean;
  enableBackup?: boolean;
  backupInterval?: number;
  maxBackups?: number;
  encryptionKey?: string;
}

/**
 * 配置源类型
 */
export enum ConfigSourceType {
  FILE = 'file',
  ENVIRONMENT = 'environment',
  MEMORY = 'memory',
  DATABASE = 'database',
  REMOTE = 'remote'
}

/**
 * 配置格式
 */
export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  INI = 'ini',
  ENV = 'env'
}

/**
 * 配置事件
 */
export interface ConfigEvents {
  changed: (change: ConfigChange) => void;
  loaded: (source: string) => void;
  saved: (source: string) => void;
  error: (error: Error, source?: string) => void;
  validated: (result: ValidationResult) => void;
  sourceAdded: (source: IConfigSource) => void;
  sourceRemoved: (sourceName: string) => void;
}

/**
 * 配置错误类
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * 配置操作结果
 */
export interface ConfigOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  source?: string;
}

/**
 * 默认配置值
 */
export interface DefaultConfig {
  client_type: 'ollama' | 'vllm';
  framework: {
    ollama: {
      url: string;
      timeout: number;
      retries: number;
    };
    vllm: {
      url: string;
      timeout: number;
      retries: number;
    };
  };
  device: {
    id: string;
    name: string;
    type: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFile: boolean;
    enableConsole: boolean;
  };
  performance: {
    enableMetrics: boolean;
    enableProfiling: boolean;
    maxMemoryUsage: number;
  };
}

/**
 * 配置迁移接口
 */
export interface IConfigMigration {
  readonly version: string;
  readonly description: string;
  
  up(config: any): Promise<any>;
  down(config: any): Promise<any>;
  validate(config: any): Promise<boolean>;
}
