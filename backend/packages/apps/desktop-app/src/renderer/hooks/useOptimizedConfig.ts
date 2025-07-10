/**
 * 性能优化的配置管理 Hook
 * 
 * 提供缓存、防抖、批量更新等性能优化功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface ConfigCache {
  data: any;
  timestamp: number;
  ttl: number;
}

interface UseOptimizedConfigOptions {
  cacheTimeout?: number; // 缓存超时时间（毫秒）
  debounceDelay?: number; // 防抖延迟（毫秒）
  enableCache?: boolean; // 是否启用缓存
  enableDebounce?: boolean; // 是否启用防抖
}

interface UseOptimizedConfigReturn<T> {
  data: T | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<T>) => Promise<boolean>;
  clearCache: () => void;
  getCacheStats: () => { size: number; hitRate: number };
}

export function useOptimizedConfig<T = any>(
  configKey: string,
  options: UseOptimizedConfigOptions = {}
): UseOptimizedConfigReturn<T> {
  const {
    cacheTimeout = 30000, // 30秒默认缓存
    debounceDelay = 500, // 500ms 防抖
    enableCache = true,
    enableDebounce = true
  } = options;

  // 状态管理
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 缓存和防抖引用
  const cacheRef = useRef<Map<string, ConfigCache>>(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsRef = useRef({ requests: 0, cacheHits: 0 });

  // 获取缓存数据
  const getCachedData = useCallback((key: string): T | null => {
    if (!enableCache) return null;

    const cached = cacheRef.current.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      cacheRef.current.delete(key);
      return null;
    }

    statsRef.current.cacheHits++;
    return cached.data;
  }, [enableCache]);

  // 设置缓存数据
  const setCachedData = useCallback((key: string, value: T, ttl: number = cacheTimeout) => {
    if (!enableCache) return;

    cacheRef.current.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
  }, [enableCache, cacheTimeout]);

  // 加载配置
  const loadConfig = useCallback(async () => {
    if (isLoading) return;

    statsRef.current.requests++;

    // 检查缓存
    const cachedData = getCachedData(configKey);
    if (cachedData) {
      setData(cachedData);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result: any = null;

      // 根据配置键选择不同的获取方法
      if (window.electronAPI) {
        switch (configKey) {
          case 'device':
            result = await window.electronAPI.readDeviceConfig();
            break;
          case 'app':
            result = await (window.electronAPI as any).getAppSettings?.();
            break;
          case 'all':
            result = await (window.electronAPI as any).getAllConfig?.();
            break;
          case 'system':
            result = await window.electronAPI.getSystemInfo();
            break;
          default:
            throw new Error(`Unknown config key: ${configKey}`);
        }
      }

      if (result?.success && result.data) {
        const configData = result.data as T;
        setData(configData);
        setCachedData(configKey, configData);
      } else {
        throw new Error(result?.error || 'Failed to load config');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`Failed to load config ${configKey}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [configKey, isLoading, getCachedData, setCachedData]);

  // 更新配置
  const updateConfig = useCallback(async (updates: Partial<T>): Promise<boolean> => {
    if (isUpdating) return false;

    return new Promise<boolean>((resolve) => {
      const performUpdate = async () => {
        setIsUpdating(true);
        setError(null);

        try {
          let result: any = null;

          if (window.electronAPI) {
            switch (configKey) {
              case 'device':
                result = await (window.electronAPI as any).updateDeviceConfig?.(updates);
                break;
              case 'app':
                result = await (window.electronAPI as any).updateAppSettings?.(updates);
                break;
              default:
                throw new Error(`Update not supported for config key: ${configKey}`);
            }
          }

          if (result?.success) {
            // 清除缓存，强制重新加载
            cacheRef.current.delete(configKey);
            await loadConfig();
            resolve(true);
          } else {
            throw new Error(result?.error || 'Failed to update config');
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          console.error(`Failed to update config ${configKey}:`, err);
          resolve(false);
        } finally {
          setIsUpdating(false);
        }
      };

      if (enableDebounce) {
        // 清除之前的定时器
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // 设置新的防抖定时器
        debounceTimeoutRef.current = setTimeout(performUpdate, debounceDelay);
      } else {
        performUpdate();
      }
    });
  }, [configKey, isUpdating, enableDebounce, debounceDelay, loadConfig]);

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = { requests: 0, cacheHits: 0 };
  }, []);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    const { requests, cacheHits } = statsRef.current;
    return {
      size: cacheRef.current.size,
      hitRate: requests > 0 ? (cacheHits / requests) * 100 : 0
    };
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    isUpdating,
    error,
    loadConfig,
    updateConfig,
    clearCache,
    getCacheStats
  };
}

// 预定义的配置 Hook
export const useDeviceConfig = (options?: UseOptimizedConfigOptions) => 
  useOptimizedConfig('device', options);

export const useAppConfig = (options?: UseOptimizedConfigOptions) => 
  useOptimizedConfig('app', options);

export const useSystemInfo = (options?: UseOptimizedConfigOptions) => 
  useOptimizedConfig('system', { ...options, enableDebounce: false });

export const useAllConfig = (options?: UseOptimizedConfigOptions) => 
  useOptimizedConfig('all', options);
