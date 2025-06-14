import { Injectable, Logger } from '@nestjs/common';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  CONFIGURATION = 'CONFIGURATION',
  TIMEOUT = 'TIMEOUT'
}

/**
 * 标准化错误接口
 */
export interface StandardError {
  type: ErrorType;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * 操作结果接口
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: StandardError;
  timestamp: string;
}

/**
 * 统一错误处理服务 
 * 只负责错误的标准化处理和格式化
 */
@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * 创建标准化错误
   */
  createError(
    type: ErrorType,
    code: string,
    message: string,
    details?: any,
    context?: Record<string, any>
  ): StandardError {
    return {
      type,
      code,
      message,
      details,
      context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 从异常创建标准化错误
   */
  fromException(error: any, context?: Record<string, any>): StandardError {
    const type = this.determineErrorType(error);
    const code = this.extractErrorCode(error);
    const message = this.extractErrorMessage(error);
    const details = this.extractErrorDetails(error);

    const standardError: StandardError = {
      type,
      code,
      message,
      details,
      context,
      timestamp: new Date().toISOString()
    };

    // 在开发环境中包含堆栈信息
    if (process.env['NODE_ENV'] === 'development' && error.stack) {
      standardError.stack = error.stack;
    }

    return standardError;
  }

  /**
   * 创建成功的操作结果
   */
  createSuccessResult<T>(data: T): OperationResult<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 创建失败的操作结果
   */
  createErrorResult(error: StandardError): OperationResult {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 从异常创建失败的操作结果
   */
  createErrorResultFromException(error: any, context?: Record<string, any>): OperationResult {
    const standardError = this.fromException(error, context);
    return this.createErrorResult(standardError);
  }

  /**
   * 记录错误日志
   */
  logError(error: StandardError, additionalContext?: Record<string, any>): void {
    const logContext = {
      ...error.context,
      ...additionalContext,
      errorType: error.type,
      errorCode: error.code
    };

    switch (error.type) {
      case ErrorType.VALIDATION:
      case ErrorType.NOT_FOUND:
        this.logger.warn(error.message, logContext);
        break;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        this.logger.warn(`Security issue: ${error.message}`, logContext);
        break;
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
      case ErrorType.EXTERNAL_SERVICE:
        this.logger.error(`External service issue: ${error.message}`, logContext);
        break;
      case ErrorType.CONFIGURATION:
        this.logger.error(`Configuration issue: ${error.message}`, logContext);
        break;
      default:
        this.logger.error(error.message, logContext);
    }
  }

  /**
   * 确定错误类型
   */
  private determineErrorType(error: any): ErrorType {
    // HTTP错误
    if (error.response?.status) {
      const status = error.response.status;
      if (status === 400) return ErrorType.VALIDATION;
      if (status === 401) return ErrorType.AUTHENTICATION;
      if (status === 403) return ErrorType.AUTHORIZATION;
      if (status === 404) return ErrorType.NOT_FOUND;
      if (status === 409) return ErrorType.CONFLICT;
      if (status >= 500) return ErrorType.EXTERNAL_SERVICE;
    }

    // 网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return ErrorType.NETWORK;
    }

    // 超时错误
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }

    // 验证错误
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return ErrorType.VALIDATION;
    }

    // 配置错误
    if (error.message?.includes('config') || error.message?.includes('environment')) {
      return ErrorType.CONFIGURATION;
    }

    return ErrorType.INTERNAL;
  }

  /**
   * 提取错误代码
   */
  private extractErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.response?.status) return `HTTP_${error.response.status}`;
    if (error.name) return error.name.toUpperCase();
    return 'UNKNOWN_ERROR';
  }

  /**
   * 提取错误消息
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    if (error.message) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  }

  /**
   * 提取错误详情
   */
  private extractErrorDetails(error: any): any {
    const details: any = {};

    if (error.response) {
      details.httpStatus = error.response.status;
      details.httpStatusText = error.response.statusText;
      details.responseData = error.response.data;
    }

    if (error.config) {
      details.requestConfig = {
        method: error.config.method,
        url: error.config.url,
        timeout: error.config.timeout
      };
    }

    if (error.code) {
      details.errorCode = error.code;
    }

    return Object.keys(details).length > 0 ? details : undefined;
  }

  /**
   * 检查是否为可重试的错误
   */
  isRetryableError(error: StandardError): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.EXTERNAL_SERVICE
    ].includes(error.type);
  }

  /**
   * 检查是否为用户错误
   */
  isUserError(error: StandardError): boolean {
    return [
      ErrorType.VALIDATION,
      ErrorType.AUTHENTICATION,
      ErrorType.AUTHORIZATION,
      ErrorType.NOT_FOUND,
      ErrorType.CONFLICT
    ].includes(error.type);
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(error: StandardError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Network connection failed. Please check your internet connection and try again.';
      case ErrorType.TIMEOUT:
        return 'The operation timed out. Please try again later.';
      case ErrorType.EXTERNAL_SERVICE:
        return 'External service is temporarily unavailable. Please try again later.';
      case ErrorType.CONFIGURATION:
        return 'System configuration error. Please contact support.';
      case ErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your credentials.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorType.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorType.VALIDATION:
        return error.message; // 验证错误通常已经是用户友好的
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }
}
