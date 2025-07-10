/**
 * 基础数据Hook
 * 
 * 遵循单一职责原则，提供通用的数据获取和状态管理功能
 * 实现依赖倒置原则，通过抽象接口进行数据交互
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  IDataService, 
  LoadingState, 
  FetchConfig, 
  BaseHookReturn,
  IErrorHandler 
} from './types';

/**
 * 错误处理器实现
 */
class ErrorHandler implements IErrorHandler {
  handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  }

  async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // 指数退避策略
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

/**
 * 基础数据Hook
 * 
 * @param dataService 数据服务实例
 * @param initialConfig 初始配置
 * @returns Hook返回值
 */
export function useBaseData<T>(
  dataService: IDataService<T> | null,
  initialConfig: FetchConfig = {}
): BaseHookReturn<T> {
  // 状态管理
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    error: null,
    lastUpdated: null
  });
  const [config, setConfig] = useState<FetchConfig>({
    autoRefresh: false,
    refreshInterval: 30000, // 30秒
    retryCount: 3,
    timeout: 10000, // 10秒
    ...initialConfig
  });

  // 引用管理
  const errorHandler = useRef(new ErrorHandler());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 清理定时器
   */
  const clearRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  /**
   * 取消正在进行的请求
   */
  const cancelOngoingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * 获取数据
   */
  const fetchData = useCallback(async (): Promise<void> => {
    if (!dataService) {
      setLoading(prev => ({
        ...prev,
        error: 'Data service not available'
      }));
      return;
    }

    // 取消之前的请求
    cancelOngoingRequest();

    // 创建新的AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // 使用错误处理器进行重试
      const response = await errorHandler.current.retryOperation(
        () => dataService.fetch(),
        config.retryCount
      );

      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        return;
      }

      if (response.success && response.data) {
        setData(response.data);
        setLoading(prev => ({
          ...prev,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
      } else {
        throw new Error(response.error || 'Failed to fetch data');
      }
    } catch (error) {
      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        return;
      }

      const errorMessage = errorHandler.current.handleError(error);
      setLoading(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    } finally {
      // 清理AbortController引用
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [dataService, config.retryCount, cancelOngoingRequest]);

  /**
   * 刷新数据
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  /**
   * 重置状态
   */
  const reset = useCallback((): void => {
    cancelOngoingRequest();
    clearRefreshInterval();
    setData(null);
    setLoading({
      isLoading: false,
      error: null,
      lastUpdated: null
    });
  }, [cancelOngoingRequest, clearRefreshInterval]);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((newConfig: Partial<FetchConfig>): void => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * 设置自动刷新
   */
  useEffect(() => {
    if (config.autoRefresh && config.refreshInterval && dataService) {
      clearRefreshInterval();
      refreshIntervalRef.current = setInterval(() => {
        fetchData();
      }, config.refreshInterval);
    } else {
      clearRefreshInterval();
    }

    return clearRefreshInterval;
  }, [config.autoRefresh, config.refreshInterval, dataService, fetchData, clearRefreshInterval]);

  /**
   * 初始数据获取
   */
  useEffect(() => {
    if (dataService) {
      fetchData();
    }

    // 清理函数
    return () => {
      cancelOngoingRequest();
      clearRefreshInterval();
    };
  }, [dataService]); // 只依赖dataService，避免无限循环

  return {
    data,
    loading,
    refresh,
    reset,
    config,
    updateConfig
  };
}
