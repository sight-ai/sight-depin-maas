import { ModelOfMiner } from "@saito/models";

// =============================================================================
// 核心契约接口定义 - 按业务功能组织
// =============================================================================

/**
 * 任务管理器契约接口
 */
export interface ITaskManager {
  createTask(args: ModelOfMiner<'CreateTaskRequest'>): Promise<ModelOfMiner<'Task'>>;
  updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>>;
  getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: ModelOfMiner<'Task'>[];
  }>;
  getDeviceTasks(deviceId: string, limit?: number): Promise<ModelOfMiner<'Task'>[]>;
  handleStaleInProgressTasks(): Promise<void>;
  getTaskStats(): Promise<any>;
}

/**
 * 收益管理器契约接口
 */
export interface IEarningsManager {
  createEarnings(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }>;
  getDeviceEarnings(deviceId: string, limit?: number): Promise<ModelOfMiner<'Earning'>[]>;
  getEarningsHistory(deviceId: string, days?: number): Promise<ModelOfMiner<'MinerEarningsHistory'>[]>;
  getEarningsSummary(deviceId: string): Promise<ModelOfMiner<'MinerEarning'>>;
  getEarningsStats(): Promise<any>;
}

/**
 * 统计分析器契约接口
 */
export interface IStatisticsAnalyzer {
  getSummary(timeRange?: {
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: {
      year?: string;
      month?: string;
      view?: 'Month' | 'Year'
    }
  }): Promise<ModelOfMiner<'Summary'>>;
  getUptimePercentage(deviceId: string): Promise<number>;
  getTaskRequestData(deviceId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<ModelOfMiner<'MinerDailyRequests'>[]>;
  getTaskActivity(deviceId: string, timeRange: { year?: number; month?: number; view?: 'Month' | 'Year' }): Promise<ModelOfMiner<'MinerTaskActivity'>[]>;
  getPerformanceMetrics(): Promise<any>;
}

/**
 * 网关连接器契约接口
 */
export interface IGatewayConnector {
  connectTaskList(body: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>>;
  syncWithGateway(deviceId: string): Promise<boolean>;
  validateGatewayConnection(gatewayAddress: string, key: string): Promise<boolean>;
}

/**
 * 数据访问层契约接口
 */
export interface IDataAccessLayer {
  // 任务相关
  createTask(model: string, deviceId: string): Promise<ModelOfMiner<'Task'>>;
  updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>>;
  getTaskById(id: string): Promise<ModelOfMiner<'Task'> | null>;
  getTasksByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Task'>[]>;
  getTasksPaginated(page: number, limit: number, deviceId: string, isRegistered: boolean): Promise<{
    count: number;
    tasks: ModelOfMiner<'Task'>[];
  }>;

  // 收益相关
  createEarning(blockRewards: number, jobRewards: number, deviceId: string, taskId: string): Promise<void>;
  getEarningsByDeviceId(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'Earning'>[]>;
  getEarningInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarning'>>;
  getEarningsHistory(deviceId: string, days: number, isRegistered: boolean): Promise<ModelOfMiner<'MinerEarningsHistory'>[]>;

  // 设备相关
  getDeviceInfo(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerDeviceStatus'> | null>;
  getUptimePercentage(deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerUptime'>>;

  // 统计相关
  getTaskRequestData(deviceId: string, period: 'daily' | 'weekly' | 'monthly', isRegistered: boolean): Promise<ModelOfMiner<'MinerDailyRequests'>[]>;
  getMonthlyTaskActivity(year: number, deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerTaskActivity'>[]>;
  getDailyTaskActivity(month: number, deviceId: string, isRegistered: boolean): Promise<ModelOfMiner<'MinerTaskActivity'>[]>;

  // 事务支持
  transaction<T>(handler: (db: any) => Promise<T>): Promise<T>;

  // 统计相关
  loadStatistics(): Promise<any>;
}

/**
 * 主要矿工服务契约接口
 */
export interface IMinerService {
  // 任务管理
  createTask(args: ModelOfMiner<'CreateTaskRequest'>): Promise<ModelOfMiner<'Task'>>;
  updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>>;
  getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: ModelOfMiner<'Task'>[];
  }>;
  getDeviceTasks(deviceId: string, limit?: number): Promise<ModelOfMiner<'Task'>[]>;

  // 收益管理
  createEarnings(blockRewards: number, jobRewards: number, taskId: string, deviceId: string): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }>;
  getDeviceEarnings(deviceId: string, limit?: number): Promise<ModelOfMiner<'Earning'>[]>;

  // 统计分析
  getSummary(timeRange?: {
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: {
      year?: string;
      month?: string;
      view?: 'Month' | 'Year'
    }
  }): Promise<ModelOfMiner<'Summary'>>;

  // 网关连接
  connectTaskList(body: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>>;
}

// =============================================================================
// 服务标识符 (用于依赖注入)
// =============================================================================

export const TASK_MANAGER = Symbol('TASK_MANAGER');
export const EARNINGS_MANAGER = Symbol('EARNINGS_MANAGER');
export const STATISTICS_ANALYZER = Symbol('STATISTICS_ANALYZER');
export const GATEWAY_CONNECTOR = Symbol('GATEWAY_CONNECTOR');
export const DATA_ACCESS_LAYER = Symbol('DATA_ACCESS_LAYER');
export const MINER_SERVICE = Symbol('MINER_SERVICE');

// =============================================================================
// 配置和选项类型
// =============================================================================

export interface MinerConfig {
  maxRetries: number;
  retryDelay: number;
  staleTaskThreshold: number; // 毫秒
  defaultPageSize: number;
  enableAutoCleanup: boolean;
  maxConcurrentTasks: number;
  taskTimeout: number;
  enableMetrics: boolean;
  metricsInterval: number;
  cleanupInterval: number;
}

export interface TimeRangeOptions {
  request_serials?: 'daily' | 'weekly' | 'monthly';
  filteredTaskActivity?: {
    year?: string;
    month?: string;
    view?: 'Month' | 'Year';
  };
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface TaskFilters {
  deviceId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// =============================================================================
// 错误类型
// =============================================================================

export class MinerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MinerError';
  }
}

export class TaskNotFoundError extends MinerError {
  constructor(taskId: string) {
    super(`Task with id ${taskId} not found`, 'TASK_NOT_FOUND', { taskId });
  }
}

export class EarningsCreationError extends MinerError {
  constructor(message: string, details?: any) {
    super(message, 'EARNINGS_CREATION_ERROR', details);
  }
}

export class GatewayConnectionError extends MinerError {
  constructor(message: string, details?: any) {
    super(message, 'GATEWAY_CONNECTION_ERROR', details);
  }
}

export class DataAccessError extends MinerError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_ACCESS_ERROR', details);
  }
}

// =============================================================================
// 健康检查相关接口
// =============================================================================

/**
 * 矿工健康检查契约接口
 */
export interface IMinerHealth {
  checkHealth(): Promise<HealthCheckResult>;
  getSystemStatus(): Promise<SystemStatus>;
  validateConfiguration(): Promise<ConfigurationValidation>;
  performDiagnostics(): Promise<DiagnosticsResult>;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    taskManager: boolean;
    earningsManager: boolean;
    statisticsAnalyzer: boolean;
    gatewayConnector: boolean;
    dataAccess: boolean;
  };
  issues: string[];
  lastCheck: Date;
}

/**
 * 系统状态
 */
export interface SystemStatus {
  cpu: number;
  memory: number;
  disk: number;
  network: boolean;
  database: boolean;
  services: Record<string, boolean>;
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
 * 诊断结果
 */
export interface DiagnosticsResult {
  overall: 'pass' | 'warning' | 'fail';
  tests: Array<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
    duration: number;
  }>;
  summary: string;
  recommendations: string[];
}
