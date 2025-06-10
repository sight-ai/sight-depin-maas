import { ModelOfMiner } from '@saito/models';

/**
 * 任务同步接口 
 * 只包含任务同步相关操作
 */
export interface ITaskSynchronizer {
  syncTasks(): Promise<SyncResult>;
  syncTasksIncremental(lastSyncTime: Date): Promise<SyncResult>;
  validateTaskData(task: ModelOfMiner<'Task'>): Promise<ValidationResult>;
  resolveTaskConflicts(localTask: ModelOfMiner<'Task'>, remoteTask: ModelOfMiner<'Task'>): Promise<ModelOfMiner<'Task'>>;
}

/**
 * 收益同步接口 
 * 只包含收益同步相关操作
 */
export interface IEarningsSynchronizer {
  syncEarnings(): Promise<SyncResult>;
  syncEarningsIncremental(lastSyncTime: Date): Promise<SyncResult>;
  validateEarningsData(earning: ModelOfMiner<'Earning'>): Promise<ValidationResult>;
  resolveEarningsConflicts(localEarning: ModelOfMiner<'Earning'>, remoteEarning: ModelOfMiner<'Earning'>): Promise<ModelOfMiner<'Earning'>>;
}

/**
 * 网关客户端接口 
 * 只包含网关通信操作
 */
export interface IGatewayClient {
  fetchTasks(params: SyncRequestParams): Promise<ModelOfMiner<'Task'>[]>;
  fetchEarnings(params: SyncRequestParams): Promise<ModelOfMiner<'Earning'>[]>;
  uploadTasks(tasks: ModelOfMiner<'Task'>[]): Promise<UploadResult>;
  uploadEarnings(earnings: ModelOfMiner<'Earning'>[]): Promise<UploadResult>;
  checkConnectivity(): Promise<boolean>;
  getServerTime(): Promise<Date>;
}

/**
 * 本地数据管理接口 
 * 只包含本地数据操作
 */
export interface ILocalDataManager {
  saveTasks(tasks: ModelOfMiner<'Task'>[]): Promise<void>;
  saveEarnings(earnings: ModelOfMiner<'Earning'>[]): Promise<void>;
  getLocalTasks(filters?: TaskFilters): Promise<ModelOfMiner<'Task'>[]>;
  getLocalEarnings(filters?: EarningsFilters): Promise<ModelOfMiner<'Earning'>[]>;
  getLastSyncTime(syncType: SyncType): Promise<Date | null>;
  updateLastSyncTime(syncType: SyncType, time: Date): Promise<void>;
}

/**
 * 冲突解决接口 
 * 只包含冲突解决操作
 */
export interface IConflictResolver {
  resolveTaskConflict(local: ModelOfMiner<'Task'>, remote: ModelOfMiner<'Task'>): Promise<ConflictResolution<ModelOfMiner<'Task'>>>;
  resolveEarningsConflict(local: ModelOfMiner<'Earning'>, remote: ModelOfMiner<'Earning'>): Promise<ConflictResolution<ModelOfMiner<'Earning'>>>;
  setConflictStrategy(strategy: ConflictStrategy): void;
  getConflictStrategy(): ConflictStrategy;
}

/**
 * 同步健康检查接口 
 * 只包含同步健康检查操作
 */
export interface ISyncHealth {
  checkSyncHealth(): Promise<SyncHealthResult>;
  getSyncStatistics(): Promise<SyncStatistics>;
  validateSyncConfiguration(): Promise<ConfigurationValidation>;
  performSyncDiagnostics(): Promise<SyncDiagnostics>;
}

/**
 * 完整的任务同步服务接口 - 组合所有子接口
 * 保持向后兼容性
 */
export interface ITaskSyncService extends 
  ITaskSynchronizer, 
  IEarningsSynchronizer, 
  IGatewayClient, 
  ILocalDataManager, 
  IConflictResolver,
  ISyncHealth {
  
  // 向后兼容的方法
  syncTasks(): Promise<SyncResult>;
  syncEarnings(): Promise<SyncResult>;
}

/**
 * 同步请求参数
 */
export interface SyncRequestParams {
  deviceId: string;
  gatewayAddress: string;
  authKey: string;
  page?: number;
  pageSize?: number;
  lastSyncTime?: Date;
  filters?: Record<string, any>;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  conflicts: number;
  message?: string;
  details?: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  };
  duration: number;
  timestamp: Date;
}

/**
 * 上传结果
 */
export interface UploadResult {
  success: boolean;
  uploaded: number;
  failed: number;
  errors: string[];
  serverResponse?: any;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedData?: any;
}

/**
 * 冲突解决结果
 */
export interface ConflictResolution<T> {
  resolution: 'local' | 'remote' | 'merged' | 'manual';
  resolvedData: T;
  reason: string;
  confidence: number;
}

/**
 * 同步健康结果
 */
export interface SyncHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    gatewayConnection: boolean;
    localDataAccess: boolean;
    taskSynchronizer: boolean;
    earningsSynchronizer: boolean;
    conflictResolver: boolean;
  };
  issues: string[];
  lastCheck: Date;
}

/**
 * 同步统计
 */
export interface SyncStatistics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  lastSyncTime: Date | null;
  totalTasksSynced: number;
  totalEarningsSynced: number;
  conflictsResolved: number;
  errorRate: number;
}

/**
 * 配置验证
 */
export interface ConfigurationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * 同步诊断
 */
export interface SyncDiagnostics {
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
 * 任务过滤器
 */
export interface TaskFilters {
  status?: string[];
  model?: string[];
  source?: string[];
  deviceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * 收益过滤器
 */
export interface EarningsFilters {
  type?: string[];
  deviceId?: string;
  taskId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

/**
 * 同步类型
 */
export enum SyncType {
  TASKS = 'tasks',
  EARNINGS = 'earnings',
  FULL = 'full'
}

/**
 * 冲突策略
 */
export enum ConflictStrategy {
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  LATEST_WINS = 'latest_wins',
  MERGE = 'merge',
  MANUAL = 'manual'
}

/**
 * 同步模式
 */
export enum SyncMode {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DELTA = 'delta'
}

/**
 * 网关响应
 */
export interface GatewayResponse<T> {
  success: boolean;
  error?: string;
  data?: {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  serverTime?: string;
  version?: string;
}

/**
 * 同步配置
 */
export interface SyncConfiguration {
  syncInterval: number;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  conflictStrategy: ConflictStrategy;
  syncMode: SyncMode;
  enableIncrementalSync: boolean;
  enableConflictResolution: boolean;
  enableValidation: boolean;
  timeoutMs: number;
}

/**
 * 同步事件
 */
export interface SyncEvents {
  syncStarted: (type: SyncType) => void;
  syncCompleted: (type: SyncType, result: SyncResult) => void;
  syncFailed: (type: SyncType, error: Error) => void;
  conflictDetected: (type: string, local: any, remote: any) => void;
  conflictResolved: (type: string, resolution: ConflictResolution<any>) => void;
  dataValidated: (type: string, result: ValidationResult) => void;
}

/**
 * 同步错误类
 */
export class SyncError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

/**
 * 同步操作结果
 */
export interface SyncOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  duration?: number;
}
