/**
 * 命令执行接口 
 * 只包含命令执行相关操作
 */
export interface ICommandExecutor {
  execute(command: string, args: string[]): Promise<CommandResult>;
  validateCommand(command: string): boolean;
  getCommandHelp(command: string): CommandHelp;
  listAvailableCommands(): CommandInfo[];
}

/**
 * 直接服务访问接口 
 * 直接使用libs模块服务，不通过HTTP API
 */
export interface IDirectServiceAccess {
  // 模型相关服务
  getModelService(): Promise<any>;
  getFrameworkManagerService(): Promise<any>;
  getFrameworkSwitchService(): Promise<any>;
  getDynamicModelConfigService(): Promise<any>;
  getDeviceStatusService(): Promise<any>;
  getMinerService(): Promise<any>;
  getTaskSyncService(): Promise<any>;
  getModelReportingService(): Promise<any>;

  // 健康检查
  checkServicesHealth(): Promise<ServicesHealthStatus>;
}

/**
 * 进程管理接口 
 * 只包含进程管理相关操作
 */
export interface IProcessManager {
  startDaemon(): Promise<ProcessResult>;
  stopDaemon(): Promise<ProcessResult>;
  getStatus(): Promise<ProcessStatus>;
  isRunning(): Promise<boolean>;
  restart(): Promise<ProcessResult>;
  kill(signal?: string): Promise<ProcessResult>;
}

/**
 * 用户界面接口 
 * 只包含用户界面相关操作
 */
export interface IUserInterface {
  showMessage(message: string, type: MessageType): void;
  showTable(data: TableData): void;
  showSpinner(text: string): ISpinner;
  prompt(questions: PromptQuestion[]): Promise<any>;
  showBox(title: string, content: string, type: BoxType): void;
  clear(): void;
  showKeyValue(key: string, value: string): void;
  showSubtitle(subtitle: string): void;
  showTitle(title: string): void;
  select(message: string, choices: Array<string | { name: string; value: any }>): Promise<any>;
  input(message: string, defaultValue?: string): Promise<string>;
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
  success(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  info(message: string): void;
  showList(items: string[]): void;
}

/**
 * 配置管理接口 
 * 只包含配置管理相关操作
 */
export interface IConfigManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  getAll(): Promise<Record<string, any>>;
  save(): Promise<void>;
  load(): Promise<void>;
}

/**
 * 存储管理接口 
 * 只包含本地存储相关操作
 */
export interface IStorageManager {
  saveRegistration(info: RegistrationInfo): Promise<void>;
  loadRegistration(): Promise<RegistrationInfo | null>;
  clearRegistration(): Promise<void>;
  saveModelReport(report: ModelReport): Promise<void>;
  loadModelReport(): Promise<ModelReport | null>;
  getReportedModels(): Promise<ModelReport[]>;
  getStoragePath(): string;
  ensureStorageExists(): Promise<void>;
  getStorageStats(): Promise<{
    path: string;
    exists: boolean;
    size: number;
    files: string[];
    lastModified?: Date;
  }>;
}

/**
 * CLI健康检查接口 
 * 只包含健康检查相关操作
 */
export interface ICliHealth {
  checkHealth(): Promise<CliHealthResult>;
  checkApiConnection(): Promise<boolean>;
  checkProcessStatus(): Promise<boolean>;
  checkStorageAccess(): Promise<boolean>;
  performDiagnostics(): Promise<DiagnosticsResult>;
}

/**
 * 完整的CLI服务接口 - 组合所有子接口
 * 保持向后兼容性，但使用直接服务访问
 */
export interface ICliService extends
  ICommandExecutor,
  IDirectServiceAccess,
  IProcessManager,
  IUserInterface,
  IConfigManager,
  IStorageManager,
  ICliHealth {

  // 向后兼容的方法
  register(options: RegisterOptions): Promise<CommandResult>;
  unregister(): Promise<CommandResult>;
  getDeviceStatus(): Promise<CommandResult>;
  listModels(): Promise<CommandResult>;
  reportModels(models: string[]): Promise<CommandResult>;
}

/**
 * 命令结果
 */
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  timestamp: string;
  duration?: number;
}

/**
 * 命令帮助信息
 */
export interface CommandHelp {
  command: string;
  description: string;
  usage: string;
  options: Array<{
    flag: string;
    description: string;
    required?: boolean;
    default?: any;
  }>;
  examples: string[];
}

/**
 * 命令信息
 */
export interface CommandInfo {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
}

/**
 * 服务健康状态
 */
export interface ServicesHealthStatus {
  isHealthy: boolean;
  services: {
    modelInference: boolean;
    deviceStatus: boolean;
    miner: boolean;
    taskSync: boolean;
    modelReporting: boolean;
    persistent: boolean;
  };
  lastCheck: Date;
}

/**
 * 进程结果
 */
export interface ProcessResult {
  success: boolean;
  message: string;
  pid?: number;
  error?: string;
}

/**
 * 进程状态
 */
export interface ProcessStatus {
  isRunning: boolean;
  pid?: number;
  startTime?: Date;
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * 消息类型
 */
export enum MessageType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * 盒子类型
 */
export enum BoxType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * 表格数据
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  title?: string;
}

/**
 * 加载动画接口
 */
export interface ISpinner {
  start(): void;
  stop(): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  warn(text?: string): void;
  info(text?: string): void;
}

/**
 * 提示问题
 */
export interface PromptQuestion {
  type: 'input' | 'confirm' | 'list' | 'checkbox' | 'password';
  name: string;
  message: string;
  choices?: Array<string | { name: string; value: any }>;
  default?: any;
  validate?: (input: any) => boolean | string;
}

/**
 * 注册信息
 */
export interface RegistrationInfo {
  deviceId: string;
  deviceName: string;
  gatewayAddress: string;
  rewardAddress: string;
  isRegistered: boolean;
  timestamp: string;
}

/**
 * 模型报告
 */
export interface ModelReport {
  models: string[];
  reportedAt: string;
  success: boolean;
  errors?: string[];
}

/**
 * 注册选项
 */
export interface RegisterOptions {
  code?: string;
  gatewayAddress?: string;
  rewardAddress?: string;
  key?: string;
  basePath?: string;
}

/**
 * CLI健康结果
 */
export interface CliHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    apiClient: boolean;
    processManager: boolean;
    storageManager: boolean;
    configManager: boolean;
  };
  issues: string[];
  lastCheck: Date;
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
  recommendations: string[];
}

/**
 * CLI事件
 */
export interface CliEvents {
  commandExecuted: (command: string, result: CommandResult) => void;
  apiRequestMade: (endpoint: string, method: string) => void;
  processStarted: (pid: number) => void;
  processStopped: (reason: string) => void;
  configChanged: (key: string, value: any) => void;
  errorOccurred: (error: Error, context: string) => void;
}

/**
 * CLI配置
 */
export interface CliConfig {
  apiBaseUrl: string;
  timeout: number;
  retries: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableColors: boolean;
  enableSpinners: boolean;
  storagePath: string;
  pidFilePath: string;
  lockFilePath: string;
}

/**
 * CLI错误类
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * 命令类别
 */
export enum CommandCategory {
  DEVICE = 'device',
  MODEL = 'model',
  PROCESS = 'process',
  FRAMEWORK = 'framework',
  SYSTEM = 'system'
}
