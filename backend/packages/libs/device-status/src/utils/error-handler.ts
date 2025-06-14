import { Logger } from '@nestjs/common';

/**
 * 重试配置接口
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

/**
 * 错误处理工具类
 * 
 * 提供统一的错误处理和重试机制
 */
export class ErrorHandler {
  private readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * 带重试的异步操作执行
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // 如果不是第一次尝试，记录成功日志
        if (attempt > 1) {
          this.logger.log(`${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt, retryConfig);
          this.logger.warn(
            `${operationName} attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`
          );
          await this.delay(delay);
        }
      }
    }

    // 所有重试都失败了
    this.logger.error(`${operationName} failed after ${retryConfig.maxRetries} attempts: ${lastError?.message}`);
    throw lastError;
  }

  /**
   * 安全执行异步操作（不抛出异常）
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    defaultValue: T,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    try {
      return await this.withRetry(operation, operationName, config);
    } catch (error) {
      this.logger.error(`${operationName} failed completely: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return defaultValue;
    }
  }

  /**
   * 安全执行同步操作
   */
  safeExecuteSync<T>(
    operation: () => T,
    operationName: string,
    defaultValue: T
  ): T {
    try {
      return operation();
    } catch (error) {
      this.logger.error(`${operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return defaultValue;
    }
  }

  /**
   * 记录并返回错误
   */
  logAndReturnError(error: unknown, operationName: string): Error {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    this.logger.error(`${operationName} error: ${errorObj.message}`);
    return errorObj;
  }

  /**
   * 记录警告
   */
  logWarning(message: string, operationName?: string): void {
    const fullMessage = operationName ? `${operationName}: ${message}` : message;
    this.logger.warn(fullMessage);
  }

  /**
   * 记录信息
   */
  logInfo(message: string, operationName?: string): void {
    const fullMessage = operationName ? `${operationName}: ${message}` : message;
    this.logger.log(fullMessage);
  }

  /**
   * 记录调试信息
   */
  logDebug(message: string, operationName?: string): void {
    const fullMessage = operationName ? `${operationName}: ${message}` : message;
    this.logger.debug(fullMessage);
  }

  /**
   * 检查错误是否为网络错误
   */
  isNetworkError(error: Error): boolean {
    const networkErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    return networkErrorCodes.some(code => error.message.includes(code));
  }

  /**
   * 检查错误是否为超时错误
   */
  isTimeoutError(error: Error): boolean {
    return error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
  }

  /**
   * 检查错误是否可重试
   */
  isRetryableError(error: Error): boolean {
    return this.isNetworkError(error) || this.isTimeoutError(error);
  }

  /**
   * 格式化错误信息
   */
  formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    return String(error);
  }

  /**
   * 创建带上下文的错误
   */
  createContextualError(originalError: Error, context: string): Error {
    const contextualError = new Error(`${context}: ${originalError.message}`);
    contextualError.stack = originalError.stack;
    return contextualError;
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * 延迟工具方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建错误处理器的工厂函数
 */
export function createErrorHandler(loggerContext: string): ErrorHandler {
  return new ErrorHandler(loggerContext);
}

/**
 * 装饰器：为方法添加重试机制
 */
export function WithRetry(config: Partial<RetryConfig> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const errorHandler = new ErrorHandler(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      return errorHandler.withRetry(
        () => method.apply(this, args),
        propertyName,
        config
      );
    };
  };
}

/**
 * 装饰器：为方法添加安全执行（不抛出异常）
 */
export function SafeExecute<T>(defaultValue: T, config: Partial<RetryConfig> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const errorHandler = new ErrorHandler(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      return errorHandler.safeExecute(
        () => method.apply(this, args),
        propertyName,
        defaultValue,
        config
      );
    };
  };
}
