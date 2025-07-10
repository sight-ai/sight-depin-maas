import { Injectable, Logger } from '@nestjs/common';
import {
  IErrorManager,
  IErrorHandler,
  IErrorReporter,
  IErrorRecovery,
  ErrorAnalysisResult,
  ErrorHandlingResult,
  ErrorSeverity,
  ErrorContext,
  ErrorHandlingConfig
} from '../interfaces/error-handler.interface';

/**
 * 统一错误管理器
 * 
 * 职责：
 * 1. 协调错误处理、报告和恢复
 * 2. 遵循依赖倒置原则 - 依赖抽象接口
 * 3. 遵循单一职责原则 - 只负责错误管理协调
 * 4. 遵循开闭原则 - 可扩展新的错误处理器
 */
@Injectable()
export class UnifiedErrorManager implements IErrorManager {
  private readonly logger = new Logger(UnifiedErrorManager.name);
  
  private readonly handlers = new Map<string, IErrorHandler>();
  private readonly recoveries = new Map<string, IErrorRecovery>();
  private readonly statistics = {
    totalHandled: 0,
    autoRecoveryAttempts: 0,
    autoRecoverySuccesses: 0,
    errorCounts: new Map<string, number>(),
    resolutionTimes: [] as number[]
  };

  constructor(
    private readonly config: ErrorHandlingConfig,
    private readonly reporter?: IErrorReporter
  ) {}

  /**
   * 处理错误（分析 + 报告 + 恢复）
   */
  async handleError(
    error: Error | string, 
    context?: Record<string, any>
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    
    try {
      // 1. 分析错误
      const analysis = this.analyzeError(error, context);
      
      // 2. 报告错误
      if (this.config.reportingEnabled && this.reporter) {
        await this.reporter.reportError(analysis, context);
      }

      // 3. 尝试恢复
      let recovery;
      if (this.config.enableAutoRecovery) {
        recovery = await this.attemptRecovery(analysis.type, context);
      }

      // 4. 更新统计
      this.updateStatistics(analysis, recovery, Date.now() - startTime);

      // 5. 生成用户消息
      const userMessage = this.generateUserMessage(analysis, recovery);
      const nextSteps = this.generateNextSteps(analysis, recovery);

      return {
        handled: true,
        analysis,
        recoveryAttempted: !!recovery?.attempted,
        recoverySuccess: recovery?.success,
        recovery,
        userMessage,
        nextSteps
      };

    } catch (handlingError) {
      this.logger.error('Error handling failed:', handlingError);
      
      return {
        handled: false,
        analysis: this.createFallbackAnalysis(error),
        recoveryAttempted: false,
        userMessage: '系统遇到了未知错误，请联系技术支持',
        nextSteps: ['重启应用', '检查日志', '联系技术支持']
      };
    }
  }

  /**
   * 注册错误处理器
   */
  registerHandler(errorType: string, handler: IErrorHandler): void {
    this.handlers.set(errorType, handler);
    this.logger.debug(`Registered error handler for type: ${errorType}`);
  }

  /**
   * 注册错误恢复器
   */
  registerRecovery(errorType: string, recovery: IErrorRecovery): void {
    this.recoveries.set(errorType, recovery);
    this.logger.debug(`Registered error recovery for type: ${errorType}`);
  }

  /**
   * 获取错误处理统计
   */
  async getHandlingStatistics(): Promise<{
    totalHandled: number;
    autoRecoveryRate: number;
    averageResolutionTime: number;
    topErrorTypes: Array<{ type: string; count: number }>;
  }> {
    const autoRecoveryRate = this.statistics.autoRecoveryAttempts > 0
      ? (this.statistics.autoRecoverySuccesses / this.statistics.autoRecoveryAttempts) * 100
      : 0;

    const averageResolutionTime = this.statistics.resolutionTimes.length > 0
      ? this.statistics.resolutionTimes.reduce((a, b) => a + b, 0) / this.statistics.resolutionTimes.length
      : 0;

    const topErrorTypes = Array.from(this.statistics.errorCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalHandled: this.statistics.totalHandled,
      autoRecoveryRate,
      averageResolutionTime,
      topErrorTypes
    };
  }

  /**
   * 分析错误
   */
  private analyzeError(error: Error | string, context?: Record<string, any>): ErrorAnalysisResult {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 尝试使用专门的处理器
    for (const [type, handler] of this.handlers) {
      try {
        const analysis = handler.analyzeError(error, context);
        if (analysis.type !== 'UNKNOWN_ERROR') {
          return analysis;
        }
      } catch (handlerError) {
        this.logger.warn(`Handler ${type} failed to analyze error:`, handlerError);
      }
    }

    // 使用默认分析
    return this.createDefaultAnalysis(errorMessage, errorStack, context);
  }

  /**
   * 尝试错误恢复
   */
  private async attemptRecovery(
    errorType: string, 
    context?: Record<string, any>
  ): Promise<{ attempted: boolean; success: boolean; message: string }> {
    this.statistics.autoRecoveryAttempts++;

    const recovery = this.recoveries.get(errorType);
    if (!recovery) {
      return {
        attempted: false,
        success: false,
        message: 'No recovery strategy available'
      };
    }

    try {
      const result = await recovery.attemptAutoRecovery(errorType, context);
      
      if (result.success) {
        this.statistics.autoRecoverySuccesses++;
      }

      return {
        attempted: true,
        success: result.success,
        message: result.message
      };

    } catch (recoveryError) {
      this.logger.error(`Recovery failed for ${errorType}:`, recoveryError);
      
      return {
        attempted: true,
        success: false,
        message: `Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 创建默认错误分析
   */
  private createDefaultAnalysis(
    message: string, 
    stack?: string, 
    context?: Record<string, any>
  ): ErrorAnalysisResult {
    return {
      type: 'UNKNOWN_ERROR',
      severity: ErrorSeverity.MEDIUM,
      userMessage: '系统遇到了未知错误',
      technicalMessage: message,
      suggestions: [
        '重试操作',
        '检查网络连接',
        '重启应用',
        '联系技术支持'
      ],
      context: {
        stack,
        ...context
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 创建回退错误分析
   */
  private createFallbackAnalysis(error: Error | string): ErrorAnalysisResult {
    const message = error instanceof Error ? error.message : error;
    
    return {
      type: 'SYSTEM_ERROR',
      severity: ErrorSeverity.HIGH,
      userMessage: '系统遇到了严重错误',
      technicalMessage: message,
      suggestions: ['重启应用', '联系技术支持'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成用户消息
   */
  private generateUserMessage(
    analysis: ErrorAnalysisResult, 
    recovery?: { attempted: boolean; success: boolean; message: string }
  ): string {
    let message = analysis.userMessage;

    if (recovery?.attempted) {
      if (recovery.success) {
        message += ' 系统已自动修复此问题。';
      } else {
        message += ' 自动修复失败，请手动处理。';
      }
    }

    return message;
  }

  /**
   * 生成下一步操作建议
   */
  private generateNextSteps(
    analysis: ErrorAnalysisResult,
    recovery?: { attempted: boolean; success: boolean; message: string }
  ): string[] {
    if (recovery?.success) {
      return ['问题已解决', '继续正常操作'];
    }

    return analysis.suggestions;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(
    analysis: ErrorAnalysisResult,
    recovery?: { attempted: boolean; success: boolean; message: string },
    resolutionTime?: number
  ): void {
    this.statistics.totalHandled++;
    
    const currentCount = this.statistics.errorCounts.get(analysis.type) || 0;
    this.statistics.errorCounts.set(analysis.type, currentCount + 1);

    if (resolutionTime !== undefined) {
      this.statistics.resolutionTimes.push(resolutionTime);
      
      // 保持最近1000条记录
      if (this.statistics.resolutionTimes.length > 1000) {
        this.statistics.resolutionTimes = this.statistics.resolutionTimes.slice(-1000);
      }
    }
  }

  /**
   * 清理统计数据
   */
  clearStatistics(): void {
    this.statistics.totalHandled = 0;
    this.statistics.autoRecoveryAttempts = 0;
    this.statistics.autoRecoverySuccesses = 0;
    this.statistics.errorCounts.clear();
    this.statistics.resolutionTimes = [];
  }

  /**
   * 获取已注册的处理器类型
   */
  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取已注册的恢复器类型
   */
  getRegisteredRecoveries(): string[] {
    return Array.from(this.recoveries.keys());
  }
}
