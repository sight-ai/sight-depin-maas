import { ModelOfMiner } from '@saito/models';

/**
 * 任务管理接口 
 * 只包含任务相关操作
 */
export interface ITaskManager {
  createTask(task: ModelOfMiner<'Task'>): Promise<string>;
  updateTask(taskId: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<void>;
  getTask(taskId: string): Promise<ModelOfMiner<'Task'> | null>;
  listTasks(filters?: TaskFilters): Promise<ModelOfMiner<'Task'>[]>;
  deleteTask(taskId: string): Promise<void>;
  getTaskStats(): Promise<TaskStatistics>;
}

/**
 * 收益管理接口 
 * 只包含收益相关操作
 */
export interface IEarningsManager {
  createEarning(earning: ModelOfMiner<'Earning'>): Promise<string>;
  updateEarning(earningId: string, updates: Partial<ModelOfMiner<'Earning'>>): Promise<void>;
  getEarning(earningId: string): Promise<ModelOfMiner<'Earning'> | null>;
  listEarnings(filters?: EarningsFilters): Promise<ModelOfMiner<'Earning'>[]>;
  deleteEarning(earningId: string): Promise<void>;
  getEarningsStats(): Promise<EarningsStatistics>;
  calculateTotalEarnings(deviceId?: string): Promise<number>;
}

/**
 * 统计分析接口 
 * 只包含统计分析操作
 */
export interface IStatisticsAnalyzer {
  generateSummary(deviceId?: string): Promise<ModelOfMiner<'Summary'>>;
  getPerformanceMetrics(deviceId?: string): Promise<PerformanceMetrics>;
  getUptimeStatistics(deviceId?: string): Promise<UptimeStatistics>;
  getTrendAnalysis(period: TimePeriod): Promise<TrendAnalysis>;
  generateReport(reportType: ReportType, options?: ReportOptions): Promise<MinerReport>;
}

/**
 * 网关连接接口 
 * 只包含网关通信操作
 */
export interface IGatewayConnector {
  connectTaskList(request: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>>;
  syncWithGateway(): Promise<boolean>;
  validateGatewayConnection(): Promise<boolean>;
  sendHeartbeat(): Promise<boolean>;
  reportStatus(status: MinerStatus): Promise<boolean>;
}

/**
 * 数据访问接口 
 * 只包含数据持久化操作
 */
export interface IDataAccessLayer {
  saveTask(task: ModelOfMiner<'Task'>): Promise<void>;
  loadTask(taskId: string): Promise<ModelOfMiner<'Task'> | null>;
  saveEarning(earning: ModelOfMiner<'Earning'>): Promise<void>;
  loadEarning(earningId: string): Promise<ModelOfMiner<'Earning'> | null>;
  saveStatistics(stats: any): Promise<void>;
  loadStatistics(): Promise<any>;
  cleanup(olderThan: Date): Promise<number>;
}

/**
 * 矿工健康检查接口 
 * 只包含健康检查操作
 */
export interface IMinerHealth {
  checkHealth(): Promise<HealthCheckResult>;
  getSystemStatus(): Promise<SystemStatus>;
  validateConfiguration(): Promise<ConfigurationValidation>;
  performDiagnostics(): Promise<DiagnosticsResult>;
}

/**
 * 完整的矿工服务接口 - 组合所有子接口
 * 保持向后兼容性
 */
export interface IMinerService extends 
  ITaskManager, 
  IEarningsManager, 
  IStatisticsAnalyzer, 
  IGatewayConnector,
  IMinerHealth {
  
  // 核心矿工操作
  startMining(): Promise<void>;
  stopMining(): Promise<void>;
  getMinerStatus(): Promise<MinerStatus>;
  
  // 配置管理
  updateConfiguration(config: Partial<MinerConfig>): Promise<void>;
  getConfiguration(): Promise<MinerConfig>;
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
 * 任务统计
 */
export interface TaskStatistics {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageExecutionTime: number;
  successRate: number;
  totalExecutionTime: number;
}

/**
 * 收益统计
 */
export interface EarningsStatistics {
  totalEarnings: number;
  totalTasks: number;
  averageEarningPerTask: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  earningsByType: Record<string, number>;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  tasksPerHour: number;
  averageTaskTime: number;
  successRate: number;
  errorRate: number;
  uptimePercentage: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

/**
 * 运行时间统计
 */
export interface UptimeStatistics {
  totalUptime: number;
  uptimePercentage: number;
  lastStartTime: Date;
  downtimeEvents: Array<{
    start: Date;
    end: Date;
    duration: number;
    reason?: string;
  }>;
}

/**
 * 趋势分析
 */
export interface TrendAnalysis {
  period: TimePeriod;
  taskTrend: TrendData;
  earningsTrend: TrendData;
  performanceTrend: TrendData;
  predictions: {
    nextPeriodTasks: number;
    nextPeriodEarnings: number;
    confidence: number;
  };
}

/**
 * 趋势数据
 */
export interface TrendData {
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  averageValue: number;
}

/**
 * 时间周期
 */
export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * 报告类型
 */
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * 报告选项
 */
export interface ReportOptions {
  dateFrom?: Date;
  dateTo?: Date;
  includeCharts?: boolean;
  includeDetails?: boolean;
  format?: 'json' | 'csv' | 'pdf';
}

/**
 * 矿工报告
 */
export interface MinerReport {
  type: ReportType;
  period: {
    from: Date;
    to: Date;
  };
  summary: ModelOfMiner<'Summary'>;
  statistics: {
    tasks: TaskStatistics;
    earnings: EarningsStatistics;
    performance: PerformanceMetrics;
  };
  trends: TrendAnalysis;
  recommendations: string[];
  generatedAt: Date;
}

/**
 * 矿工状态
 */
export interface MinerStatus {
  isRunning: boolean;
  currentTask?: string;
  uptime: number;
  tasksCompleted: number;
  totalEarnings: number;
  lastActivity: Date;
  health: 'healthy' | 'warning' | 'error';
  errors: string[];
}

/**
 * 矿工配置
 */
export interface MinerConfig {
  maxRetries: number;
  retryDelay: number;
  staleTaskThreshold: number;
  defaultPageSize: number;
  enableAutoCleanup: boolean;
  cleanupInterval: number;
  maxConcurrentTasks: number;
  taskTimeout: number;
  enableMetrics: boolean;
  metricsInterval: number;
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

/**
 * 矿工错误类
 */
export class MinerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'MinerError';
  }
}
