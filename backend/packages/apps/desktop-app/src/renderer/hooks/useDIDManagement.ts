/**
 * DID Management专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责DID管理页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供DID管理特定的接口
 */

import { useMemo, useCallback } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, BaseHookReturn, FetchConfig, DIDManagementData } from './types';
import { DIDManagementDataService } from '../services';

/**
 * DID Management页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns DID管理数据和操作方法
 */
export function useDIDManagement(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<DIDManagementData> & {
  // 扩展的DID管理特定方法
  exportDIDDocument: () => Promise<void>;
  copyDIDToClipboard: () => Promise<boolean>;
  exportPrivateKey: () => Promise<void>;
  togglePrivateKeyVisibility: () => void;
  copyToClipboard: (text: string) => Promise<boolean>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new DIDManagementDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据
  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 30000, // 30秒刷新一次
    retryCount: 3,
    timeout: 10000,
    ...config
  });

  // 导出DID文档
  const exportDIDDocument = useCallback(async (): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      // 这里可以调用导出DID文档的API
      const didDocument = {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: baseHook.data.didInfo.did,
        controller: baseHook.data.didInfo.controller,
        created: baseHook.data.didInfo.created,
        verificationMethod: [],
        authentication: [],
        assertionMethod: []
      };

      // 创建下载链接
      const blob = new Blob([JSON.stringify(didDocument, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'did-document.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('DID document exported successfully');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to export DID document');
    }
  }, [dataService, baseHook.data]);

  // 复制DID到剪贴板
  const copyDIDToClipboard = useCallback(async (): Promise<boolean> => {
    if (!baseHook.data) {
      return false;
    }

    return await copyToClipboard(baseHook.data.didInfo.did);
  }, [baseHook.data]);

  // 导出私钥（危险操作）
  const exportPrivateKey = useCallback(async (): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      // 显示确认对话框
      const confirmed = window.confirm(
        'WARNING: Exporting your private key is extremely dangerous!\n\n' +
        'Anyone with access to your private key can control your DID and all associated assets.\n\n' +
        'Only proceed if you fully understand the security implications.\n\n' +
        'Do you want to continue?'
      );

      if (!confirmed) {
        return;
      }

      // 这里可以调用导出私钥的API
      const privateKey = baseHook.data.gatewaySettings.privateKey;
      
      // 创建下载链接
      const blob = new Blob([privateKey], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'private-key.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Private key exported successfully');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to export private key');
    }
  }, [dataService, baseHook.data]);

  // 切换私钥可见性
  const togglePrivateKeyVisibility = useCallback((): void => {
    if (!dataService) {
      return;
    }

    // 这里可以调用切换私钥可见性的API
    // 目前先在本地状态中处理
    console.log('Toggle private key visibility');
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

  return {
    ...baseHook,
    exportDIDDocument,
    copyDIDToClipboard,
    exportPrivateKey,
    togglePrivateKeyVisibility,
    copyToClipboard
  };
}

/**
 * DID Management工具函数
 */
export const didManagementUtils = {
  /**
   * 格式化DID显示
   */
  formatDID: (did: string): string => {
    if (!did || did.length <= 30) return did;
    return `${did.substring(0, 20)}...${did.substring(did.length - 10)}`;
  },

  /**
   * 格式化控制器地址显示
   */
  formatController: (controller: string): string => {
    if (!controller || controller.length <= 20) return controller;
    return `${controller.substring(0, 8)}...${controller.substring(controller.length - 4)}`;
  },

  /**
   * 格式化日期显示
   */
  formatDate: (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  },

  /**
   * 获取状态颜色
   */
  getStatusColor: (status: 'active' | 'inactive' | 'pending'): { bg: string; text: string; icon: string } => {
    switch (status) {
      case 'active':
        return {
          bg: '#C7FACE',
          text: '#306339',
          icon: 'check-circle'
        };
      case 'pending':
        return {
          bg: '#FFF1B8',
          text: '#88451D',
          icon: 'clock'
        };
      case 'inactive':
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
   * 验证DID格式
   */
  isValidDID: (did: string): boolean => {
    const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
    return didRegex.test(did);
  },

  /**
   * 掩码私钥显示
   */
  maskPrivateKey: (privateKey: string, visible: boolean): string => {
    if (visible) {
      return privateKey;
    }
    return '••••••••••';
  }
};

/**
 * DID Management常量定义
 */
export const DID_MANAGEMENT_CONSTANTS = {
  // 刷新间隔（毫秒）
  REFRESH_INTERVAL: 30000,
  
  // 重试次数
  RETRY_COUNT: 3,
  
  // 请求超时（毫秒）
  TIMEOUT: 10000,
  
  // 复制成功消息显示时间
  COPY_SUCCESS_DURATION: 2000,
  
  // DID状态
  DID_STATUS: {
    ACTIVE: 'active' as const,
    INACTIVE: 'inactive' as const,
    PENDING: 'pending' as const
  },
  
  // 验证状态
  VERIFICATION_STATUS: {
    VALID: 'valid' as const,
    INVALID: 'invalid' as const,
    PENDING: 'pending' as const
  }
} as const;

/**
 * DID Management类型守卫
 */
export const isDIDManagementData = (data: any): data is DIDManagementData => {
  return (
    data &&
    typeof data === 'object' &&
    data.didInfo &&
    typeof data.didInfo === 'object' &&
    data.didOperations &&
    typeof data.didOperations === 'object' &&
    data.gatewaySettings &&
    typeof data.gatewaySettings === 'object' &&
    data.verificationStatus &&
    typeof data.verificationStatus === 'object'
  );
};

/**
 * DID Management错误类型
 */
export class DIDManagementError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DIDManagementError';
  }
}

/**
 * DID Management错误代码
 */
export const DID_MANAGEMENT_ERROR_CODES = {
  EXPORT_FAILED: 'EXPORT_FAILED',
  COPY_FAILED: 'COPY_FAILED',
  PRIVATE_KEY_ACCESS_DENIED: 'PRIVATE_KEY_ACCESS_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED'
} as const;
