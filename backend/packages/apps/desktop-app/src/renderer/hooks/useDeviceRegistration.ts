/**
 * Device Registration专用Hook
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责设备注册页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供设备注册特定的接口
 */

import { useMemo, useCallback } from 'react';
import { useBaseData } from './useBaseData';
import { BackendStatus, DeviceRegistrationData, BaseHookReturn, FetchConfig } from './types';
import { DeviceRegistrationDataService } from '../services';

/**
 * Device Registration页面数据Hook
 * 
 * @param backendStatus 后端状态
 * @param config 可选的配置参数
 * @returns 设备注册数据和操作方法
 */
export function useDeviceRegistration(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<DeviceRegistrationData> & {
  // 扩展的设备注册特定方法
  registerDevice: (formData: DeviceRegistrationData['registrationForm']) => Promise<any>;
  updateDid: () => Promise<void>;
  validateForm: (formData: DeviceRegistrationData['registrationForm']) => DeviceRegistrationData['validation'];
  copyToClipboard: (text: string) => Promise<boolean>;
  resetForm: () => void;
  getRegistrationInfo: () => Promise<any>;
} {
  // 创建数据服务实例
  const dataService = useMemo(() => {
    return backendStatus ? new DeviceRegistrationDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  // 使用基础Hook获取数据
  const baseHook = useBaseData(dataService, {
    autoRefresh: false, // 设备注册不需要自动刷新
    retryCount: 3,
    timeout: 15000, // 注册可能需要更长时间
    ...config
  });

  // 注册设备方法
  const registerDevice = useCallback(async (formData: DeviceRegistrationData['registrationForm']): Promise<any> => {
    if (!dataService) {
      throw new Error('Data service not available');
    }

    try {
      // 先验证表单
      const validation = validateForm(formData);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      // 调用注册API
      const response = await (dataService as any).registerDevice(formData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to register device');
      }

      // 注册成功，返回响应数据
      console.log('Device registration successful:', response.data);

      // 更新本地数据以反映新的注册状态
      await baseHook.refresh();

      // 返回成功响应数据
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 更新DID方法
  const updateDid = useCallback(async (): Promise<void> => {
    if (!dataService) {
      throw new Error('Data service not available');
    }

    try {
      // 调用更新DID API
      const response = await (dataService as any).updateDid();

      if (!response.success) {
        throw new Error(response.error || 'Failed to update DID');
      }

      // 更新本地数据
      await baseHook.refresh();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }, [dataService, baseHook]);

  // 表单验证方法
  const validateForm = useCallback((formData: DeviceRegistrationData['registrationForm']): DeviceRegistrationData['validation'] => {
    const errors: DeviceRegistrationData['validation']['errors'] = {};
    
    // 验证注册码
    if (!formData.registrationCode?.trim()) {
      errors.registrationCode = 'Registration code is required';
    } else if (formData.registrationCode.length < 6) {
      errors.registrationCode = 'Registration code must be at least 6 characters';
    } else if (!/^[A-Z0-9]+$/.test(formData.registrationCode)) {
      errors.registrationCode = 'Registration code must contain only uppercase letters and numbers';
    }
    
    // 验证网关地址
    if (!formData.gatewayAddress?.trim()) {
      errors.gatewayAddress = 'Gateway address is required';
    } else if (!formData.gatewayAddress.startsWith('http')) {
      errors.gatewayAddress = 'Gateway address must be a valid URL';
    }
    
    // 验证奖励地址
    if (!formData.rewardAddress?.trim()) {
      errors.rewardAddress = 'Reward address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.rewardAddress)) {
      errors.rewardAddress = 'Invalid Ethereum address format';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
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

  // 重置表单方法
  const resetForm = useCallback(() => {
    // 触发数据重新获取，这会重置表单到初始状态
    baseHook.refresh();
  }, [baseHook]);

  // 获取注册信息方法
  const getRegistrationInfo = useCallback(async () => {
    if (!dataService) {
      throw new Error('Data service not available');
    }
    return await dataService.getRegistrationInfo();
  }, [dataService]);

  return {
    ...baseHook,
    registerDevice,
    updateDid,
    validateForm,
    copyToClipboard,
    resetForm,
    getRegistrationInfo
  };
}

/**
 * Device Registration工具函数
 */
export const deviceRegistrationUtils = {
  /**
   * 格式化设备ID显示
   */
  formatDeviceId: (deviceId: string): string => {
    if (!deviceId) return '';
    if (deviceId.length <= 20) return deviceId;
    return `${deviceId.substring(0, 10)}...${deviceId.substring(deviceId.length - 10)}`;
  },

  /**
   * 格式化地址显示
   */
  formatAddress: (address: string): string => {
    if (!address) return '';
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  },

  /**
   * 验证以太坊地址
   */
  isValidEthereumAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * 验证URL格式
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 生成随机注册码（用于演示）
   */
  generateRegistrationCode: (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * 获取状态颜色
   */
  getStatusColor: (isCreated: boolean): { bg: string; border: string; text: string } => {
    if (isCreated) {
      return {
        bg: '#E8FAEB',
        border: '#ABDE9E',
        text: '#219921'
      };
    } else {
      return {
        bg: '#FFFBE6',
        border: '#FFD666',
        text: '#FAAD14'
      };
    }
  },

  /**
   * 获取状态图标
   */
  getStatusIcon: (isCreated: boolean): string => {
    return isCreated ? 'check-circle' : 'alert-circle';
  }
};

/**
 * Device Registration常量定义
 */
export const DEVICE_REGISTRATION_CONSTANTS = {
  // 默认网关地址
  DEFAULT_GATEWAY: 'https://sightai.io/api/model/gateway-benchmark',
  
  // 表单验证规则
  VALIDATION_RULES: {
    REGISTRATION_CODE_MIN_LENGTH: 6,
    REGISTRATION_CODE_MAX_LENGTH: 20,
    REWARD_ADDRESS_LENGTH: 42
  },
  
  // 复制成功消息显示时间
  COPY_SUCCESS_DURATION: 2000,
  
  // 注册超时时间
  REGISTRATION_TIMEOUT: 15000,
  
  // 表单字段名称
  FORM_FIELDS: {
    REGISTRATION_CODE: 'registrationCode',
    GATEWAY_ADDRESS: 'gatewayAddress',
    REWARD_ADDRESS: 'rewardAddress'
  },
  
  // 错误消息
  ERROR_MESSAGES: {
    REGISTRATION_CODE_REQUIRED: 'Registration code is required',
    REGISTRATION_CODE_INVALID: 'Registration code must contain only uppercase letters and numbers',
    GATEWAY_ADDRESS_REQUIRED: 'Gateway address is required',
    GATEWAY_ADDRESS_INVALID: 'Gateway address must be a valid URL',
    REWARD_ADDRESS_REQUIRED: 'Reward address is required',
    REWARD_ADDRESS_INVALID: 'Invalid Ethereum address format',
    REGISTRATION_FAILED: 'Failed to register device',
    COPY_FAILED: 'Failed to copy to clipboard'
  }
} as const;

/**
 * Device Registration类型守卫
 */
export const isDeviceRegistrationData = (data: any): data is DeviceRegistrationData => {
  return (
    data &&
    typeof data === 'object' &&
    data.registrationStatus &&
    typeof data.registrationStatus === 'object' &&
    data.registrationForm &&
    typeof data.registrationForm === 'object' &&
    data.validation &&
    typeof data.validation === 'object'
  );
};

/**
 * Device Registration错误类型
 */
export class DeviceRegistrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DeviceRegistrationError';
  }
}

/**
 * Device Registration错误代码
 */
export const DEVICE_REGISTRATION_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  INVALID_RESPONSE: 'INVALID_RESPONSE'
} as const;
