/**
 * 设备注册数据Hook
 * 使用Dashboard的注册状态，优化性能，避免重复API调用
 */

import React, { useState, useCallback, useEffect } from 'react';
import { BackendStatus } from './types';
import { createApiClient } from '../utils/api-client';

interface DeviceRegistrationData {
  isRegistered: boolean;
  deviceId: string;
  deviceName: string;
  gateway: string;
  rewardAddress: string;
  code: string;
}

interface RegistrationFormData {
  code: string;
  gateway: string;
  rewardAddress: string;
}

interface UseDeviceRegistrationDataReturn {
  data: DeviceRegistrationData;
  error: string | null;
  isSubmitting: boolean;
  registerDevice: (formData: RegistrationFormData) => Promise<void>;
  updateDid: () => Promise<void>;
  refreshData: () => Promise<void>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

export const useDeviceRegistrationData = (
  backendStatus: BackendStatus | null,
  dashboardDeviceInfo?: {
    isRegistered: boolean;
    deviceId: string;
    deviceName: string;
  }
): UseDeviceRegistrationDataReturn => {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 使用Dashboard的注册状态作为主要数据源
  const [data, setData] = useState<DeviceRegistrationData>(() => ({
    isRegistered: dashboardDeviceInfo?.isRegistered || false,
    deviceId: dashboardDeviceInfo?.deviceId || '',
    deviceName: dashboardDeviceInfo?.deviceName || '',
    gateway: 'gateway.sightai.com',
    rewardAddress: '',
    code: ''
  }));

  // 获取详细的注册信息（仅在需要时调用）
  const fetchDetailedInfo = useCallback(async () => {
    if (!backendStatus?.isRunning) return;

    const apiClient = createApiClient(backendStatus);
    
    try {
      // 只获取详细信息，不影响注册状态
      const registrationResult = await apiClient.getRegistrationInfo();
      
      if (registrationResult.success && registrationResult.data) {
        const regData = registrationResult.data as any;
        setData(prev => ({
          ...prev,
          gateway: regData.gateway || prev.gateway,
          rewardAddress: regData.rewardAddress || prev.rewardAddress,
          // 保持使用Dashboard的注册状态
          isRegistered: dashboardDeviceInfo?.isRegistered || false,
          deviceId: dashboardDeviceInfo?.deviceId || prev.deviceId,
          deviceName: dashboardDeviceInfo?.deviceName || prev.deviceName
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch detailed registration info:', err);
      // 不设置错误，因为这不是关键信息
    }
  }, [backendStatus, dashboardDeviceInfo]);

  // 注册设备
  const registerDevice = useCallback(async (formData: RegistrationFormData) => {
    if (!backendStatus?.isRunning) {
      throw new Error('Backend service is not running');
    }

    setIsSubmitting(true);
    setError(null);

    const apiClient = createApiClient(backendStatus);

    try {
      const result = await apiClient.registerDevice({
        code: formData.code,
        gateway_address: formData.gateway,
        reward_address: formData.rewardAddress
      });

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      // 更新本地数据
      setData(prev => ({
        ...prev,
        code: formData.code,
        gateway: formData.gateway,
        rewardAddress: formData.rewardAddress
        // 注册状态由Dashboard更新
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [backendStatus]);

  // 更新DID
  const updateDid = useCallback(async () => {
    if (!backendStatus?.isRunning) {
      throw new Error('Backend service is not running');
    }

    const apiClient = createApiClient(backendStatus);

    try {
      const result = await apiClient.updateDid();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update DID');
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update DID';
      setError(errorMessage);
      throw err;
    }
  }, [backendStatus]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await fetchDetailedInfo();
  }, [fetchDetailedInfo]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // 回退方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        textArea.remove();
        return result;
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, []);

  // 当Dashboard设备信息变化时更新数据
  useEffect(() => {
    if (dashboardDeviceInfo) {
      setData(prev => ({
        ...prev,
        isRegistered: dashboardDeviceInfo.isRegistered,
        deviceId: dashboardDeviceInfo.deviceId,
        deviceName: dashboardDeviceInfo.deviceName
      }));
    }
  }, [dashboardDeviceInfo]);

  // 初始加载详细信息
  useEffect(() => {
    if (dashboardDeviceInfo?.isRegistered) {
      fetchDetailedInfo();
    }
  }, [dashboardDeviceInfo?.isRegistered, fetchDetailedInfo]);

  return {
    data,
    error,
    isSubmitting,
    registerDevice,
    updateDid,
    refreshData,
    copyToClipboard
  };
};
