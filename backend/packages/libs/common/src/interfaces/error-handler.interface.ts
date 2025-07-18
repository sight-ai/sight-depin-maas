/**
 * 错误处理接口 - 遵循依赖倒置原则
 * 
 * 定义统一的错误处理抽象，让具体实现依赖于抽象而非具体类
 */

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 错误分析结果
 */
export interface ErrorAnalysisResult {
  type: string;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  suggestions: string[];
  context?: Record<string, any>;
  timestamp: string;
}

/**
 * 错误恢复策略
 */
export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  recoveryActions: string[];
  estimatedRecoveryTime?: number;
  requiresUserAction: boolean;
}

/**
 * 错误处理器接口
 * 
 * 职责：
 * 1. 分析错误类型和严重程度
 * 2. 提供用户友好的错误信息
 * 3. 建议恢复策略
 * 4. 遵循单一职责原则
 */
export interface IErrorHandler {
  /**
   * 分析错误并返回结构化信息
   */
  analyzeError(error: Error | string, context?: Record<string, any>): ErrorAnalysisResult;

  /**
   * 获取错误恢复策略
   */
  getRecoveryStrategy(errorType: string, context?: Record<string, any>): ErrorRecoveryStrategy;

  /**
   * 检查错误是否可以自动恢复
   */
  canAutoRecover(errorType: string): boolean;

  /**
   * 格式化错误信息供用户显示
   */
  formatUserMessage(analysis: ErrorAnalysisResult): string;
}

/**
 * 错误报告器接口
 * 
 * 职责：
 * 1. 记录错误信息
 * 2. 发送错误报告
 * 3. 遵循单一职责原则
 */
export interface IErrorReporter {
  /**
   * 报告错误
   */
  reportError(analysis: ErrorAnalysisResult, context?: Record<string, any>): Promise<void>;

  /**
   * 批量报告错误
   */
  reportErrors(analyses: ErrorAnalysisResult[]): Promise<void>;

  /**
   * 获取错误统计
   */
  getErrorStatistics(timeRange?: { start: Date; end: Date }): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
  }>;
}

/**
 * 错误恢复器接口
 * 
 * 职责：
 * 1. 执行错误恢复操作
 * 2. 监控恢复进度
 * 3. 遵循单一职责原则
 */
export interface IErrorRecovery {
  /**
   * 尝试自动恢复
   */
  attemptAutoRecovery(errorType: string, context?: Record<string, any>): Promise<{
    success: boolean;
    message: string;
    nextSteps?: string[];
  }>;

  /**
   * 执行手动恢复步骤
   */
  executeRecoveryStep(step: string, context?: Record<string, any>): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * 验证恢复是否成功
   */
  validateRecovery(errorType: string, context?: Record<string, any>): Promise<boolean>;
}

/**
 * 统一错误管理器接口
 * 
 * 职责：
 * 1. 协调错误处理、报告和恢复
 * 2. 提供统一的错误管理入口
 * 3. 遵循依赖倒置原则
 */
export interface IErrorManager {
  /**
   * 处理错误（分析 + 报告 + 恢复）
   */
  handleError(error: Error | string, context?: Record<string, any>): Promise<{
    analysis: ErrorAnalysisResult;
    recoveryAttempted: boolean;
    recoverySuccess?: boolean;
    userMessage: string;
  }>;

  /**
   * 注册错误处理器
   */
  registerHandler(errorType: string, handler: IErrorHandler): void;

  /**
   * 注册错误恢复器
   */
  registerRecovery(errorType: string, recovery: IErrorRecovery): void;

  /**
   * 获取错误处理统计
   */
  getHandlingStatistics(): Promise<{
    totalHandled: number;
    autoRecoveryRate: number;
    averageResolutionTime: number;
    topErrorTypes: Array<{ type: string; count: number }>;
  }>;
}

/**
 * 错误处理配置
 */
export interface ErrorHandlingConfig {
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  recoveryTimeout: number;
  reportingEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retryDelays: number[];
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  handled: boolean;
  analysis: ErrorAnalysisResult;
  recoveryAttempted: boolean;
  recoverySuccess?: boolean;
  recovery?: {
    attempted: boolean;
    success: boolean;
    message: string;
  };
  userMessage: string;
  nextSteps: string[];
}

/**
 * 错误模式定义
 */
export interface ErrorPattern {
  pattern: RegExp | string;
  type: string;
  severity: ErrorSeverity;
  handler?: string; // 处理器名称
  recovery?: string; // 恢复器名称
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  service: string;
  operation: string;
  userId?: string;
  deviceId?: string;
  timestamp: string;
  environment: string;
  version: string;
  additionalData?: Record<string, any>;
}
