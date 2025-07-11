/**
 * Earnings专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责收益页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供收益特定的接口
 */

import { useMemo, useCallback } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, EarningsData, BaseHookReturn, FetchConfig } from './types';
import { EarningsDataService } from '../services';

/**
 * Earnings页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns 收益数据和操作方法
 */
export function useEarnings(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<EarningsData> & {
  // 扩展的收益特定方法
  claimEarnings: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status: 'paid' | 'pending' | 'failed') => string;
  copyToClipboard: (text: string) => Promise<boolean>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new EarningsDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据
  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 30000, // 30秒刷新一次
    retryCount: 3,
    timeout: 10000,
    ...config
  });

  // 提取收益方法
  const claimEarnings = useCallback(async (): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      // 调用新的claimEarnings方法
      const response = await (dataService as any).claimEarnings();

      if (!response.success) {
        throw new Error(response.error || 'Failed to claim earnings');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 格式化货币显示
  const formatCurrency = useCallback((amount: number): string => {
    return `$${amount.toFixed(2)}`;
  }, []);

  // 格式化日期显示
  const formatDate = useCallback((date: string): string => {
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return date;
    }
  }, []);

  // 获取状态颜色
  const getStatusColor = useCallback((status: 'paid' | 'pending' | 'failed'): string => {
    switch (status) {
      case 'paid':
        return '#10B981'; // 绿色
      case 'pending':
        return '#F59E0B'; // 黄色
      case 'failed':
        return '#EF4444'; // 红色
      default:
        return '#6B7280'; // 灰色
    }
  }, []);

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

  return {
    ...baseHook,
    claimEarnings,
    formatCurrency,
    formatDate,
    getStatusColor,
    copyToClipboard
  };
}

/**
 * Earnings工具函数
 */
export const earningsUtils = {
  /**
   * 格式化货币显示
   */
  formatCurrency: (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  },

  /**
   * 格式化百分比
   */
  formatPercentage: (value: number): string => {
    return `${value.toFixed(1)}%`;
  },

  /**
   * 格式化地址显示
   */
  formatAddress: (address: string): string => {
    if (!address || address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  },

  /**
   * 计算收益增长率
   */
  calculateGrowthRate: (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * 获取状态文本
   */
  getStatusText: (status: 'paid' | 'pending' | 'failed'): string => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  },

  /**
   * 获取状态颜色
   */
  getStatusColor: (status: 'paid' | 'pending' | 'failed'): { bg: string; text: string; border: string } => {
    switch (status) {
      case 'paid':
        return {
          bg: '#ECFDF5',
          text: '#10B981',
          border: '#A7F3D0'
        };
      case 'pending':
        return {
          bg: '#FFFBEB',
          text: '#F59E0B',
          border: '#FDE68A'
        };
      case 'failed':
        return {
          bg: '#FEF2F2',
          text: '#EF4444',
          border: '#FECACA'
        };
      default:
        return {
          bg: '#F9FAFB',
          text: '#6B7280',
          border: '#E5E7EB'
        };
    }
  },

  /**
   * 验证钱包地址格式
   */
  isValidWalletAddress: (address: string): boolean => {
    // 简单的以太坊地址验证
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * 计算预估Gas费用
   */
  estimateGasFee: (network: string): string => {
    switch (network.toLowerCase()) {
      case 'ethereum mainnet':
        return '0.002 ETH';
      case 'polygon':
        return '0.001 MATIC';
      case 'bsc':
        return '0.0005 BNB';
      default:
        return '0.001 ETH';
    }
  }
};

/**
 * Earnings常量定义
 */
export const EARNINGS_CONSTANTS = {
  // 刷新间隔（毫秒）
  REFRESH_INTERVAL: 30000,
  
  // 重试次数
  RETRY_COUNT: 3,
  
  // 请求超时（毫秒）
  TIMEOUT: 10000,
  
  // 最小提取金额
  MIN_CLAIM_AMOUNT: 0.01,
  
  // 复制成功消息显示时间
  COPY_SUCCESS_DURATION: 2000,
  
  // 状态颜色
  STATUS_COLORS: {
    PAID: '#10B981',
    PENDING: '#F59E0B',
    FAILED: '#EF4444'
  },
  
  // 网络配置
  NETWORKS: {
    ETHEREUM: 'Ethereum Mainnet',
    POLYGON: 'Polygon',
    BSC: 'Binance Smart Chain'
  },
  
  // 表格列配置
  TABLE_COLUMNS: [
    { key: 'date', label: 'Date', width: '120px' },
    { key: 'taskType', label: 'Task Type', width: '150px' },
    { key: 'model', label: 'Model', width: '120px' },
    { key: 'duration', label: 'Duration', width: '100px' },
    { key: 'amount', label: 'Amount', width: '100px' },
    { key: 'status', label: 'Status', width: '80px' }
  ]
} as const;

/**
 * Earnings类型守卫
 */
export const isEarningsData = (data: any): data is EarningsData => {
  return (
    data &&
    typeof data === 'object' &&
    data.currentBalance &&
    typeof data.currentBalance === 'object' &&
    data.claimInfo &&
    typeof data.claimInfo === 'object' &&
    Array.isArray(data.earningsHistory)
  );
};

/**
 * Earnings错误类型
 */
export class EarningsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'EarningsError';
  }
}

/**
 * Earnings错误代码
 */
export const EARNINGS_ERROR_CODES = {
  CLAIM_FAILED: 'CLAIM_FAILED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED'
} as const;
