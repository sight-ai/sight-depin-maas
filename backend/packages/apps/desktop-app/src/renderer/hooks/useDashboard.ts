/**
 * Dashboard专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责Dashboard页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供Dashboard特定的接口
 */

import { useMemo } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, DashboardData, BaseHookReturn, FetchConfig } from './types';
import { DashboardDataService } from '../services';

/**
 * Dashboard页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns Dashboard数据和操作方法
 */
export function useDashboard(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<DashboardData> & {
  // 扩展的Dashboard特定方法
  refreshSystemMetrics: () => Promise<void>;
  refreshServices: () => Promise<void>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new DashboardDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据 - 优化刷新频率
  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 10000, // 10秒刷新一次，避免过于频繁的请求
    retryCount: 3,
    timeout: 15000, // 增加超时时间以适应多个API并行请求
    ...config
  });

  // 扩展方法：刷新系统指标
  const refreshSystemMetrics = async (): Promise<void> => {
    // 这里可以实现特定的系统指标刷新逻辑
    await baseHook.refresh();
  };

  // 扩展方法：刷新服务状态
  const refreshServices = async (): Promise<void> => {
    // 这里可以实现特定的服务状态刷新逻辑
    await baseHook.refresh();
  };

  return {
    ...baseHook,
    refreshSystemMetrics,
    refreshServices
  };
}

/**
 * Dashboard数据格式化工具函数
 */
export const dashboardUtils = {
  /**
   * 格式化运行时间
   */
  formatUptime: (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  },

  /**
   * 格式化系统状态
   */
  formatSystemStatus: (isOnline: boolean, port?: number): { status: string; port: string } => {
    return {
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      port: port?.toString() || '8761'
    };
  },

  /**
   * 格式化收益数据
   */
  formatEarnings: (amount: number): string => {
    return `$ ${amount.toFixed(2)}`;
  },

  /**
   * 格式化百分比
   */
  formatPercentage: (value: number): string => {
    return `${Math.round(value)}%`;
  },

  /**
   * 格式化温度
   */
  formatTemperature: (celsius: number): string => {
    return `${Math.round(celsius)}°C`;
  },

  /**
   * 获取服务状态颜色
   */
  getServiceStatusColor: (status: 'online' | 'offline' | 'warning'): string => {
    switch (status) {
      case 'online':
        return '#191717';
      case 'warning':
        return '#F59E0B';
      case 'offline':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  },

  /**
   * 获取服务状态文本
   */
  getServiceStatusText: (status: 'online' | 'offline' | 'warning'): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'warning':
        return 'Warning';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  },

  /**
   * 获取进度条颜色
   */
  getProgressBarColor: (type: 'cpu' | 'memory' | 'gpu' | 'temperature'): string => {
    switch (type) {
      case 'cpu':
        return '#000000';
      case 'memory':
        return '#6D20F5';
      case 'gpu':
        return '#E7337A';
      case 'temperature':
        return '#F7D046';
      default:
        return '#6B7280';
    }
  },

  /**
   * 获取资源类型描述
   */
  getResourceDescription: (type: 'cpu' | 'memory' | 'gpu' | 'temperature'): string => {
    switch (type) {
      case 'cpu':
        return 'Neural Processing Unit';
      case 'memory':
        return 'Data Storage Buffer';
      case 'gpu':
        return 'Graphics Rendering Unit';
      case 'temperature':
        return 'Thermal Management';
      default:
        return 'System Resource';
    }
  }
};

/**
 * Dashboard常量定义
 */
export const DASHBOARD_CONSTANTS = {
  // 刷新间隔（毫秒）- 优化为10秒
  REFRESH_INTERVAL: 10000,

  // 重试次数
  RETRY_COUNT: 3,

  // 请求超时（毫秒）- 增加超时时间
  TIMEOUT: 15000,

  // 默认端口
  DEFAULT_PORT: '8761',

  // 默认版本
  DEFAULT_VERSION: 'v0.9.3 Beta',

  // 进度条动画持续时间（毫秒）
  PROGRESS_ANIMATION_DURATION: 300,

  // 卡片阴影样式
  CARD_SHADOW: '0px 0px 24.8px 0px rgba(198, 198, 198, 0.51)',

  // 主容器阴影样式
  CONTAINER_SHADOW: '0px 0px 42.4px 7px rgba(237, 237, 237, 1)'
} as const;

/**
 * Dashboard类型守卫
 */
export const isDashboardData = (data: any): data is DashboardData => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.systemStatus === 'string' &&
    typeof data.systemPort === 'string' &&
    typeof data.version === 'string' &&
    typeof data.uptime === 'string' &&
    data.earnings &&
    typeof data.earnings === 'object' &&
    data.systemMetrics &&
    typeof data.systemMetrics === 'object' &&
    Array.isArray(data.services)
  );
};

/**
 * Dashboard错误类型
 */
export class DashboardError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}

/**
 * Dashboard错误代码
 */
export const DASHBOARD_ERROR_CODES = {
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
} as const;
