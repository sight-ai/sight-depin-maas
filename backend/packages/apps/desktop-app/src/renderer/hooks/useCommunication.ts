/**
 * Communication专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责通信页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供通信特定的接口
 */

import { useMemo, useCallback } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, BaseHookReturn, FetchConfig, CommunicationData } from './types';
import { CommunicationDataService } from '../services/dataServices';

/**
 * Communication页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns 通信数据和操作方法
 */
export function useCommunication(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<CommunicationData> & {
  // 扩展的通信特定方法
  toggleLibP2PService: () => Promise<void>;
  sendTestMessage: (message: string) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
  updateNetworkConfig: (config: Partial<CommunicationData['networkConfig']>) => Promise<void>;
  toggleNetworkSetting: (setting: 'enableDHT' | 'enableRelay', value: boolean) => Promise<void>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new CommunicationDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据
  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 10000, // 10秒刷新一次
    retryCount: 3,
    timeout: 10000,
    ...config
  });

  // 切换LibP2P服务状态
  const toggleLibP2PService = useCallback(async (): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      const newStatus = !baseHook.data.serviceStatus.libp2pService;
      const response = await dataService.update({
        serviceStatus: {
          ...baseHook.data.serviceStatus,
          libp2pService: newStatus,
          serviceStatus: newStatus ? 'running' : 'stopped'
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle LibP2P service');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 发送测试消息
  const sendTestMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!dataService) {
      throw new Error('Data service not available');
    }

    try {
      // 这里可以调用发送测试消息的API
      // 目前先模拟成功
      console.log('Sending test message:', message);
      return true;
    } catch (error) {
      console.error('Failed to send test message:', error);
      return false;
    }
  }, [dataService]);

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

  // 更新网络配置
  const updateNetworkConfig = useCallback(async (config: Partial<CommunicationData['networkConfig']>): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      const response = await dataService.update({
        networkConfig: {
          ...baseHook.data.networkConfig,
          ...config
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update network config');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 切换网络设置
  const toggleNetworkSetting = useCallback(async (setting: 'enableDHT' | 'enableRelay', value: boolean): Promise<void> => {
    await updateNetworkConfig({ [setting]: value });
  }, [updateNetworkConfig]);

  return {
    ...baseHook,
    toggleLibP2PService,
    sendTestMessage,
    copyToClipboard,
    updateNetworkConfig,
    toggleNetworkSetting
  };
}

/**
 * Communication工具函数
 */
export const communicationUtils = {
  /**
   * 格式化Peer ID显示
   */
  formatPeerId: (peerId: string): string => {
    if (!peerId || peerId.length <= 20) return peerId;
    return `${peerId.substring(0, 12)}...`;
  },

  /**
   * 格式化延迟显示
   */
  formatLatency: (latency: number): string => {
    return `${latency} ms`;
  },

  /**
   * 获取连接状态颜色
   */
  getConnectionStatusColor: (status: 'connected' | 'unstable' | 'disconnected'): { bg: string; text: string; icon: string } => {
    switch (status) {
      case 'connected':
        return {
          bg: '#C7FACE',
          text: '#306339',
          icon: 'check-circle'
        };
      case 'unstable':
        return {
          bg: '#FFF1B8',
          text: '#88451D',
          icon: 'alert-circle'
        };
      case 'disconnected':
        return {
          bg: '#FEF2F2',
          text: '#EF4444',
          icon: 'x-circle'
        };
      default:
        return {
          bg: '#F9FAFB',
          text: '#6B7280',
          icon: 'help-circle'
        };
    }
  },

  /**
   * 获取服务状态文本
   */
  getServiceStatusText: (isRunning: boolean): string => {
    return isRunning ? 'Running' : 'Stopped';
  },

  /**
   * 验证端口号
   */
  isValidPort: (port: string): boolean => {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  },

  /**
   * 验证最大连接数
   */
  isValidMaxConnections: (connections: string): boolean => {
    const num = parseInt(connections, 10);
    return !isNaN(num) && num >= 1 && num <= 1000;
  },

  /**
   * 格式化监听地址
   */
  formatListeningAddress: (address: string): string => {
    if (!address) return 'Not configured';
    return address;
  }
};

/**
 * Communication常量定义
 */
export const COMMUNICATION_CONSTANTS = {
  // 刷新间隔（毫秒）
  REFRESH_INTERVAL: 10000,
  
  // 重试次数
  RETRY_COUNT: 3,
  
  // 请求超时（毫秒）
  TIMEOUT: 10000,
  
  // 复制成功消息显示时间
  COPY_SUCCESS_DURATION: 2000,
  
  // 默认端口
  DEFAULT_PORT: '4001',
  
  // 默认最大连接数
  DEFAULT_MAX_CONNECTIONS: '100',
  
  // 连接状态
  CONNECTION_STATUS: {
    CONNECTED: 'connected' as const,
    UNSTABLE: 'unstable' as const,
    DISCONNECTED: 'disconnected' as const
  },
  
  // 服务状态
  SERVICE_STATUS: {
    RUNNING: 'running' as const,
    STOPPED: 'stopped' as const
  }
} as const;

/**
 * Communication类型守卫
 */
export const isCommunicationData = (data: any): data is CommunicationData => {
  return (
    data &&
    typeof data === 'object' &&
    data.serviceStatus &&
    typeof data.serviceStatus === 'object' &&
    data.peerInfo &&
    typeof data.peerInfo === 'object' &&
    Array.isArray(data.connectedPeers) &&
    data.networkConfig &&
    typeof data.networkConfig === 'object'
  );
};

/**
 * Communication错误类型
 */
export class CommunicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'CommunicationError';
  }
}

/**
 * Communication错误代码
 */
export const COMMUNICATION_ERROR_CODES = {
  SERVICE_TOGGLE_FAILED: 'SERVICE_TOGGLE_FAILED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  CONFIG_UPDATE_FAILED: 'CONFIG_UPDATE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED'
} as const;
