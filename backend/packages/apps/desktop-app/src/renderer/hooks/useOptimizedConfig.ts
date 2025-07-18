/**
 * 性能优化的配置管理 Hook
 * 
 * 提供缓存、防抖、批量更新等性能优化功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getElectronAPI } from '../utils/electron-api';

// 保持向后兼容的本地函数（已废弃，使用utils中的版本）
const getElectronAPILocal = () => {
  // 首先尝试通过window对象访问（推荐方式）
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }

  // 在浏览器环境中，返回模拟的API接口
  if (typeof window !== 'undefined' && !window.require) {
    return {
      invoke: async (channel: string, ...args: any[]) => {
        // 返回模拟的配置数据
        switch (channel) {
          case 'read-device-config':
            return {
              success: true,
              data: {
                deviceId: 'mock-device-id',
                deviceName: 'Mock Device',
                isRegistered: false
              }
            };
          case 'get-app-settings':
            return {
              success: true,
              data: {
                theme: 'light',
                language: 'en',
                autoStart: false
              }
            };
          case 'get-system-info':
            return {
              success: true,
              data: {
                platform: 'mock',
                arch: 'x64',
                version: '1.0.0'
              }
            };
          case 'get-all-config':
            return {
              success: true,
              data: {
                device: { deviceId: 'mock-device-id' },
                app: { theme: 'light' },
                system: { platform: 'mock' }
              }
            };
          default:
            return { success: false, error: 'Unknown channel' };
        }
      },
      readDeviceConfig: async () => {
        return {
          success: true,
          data: {
            deviceId: 'mock-device-id',
            deviceName: 'Mock Device',
            isRegistered: false
          }
        };
      },
      getSystemInfo: async () => {
        return {
          success: true,
          data: {
            platform: 'mock',
            arch: 'x64',
            version: '1.0.0'
          }
        };
      }
    };
  }

  // 如果在Node.js环境中，返回null（避免直接require electron）
  console.warn('Electron API not available, using mock data');
  return null;
};

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

      // 获取Electron API
      const electronAPI = getElectronAPI();

      if (electronAPI) {
        // 根据配置键选择不同的获取方法
        switch (configKey) {
          case 'device':
            if (electronAPI.readDeviceConfig) {
              result = await electronAPI.readDeviceConfig();
            } else {
              result = await electronAPI.invoke('read-device-config');
            }
            break;
          case 'app':
            if (electronAPI.getAppSettings) {
              result = await electronAPI.getAppSettings();
            } else {
              result = await electronAPI.invoke('get-app-settings');
            }
            break;
          case 'all':
            if (electronAPI.getAllConfig) {
              result = await electronAPI.getAllConfig();
            } else {
              result = await electronAPI.invoke('get-all-config');
            }
            break;
          case 'system':
            if (electronAPI.getSystemInfo) {
              result = await electronAPI.getSystemInfo();
            } else {
              result = await electronAPI.invoke('get-system-info');
            }
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
