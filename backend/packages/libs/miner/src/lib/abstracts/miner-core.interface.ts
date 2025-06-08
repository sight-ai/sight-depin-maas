import { ModelOfMiner } from "@saito/models";

// =============================================================================
// 核心抽象接口定义
// =============================================================================

/**
 * 任务管理器抽象接口
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
}

/**
 * 收益管理器抽象接口
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
}

/**
 * 统计分析器抽象接口
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
}

/**
 * 网关连接器抽象接口
 */
export interface IGatewayConnector {
  connectTaskList(body: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>>;
  syncWithGateway(deviceId: string): Promise<boolean>;
  validateGatewayConnection(gatewayAddress: string, key: string): Promise<boolean>;
}

/**
 * 数据访问层抽象接口
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
}

/**
 * 主要矿工服务抽象接口
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
