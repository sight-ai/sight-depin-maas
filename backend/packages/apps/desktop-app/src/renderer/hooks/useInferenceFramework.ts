/**
 * 推理框架管理Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责推理框架的状态管理和切换
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供框架管理特定的接口
 */

import { useState, useCallback, useEffect } from 'react';
import { createApiClient, handleApiError } from '../utils/api-client';
import { cachedFetch } from '../utils/api-request-manager';
import { BackendStatus } from './types';

export interface FrameworkInfo {
  id: 'ollama' | 'vllm';
  name: string;
  version: string;
  status: 'Running' | 'Stopped' | 'Unknown';
  modelsLoaded: number;
  memoryUsage: string;
  gpuUsage: string;
}

export interface UseInferenceFrameworkReturn {
  currentFramework: FrameworkInfo;
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;
  switchFramework: (targetFramework: 'ollama' | 'vllm') => Promise<void>;
  refreshFrameworkStatus: () => Promise<void>;
  clearError: () => void;
}

export const useInferenceFramework = (
  backendStatus: BackendStatus | null
): UseInferenceFrameworkReturn => {
  const [currentFramework, setCurrentFramework] = useState<FrameworkInfo>({
    id: 'ollama',
    name: 'Ollama',
    version: 'Loading...',
    status: 'Stopped',
    modelsLoaded: 0,
    memoryUsage: '0 GB',
    gpuUsage: '0%'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // API 客户端实例
  const apiClient = backendStatus?.isRunning ? createApiClient(backendStatus) : null;

  // 获取框架状态
  const fetchFrameworkStatus = useCallback(async () => {
    if (!apiClient) return;

    // 防抖：如果距离上次请求不到5秒，则跳过
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      return;
    }
    setLastFetchTime(now);

    try {
      // 使用缓存请求获取应用状态
      const statusUrl = `http://localhost:${backendStatus?.port}/api/app/status`;
      const statusResponse = await cachedFetch(statusUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, {
        cacheTime: 10000, // 10秒缓存
        debounceTime: 2000 // 2秒防抖
      });

      const typedStatusResponse = statusResponse as any;
      if (typedStatusResponse.success && typedStatusResponse.data) {
        const statusData = typedStatusResponse.data as any;
        const frameworkId = statusData.framework.type || 'ollama';

        // 获取框架详细状态
        let frameworkInfo: FrameworkInfo = {
          id: frameworkId,
          name: frameworkId === 'ollama' ? 'Ollama' : 'vLLM',
          version: statusData.framework.version,
          status: statusData.framework.isReady,
          modelsLoaded: statusData.framework.models.length,
          memoryUsage: '0 GB',
          gpuUsage: '0%'
        };

        // 尝试获取框架特定的状态信息
        try {
          if (frameworkId === 'ollama') {
            // 检查Ollama健康状态
            const healthUrl = `http://localhost:${backendStatus?.port}/ollama/api/version`;
            const healthResponse = await cachedFetch(healthUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            }, {
              cacheTime: 5000, // 5秒缓存
              debounceTime: 1000 // 1秒防抖
            });

            const typedHealthResponse = healthResponse as any;
            frameworkInfo.status = 'Running';
            frameworkInfo.version = typedHealthResponse.data?.version || 'Latest';
          } else if (frameworkId === 'vllm') {
            // 检查Ollama健康状态
            const healthUrl = `http://localhost:${backendStatus?.port}/openai/version`;
            const healthResponse = await cachedFetch(healthUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            }, {
              cacheTime: 5000, // 5秒缓存
              debounceTime: 1000 // 1秒防抖
            });

            const typedHealthResponse = healthResponse as any;
            frameworkInfo.status = 'Running';
            frameworkInfo.version = typedHealthResponse.data?.version || 'Latest';
          }
        } catch (healthError) {
          console.warn('Failed to get framework health status:', healthError);
          frameworkInfo.status = 'Stopped';
        }

        setCurrentFramework(frameworkInfo);
        setError(null);
      }
    } catch (error) {
      console.error('Failed to fetch framework status:', error);
      setError(handleApiError(error));
    }
  }, [apiClient]);

  // 切换推理框架
  const switchFramework = useCallback(async (targetFramework: 'ollama' | 'vllm') => {
    if (!apiClient) {
      setError('Backend service is not running');
      return;
    }

    if (currentFramework.id === targetFramework) {
      return; // 已经是目标框架，无需切换
    }

    setIsSwitching(true);
    setError(null);

    try {
      // 使用缓存请求进行框架切换
      const switchUrl = `http://localhost:${backendStatus!.port}/api/app/switch-framework`;
      const result: any = await cachedFetch(switchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ framework: targetFramework }),
      }, {
        cacheTime: 0, // 不缓存切换请求
        debounceTime: 0 // 不防抖切换请求
      });

      if (result.success) {
        // 切换成功后重新获取状态
        setTimeout(() => {
          fetchFrameworkStatus();
        }, 1000); // 延迟1秒获取状态，确保切换完成

        // 显示成功消息
        const frameworkName = targetFramework === 'ollama' ? 'Ollama' : 'vLLM';
        console.log(`Successfully switched to ${frameworkName}`);
      } else {
        setError(result.error || `Failed to switch to ${targetFramework}`);
      }
    } catch (err) {
      console.error('Framework switch error:', err);
      setError(`Failed to switch to ${targetFramework}`);
    } finally {
      setIsSwitching(false);
    }
  }, [backendStatus?.port, currentFramework.id, fetchFrameworkStatus]);

  // 刷新框架状态
  const refreshFrameworkStatus = useCallback(async () => {
    if (!apiClient) return;

    setIsLoading(true);
    setError(null);

    try {
      await fetchFrameworkStatus();
    } catch (error) {
      console.error('Failed to refresh framework status:', error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, fetchFrameworkStatus]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初始化数据
  useEffect(() => {
    if (backendStatus?.isRunning && apiClient) {
      // 延迟初始化，避免立即触发
      const timer = setTimeout(() => {
        refreshFrameworkStatus();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [backendStatus?.isRunning]);

  // 定期刷新状态（独立的effect，避免依赖循环）
  useEffect(() => {
    if (!backendStatus?.isRunning) return;

    const interval = setInterval(() => {
      if (backendStatus?.isRunning) {
        fetchFrameworkStatus();
      }
    }, 60000); // 60秒刷新一次

    return () => clearInterval(interval);
  }, [backendStatus?.isRunning]);

  return {
    currentFramework,
    isLoading,
    isSwitching,
    error,
    switchFramework,
    refreshFrameworkStatus,
    clearError
  };
};
