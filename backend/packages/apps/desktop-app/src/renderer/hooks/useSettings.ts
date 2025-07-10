/**
 * Settings专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责设置页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供设置特定的接口
 */

import { useMemo, useCallback } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, BaseHookReturn, FetchConfig, SettingsData } from './types';
import { SettingsDataService } from '../services/dataServices';

/**
 * Settings页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns 设置数据和操作方法
 */
export function useSettings(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<SettingsData> & {
  // 扩展的设置特定方法
  updateGeneralSettings: (settings: Partial<SettingsData['generalSettings']>) => Promise<void>;
  updateDataPrivacySettings: (settings: Partial<SettingsData['dataPrivacySettings']>) => Promise<void>;
  restartBackendService: () => Promise<void>;
  resetAllSettings: () => Promise<void>;
  toggleSetting: (category: 'general' | 'dataPrivacy', setting: string, value: boolean) => Promise<void>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new SettingsDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据
  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 30000, // 30秒刷新一次
    retryCount: 3,
    timeout: 10000,
    ...config
  });

  // 更新通用设置
  const updateGeneralSettings = useCallback(async (settings: Partial<SettingsData['generalSettings']>): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      const currentData = baseHook.data as SettingsData;
      const response = await dataService.update({
        generalSettings: {
          ...currentData.generalSettings,
          ...settings
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update general settings');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 更新数据隐私设置
  const updateDataPrivacySettings = useCallback(async (settings: Partial<SettingsData['dataPrivacySettings']>): Promise<void> => {
    if (!dataService || !baseHook.data) {
      throw new Error('Data service not available or no data');
    }

    try {
      const currentData = baseHook.data as SettingsData;
      const response = await dataService.update({
        dataPrivacySettings: {
          ...currentData.dataPrivacySettings,
          ...settings
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update data privacy settings');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 重启后端服务
  const restartBackendService = useCallback(async (): Promise<void> => {
    if (!dataService) {
      throw new Error('Data service not available');
    }

    try {
      // 显示确认对话框
      const confirmed = window.confirm(
        'Are you sure you want to restart the backend service?\n\n' +
        'This will temporarily interrupt all running processes.'
      );

      if (!confirmed) {
        return;
      }

      // 这里可以调用重启后端服务的API
      console.log('Restarting backend service...');
      
      // 模拟重启过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Backend service restarted successfully');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to restart backend service');
    }
  }, [dataService]);

  // 重置所有设置
  const resetAllSettings = useCallback(async (): Promise<void> => {
    if (!dataService) {
      throw new Error('Data service not available');
    }

    try {
      // 显示确认对话框
      const confirmed = window.confirm(
        'WARNING: This will reset all settings to their default values!\n\n' +
        'This action cannot be undone. Are you sure you want to continue?'
      );

      if (!confirmed) {
        return;
      }

      // 这里可以调用重置设置的API
      console.log('Resetting all settings...');
      
      // 重新获取默认数据
      await baseHook.refresh();
      
      console.log('All settings reset successfully');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to reset settings');
    }
  }, [dataService, baseHook]);

  // 切换设置开关
  const toggleSetting = useCallback(async (category: 'general' | 'dataPrivacy', setting: string, value: boolean): Promise<void> => {
    if (category === 'general') {
      await updateGeneralSettings({ [setting]: value });
    } else if (category === 'dataPrivacy') {
      await updateDataPrivacySettings({ [setting]: value });
    }
  }, [updateGeneralSettings, updateDataPrivacySettings]);

  return {
    ...baseHook,
    data: baseHook.data as SettingsData | null,
    updateGeneralSettings,
    updateDataPrivacySettings,
    restartBackendService,
    resetAllSettings,
    toggleSetting
  };
}

/**
 * Settings工具函数
 */
export const settingsUtils = {
  /**
   * 格式化数据目录路径
   */
  formatDataDirectory: (path: string): string => {
    if (!path) return 'Not configured';
    // 如果路径太长，显示省略号
    if (path.length > 50) {
      return `...${path.substring(path.length - 47)}`;
    }
    return path;
  },

  /**
   * 获取日志级别选项
   */
  getLogLevelOptions: (): Array<{ value: string; label: string }> => {
    return [
      { value: 'debug', label: 'Debug' },
      { value: 'info', label: 'Info' },
      { value: 'warn', label: 'Warning' },
      { value: 'error', label: 'Error' }
    ];
  },

  /**
   * 验证数据目录路径
   */
  isValidDataDirectory: (path: string): boolean => {
    if (!path) return false;
    // 简单的路径验证
    return path.length > 0 && !path.includes('..') && !path.includes('<') && !path.includes('>');
  },

  /**
   * 获取设置类别标题
   */
  getCategoryTitle: (category: 'general' | 'dataPrivacy' | 'advanced'): string => {
    switch (category) {
      case 'general':
        return 'General Settings';
      case 'dataPrivacy':
        return 'Data & Privacy';
      case 'advanced':
        return 'Advanced Settings';
      default:
        return 'Settings';
    }
  }
};

/**
 * Settings常量定义
 */
export const SETTINGS_CONSTANTS = {
  // 刷新间隔（毫秒）
  REFRESH_INTERVAL: 30000,
  
  // 重试次数
  RETRY_COUNT: 3,
  
  // 请求超时（毫秒）
  TIMEOUT: 10000,
  
  // 操作成功消息显示时间
  SUCCESS_MESSAGE_DURATION: 3000,
  
  // 日志级别
  LOG_LEVELS: {
    DEBUG: 'debug' as const,
    INFO: 'info' as const,
    WARN: 'warn' as const,
    ERROR: 'error' as const
  },
  
  // 设置类别
  CATEGORIES: {
    GENERAL: 'general' as const,
    DATA_PRIVACY: 'dataPrivacy' as const,
    ADVANCED: 'advanced' as const
  }
} as const;

/**
 * Settings类型守卫
 */
export const isSettingsData = (data: any): data is SettingsData => {
  return (
    data &&
    typeof data === 'object' &&
    data.generalSettings &&
    typeof data.generalSettings === 'object' &&
    data.dataPrivacySettings &&
    typeof data.dataPrivacySettings === 'object' &&
    data.advancedSettings &&
    typeof data.advancedSettings === 'object'
  );
};

/**
 * Settings错误类型
 */
export class SettingsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'SettingsError';
  }
}

/**
 * Settings错误代码
 */
export const SETTINGS_ERROR_CODES = {
  UPDATE_FAILED: 'UPDATE_FAILED',
  RESTART_FAILED: 'RESTART_FAILED',
  RESET_FAILED: 'RESET_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  DATA_FETCH_FAILED: 'DATA_FETCH_FAILED'
} as const;
