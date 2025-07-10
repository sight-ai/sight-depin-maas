/**
 * Gateway Configuration专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责网关配置页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供网关配置特定的接口
 */

import { useMemo, useCallback } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, BaseHookReturn, FetchConfig, GatewayConfigData } from './types';
import { GatewayConfigDataService } from '../services/dataServices';

/**
 * Gateway Configuration页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns 网关配置数据和操作方法
 */
export function useGatewayConfig(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<GatewayConfigData> & {
  // 扩展的网关配置特定方法
  updateSettings: (settings: Partial<GatewayConfigData['gatewaySettings']>) => Promise<void>;
  copyToClipboard: (text: string) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  refreshConnectionStatus: () => Promise<void>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new GatewayConfigDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据
  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 30000, // 30秒刷新一次
    retryCount: 3,
    timeout: 10000,
    ...config
  });

  // 更新设置方法
  const updateSettings = useCallback(async (settings: Partial<GatewayConfigData['gatewaySettings']>): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      const updatedData: Partial<GatewayConfigData> = {
        gatewaySettings: {
          ...baseHook.data.gatewaySettings,
          ...settings
        }
      };

      const response = await dataService.update(updatedData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update settings');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 复制到剪贴板方法
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  // 测试连接方法
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!dataService) {
      throw new Error('Data service not available');
    }

    try {
      // 这里可以调用测试连接的API
      // 目前先模拟成功
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, [dataService]);

  // 刷新连接状态方法
  const refreshConnectionStatus = useCallback(async (): Promise<void> => {
    await baseHook.refresh();
  }, [baseHook]);

  return {
    ...baseHook,
    updateSettings,
    copyToClipboard,
    testConnection,
    refreshConnectionStatus
  };
}

/**
 * Gateway Configuration工具函数
 */
export const gatewayConfigUtils = {
  /**
   * 格式化延迟显示
   */
  formatLatency: (latency: number): string => {
    return `${latency}ms`;
  },

  /**
   * 格式化注册码显示
   */
  formatRegistrationCode: (code: string): string => {
    if (!code || code.length <= 8) return code;
    return `${code.substring(0, 6)}...${code.substring(code.length - 6)}`;
  },

  /**
   * 验证注册码格式
   */
  isValidRegistrationCode: (code: string): boolean => {
    // 简单的注册码验证
    return /^[A-Z0-9]{12}$/.test(code);
  },

  /**
   * 获取环境颜色
   */
  getEnvironmentColor: (environment: string): { bg: string; text: string } => {
    switch (environment.toLowerCase()) {
      case 'production':
        return {
          bg: '#ECFDF5',
          text: '#10B981'
        };
      case 'staging':
        return {
          bg: '#FFFBEB',
          text: '#F59E0B'
        };
      case 'development':
        return {
          bg: '#EFF6FF',
          text: '#3B82F6'
        };
      default:
        return {
          bg: '#F9FAFB',
          text: '#6B7280'
        };
    }
  },

  /**
   * 获取延迟状态颜色
   */
  getLatencyColor: (latency: number): string => {
    if (latency < 50) return '#10B981'; // 绿色 - 良好
    if (latency < 100) return '#F59E0B'; // 黄色 - 一般
    return '#EF4444'; // 红色 - 较差
  },

  /**
   * 格式化网关地址
   */
  formatGatewayAddress: (address: string): string => {
    if (!address) return 'Not configured';
    return address.replace(/^https?:\/\//, '');
  }
};

/**
 * Gateway Configuration常量定义
 */
export const GATEWAY_CONFIG_CONSTANTS = {
  // 刷新间隔（毫秒）
  REFRESH_INTERVAL: 30000,
  
  // 重试次数
  RETRY_COUNT: 3,
  
  // 请求超时（毫秒）
  TIMEOUT: 10000,
  
  // 复制成功消息显示时间
  COPY_SUCCESS_DURATION: 2000,
  
  // 连接测试超时
  CONNECTION_TEST_TIMEOUT: 5000,
  
  // 默认网关地址
  DEFAULT_GATEWAY: 'gateway.sightai.com',
  
  // 环境类型
  ENVIRONMENTS: {
    PRODUCTION: 'Production',
    STAGING: 'Staging',
    DEVELOPMENT: 'Development'
  },
  
  // 延迟阈值
  LATENCY_THRESHOLDS: {
    GOOD: 50,
    FAIR: 100,
    POOR: 200
  }
} as const;

/**
 * Gateway Configuration类型守卫
 */
export const isGatewayConfigData = (data: any): data is GatewayConfigData => {
  return (
    data &&
    typeof data === 'object' &&
    data.connectionStatus &&
    typeof data.connectionStatus === 'object' &&
    data.gatewaySettings &&
    typeof data.gatewaySettings === 'object'
  );
};

/**
 * Gateway Configuration错误类型
 */
export class GatewayConfigError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'GatewayConfigError';
  }
}

/**
 * Gateway Configuration错误代码
 */
export const GATEWAY_CONFIG_ERROR_CODES = {
  UPDATE_FAILED: 'UPDATE_FAILED',
  CONNECTION_TEST_FAILED: 'CONNECTION_TEST_FAILED',
  INVALID_REGISTRATION_CODE: 'INVALID_REGISTRATION_CODE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED'
} as const;
