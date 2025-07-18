/**
 * 模型报告管理Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责模型报告相关的状态管理和操作
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供模型报告特定的接口
 */

import { useState, useCallback, useEffect } from 'react';
import { createApiClient, handleApiError } from '../utils/api-client';
import { cachedFetch } from '../utils/api-request-manager';
import { BackendStatus } from './types';
import { LocalModel } from '../components/model-reporting/ModelList';

interface ModelListResponse {
  success: boolean;
  framework: string;
  models: LocalModel[];
  total: number;
}

interface ModelReportResponse {
  success: boolean;
  message: string;
  reportedModels: string[];
}

export interface UseModelReportingReturn {
  localModels: LocalModel[];
  selectedModels: string[];
  buttonStates: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  isLoading: boolean;
  isReporting: boolean;
  reportingModel: string | null;
  error: string | null;
  toggleModel: (modelName: string) => void;
  reportModel: (modelName: string) => Promise<void>;
  reportAllModels: () => Promise<void>;
  refreshModels: (framework: string) => Promise<void>;
  clearError: () => void;
}

export const useModelReporting = (
  backendStatus: BackendStatus | null,
  currentFramework: string
): UseModelReportingReturn => {
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [buttonStates, setButtonStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportingModel, setReportingModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // API 客户端实例
  const apiClient = backendStatus?.isRunning ? createApiClient(backendStatus) : null;

  // 切换模型选择状态
  const toggleModel = useCallback((modelName: string) => {
    setSelectedModels(prev => 
      prev.includes(modelName)
        ? prev.filter(name => name !== modelName)
        : [...prev, modelName]
    );
  }, []);

  // 获取本地模型列表
  const fetchLocalModels = useCallback(async (framework: string) => {
    if (!apiClient || !backendStatus?.port) return;

    // 防抖：如果距离上次请求不到3秒，则跳过
    const now = Date.now();
    if (now - lastFetchTime < 3000) {
      return;
    }
    setLastFetchTime(now);

    setIsLoading(true);
    setError(null);

    try {
      // 使用缓存请求获取模型列表
      const modelsUrl = `http://localhost:${backendStatus.port}/api/v1/models/list`;
      const data: ModelListResponse = await cachedFetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }, {
        cacheTime: 15000, // 15秒缓存
        debounceTime: 2000 // 2秒防抖
      });

      if (data.success) {
        setLocalModels(data.models || []);
        // 重置按钮状态
        setButtonStates({});
        setSelectedModels([]);
        setError(null);
      } else {
        setError('Failed to fetch local models');
        setLocalModels([]);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      if (err instanceof Error) {
        setError(`Failed to load models: ${err.message}`);
      } else {
        setError('Failed to load models');
      }
      setLocalModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, backendStatus?.port, lastFetchTime]);

  // 报告单个模型
  const reportModel = useCallback(async (modelName: string) => {
    if (!apiClient || !backendStatus?.port) return;

    setButtonStates(prev => ({ ...prev, [modelName]: 'loading' }));
    setReportingModel(modelName);
    setError(null);

    try {
      const reportUrl = `http://localhost:${backendStatus.port}/api/v1/models/report`;
      const data: ModelReportResponse = await cachedFetch(reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models: [modelName] // 简化请求体，移除framework参数
        })
      }, {
        cacheTime: 0, // 不缓存报告请求
        debounceTime: 0 // 不防抖报告请求
      });

      if (data.success) {
        setButtonStates(prev => ({ ...prev, [modelName]: 'success' }));

        // 3秒后重置按钮状态
        setTimeout(() => {
          setButtonStates(prev => ({ ...prev, [modelName]: 'idle' }));
        }, 3000);
      } else {
        setButtonStates(prev => ({ ...prev, [modelName]: 'error' }));
        setError(data.message || 'Failed to report model');

        // 5秒后重置按钮状态
        setTimeout(() => {
          setButtonStates(prev => ({ ...prev, [modelName]: 'idle' }));
        }, 5000);
      }
    } catch (err) {
      console.error('Model report error:', err);
      setButtonStates(prev => ({ ...prev, [modelName]: 'error' }));

      if (err instanceof Error) {
        setError(`Failed to report model: ${err.message}`);
      } else {
        setError('Failed to report model');
      }

      // 5秒后重置按钮状态
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [modelName]: 'idle' }));
      }, 5000);
    } finally {
      setReportingModel(null);
    }
  }, [apiClient, backendStatus?.port]);

  // 报告所有选中的模型
  const reportAllModels = useCallback(async () => {
    if (!apiClient || !backendStatus?.port || selectedModels.length === 0) return;

    setIsReporting(true);
    setError(null);

    // 设置所有选中模型的状态为loading
    const loadingStates = selectedModels.reduce((acc, modelName) => {
      acc[modelName] = 'loading';
      return acc;
    }, {} as Record<string, 'idle' | 'loading' | 'success' | 'error'>);

    setButtonStates(prev => ({ ...prev, ...loadingStates }));

    try {
      const reportUrl = `http://localhost:${backendStatus.port}/api/v1/models/report`;
      const data: ModelReportResponse = await cachedFetch(reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models: selectedModels // 简化请求体
        })
      }, {
        cacheTime: 0, // 不缓存批量报告请求
        debounceTime: 0 // 不防抖批量报告请求
      });

      if (data.success) {
        // 设置所有选中模型的状态为success
        const successStates = selectedModels.reduce((acc, modelName) => {
          acc[modelName] = 'success';
          return acc;
        }, {} as Record<string, 'idle' | 'loading' | 'success' | 'error'>);
        
        setButtonStates(prev => ({ ...prev, ...successStates }));
        setSelectedModels([]); // 清空选择
        
        // 3秒后重置按钮状态
        setTimeout(() => {
          setButtonStates(prev => {
            const newStates = { ...prev };
            selectedModels.forEach(modelName => {
              newStates[modelName] = 'idle';
            });
            return newStates;
          });
        }, 3000);
      } else {
        // 设置所有选中模型的状态为error
        const errorStates = selectedModels.reduce((acc, modelName) => {
          acc[modelName] = 'error';
          return acc;
        }, {} as Record<string, 'idle' | 'loading' | 'success' | 'error'>);
        
        setButtonStates(prev => ({ ...prev, ...errorStates }));
        setError(data.message || 'Failed to report models');
        
        // 5秒后重置按钮状态
        setTimeout(() => {
          setButtonStates(prev => {
            const newStates = { ...prev };
            selectedModels.forEach(modelName => {
              newStates[modelName] = 'idle';
            });
            return newStates;
          });
        }, 5000);
      }
    } catch (err) {
      // 设置所有选中模型的状态为error
      const errorStates = selectedModels.reduce((acc, modelName) => {
        acc[modelName] = 'error';
        return acc;
      }, {} as Record<string, 'idle' | 'loading' | 'success' | 'error'>);
      
      setButtonStates(prev => ({ ...prev, ...errorStates }));
      setError(handleApiError(err));
      
      // 5秒后重置按钮状态
      setTimeout(() => {
        setButtonStates(prev => {
          const newStates = { ...prev };
          selectedModels.forEach(modelName => {
            newStates[modelName] = 'idle';
          });
          return newStates;
        });
      }, 5000);
    } finally {
      setIsReporting(false);
    }
  }, [apiClient, backendStatus?.port, currentFramework, selectedModels]);

  // 刷新模型列表
  const refreshModels = useCallback(async (framework: string) => {
    await fetchLocalModels(framework);
  }, [fetchLocalModels]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 当框架改变时，重新获取模型列表
  useEffect(() => {
    if (backendStatus?.isRunning && currentFramework) {
      // 延迟获取，避免立即触发
      const timer = setTimeout(() => {
        fetchLocalModels(currentFramework);
      }, 2000); // 增加延迟到2秒

      return () => clearTimeout(timer);
    }
  }, [currentFramework]); // 只依赖currentFramework，避免循环依赖

  return {
    localModels,
    selectedModels,
    buttonStates,
    isLoading,
    isReporting,
    reportingModel,
    error,
    toggleModel,
    reportModel,
    reportAllModels,
    refreshModels,
    clearError
  };
};
