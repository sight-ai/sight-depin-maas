/**
 * 设备注册数据Hook
 * 使用Dashboard的注册状态，优化性能，避免重复API调用
 */

import { useState, useCallback, useEffect } from 'react';
import { BackendStatus } from './types';
import { createApiClient } from '../utils/api-client';
import { DataPersistenceManager } from '../utils/data-persistence';
import { deviceInfoManager } from '../utils/device-info-manager';

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
  unregisterDevice: () => Promise<void>;
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

  // 使用Dashboard的注册状态作为主要数据源，结合缓存数据
  const [data, setData] = useState<DeviceRegistrationData>(() => {
    // 尝试从缓存获取合并后的数据
    const cachedData = DataPersistenceManager.getMergedDeviceRegistrationData();

    if (cachedData) {
      return {
        isRegistered: dashboardDeviceInfo?.isRegistered || cachedData.isRegistered,
        deviceId: dashboardDeviceInfo?.deviceId || cachedData.deviceId,
        deviceName: dashboardDeviceInfo?.deviceName || cachedData.deviceName,
        gateway: cachedData.gateway,
        rewardAddress: cachedData.rewardAddress,
        code: cachedData.code
      };
    }

    // 如果没有缓存，使用默认值
    return {
      isRegistered: dashboardDeviceInfo?.isRegistered || false,
      deviceId: dashboardDeviceInfo?.deviceId || '',
      deviceName: dashboardDeviceInfo?.deviceName || '',
      gateway: 'gateway.sightai.com',
      rewardAddress: '',
      code: ''
    };
  });

  // 获取详细的注册信息（仅在需要时调用）
  const fetchDetailedInfo = useCallback(async () => {
    if (!backendStatus?.isRunning || !backendStatus.port) return;

    try {
      // 使用全局设备信息管理器获取注册信息
      const deviceInfo = await deviceInfoManager.getDeviceInfo(backendStatus.port);

      const updatedData = {
        isRegistered: deviceInfo.isRegistered,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        gateway: deviceInfo.gatewayAddress || '',
        rewardAddress: deviceInfo.rewardAddress || '',
        code: deviceInfo.code || ''
      };

      setData(updatedData);
      setError(null);

      console.log('Device registration info loaded:', updatedData);
    } catch (error) {
      console.error('Failed to fetch detailed device info:', error);
      setError('Failed to load device registration information');
    }
  }, [backendStatus?.isRunning, backendStatus?.port]);

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
      const updatedData = {
        ...data,
        code: formData.code,
        gateway: formData.gateway,
        rewardAddress: formData.rewardAddress
        // 注册状态由Dashboard更新
      };

      setData(updatedData);

      // 保存到缓存
      DataPersistenceManager.saveDeviceRegistrationData({
        isRegistered: updatedData.isRegistered,
        deviceId: updatedData.deviceId,
        deviceName: updatedData.deviceName,
        gateway: updatedData.gateway,
        rewardAddress: updatedData.rewardAddress,
        code: updatedData.code
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // 取消注册设备
  const unregisterDevice = useCallback(async () => {
    if (!backendStatus?.isRunning) {
      throw new Error('Backend service is not running');
    }

    setIsSubmitting(true);
    setError(null);

    const apiClient = createApiClient(backendStatus);

    try {
      const result = await apiClient.unregisterDevice();

      if (!result.success) {
        throw new Error(result.error || 'Failed to unregister device');
      }

      // 清除本地注册信息，但保留DID配置
      const clearedData = {
        ...data,
        isRegistered: false,
        deviceName: '', // 清除设备名称
        gateway: '', // 重置为默认网关
        rewardAddress: '', // 清除奖励地址
        code: '' // 清除注册代码
        // deviceId 保留，因为这是DID，不应该清除
      };

      setData(clearedData);

      // 清除缓存数据，但保留DID
      DataPersistenceManager.clearDeviceRegistrationData(true);

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unregister device';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

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
  }, []);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await fetchDetailedInfo();
  }, []);

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

  // 初始化时加载缓存数据和订阅设备信息变化
  useEffect(() => {
    const cachedData = DataPersistenceManager.getDeviceRegistrationData();
    if (cachedData) {
      setData(cachedData);
    }

    // 订阅设备信息变化
    const unsubscribe = deviceInfoManager.subscribe((deviceInfo) => {
      const updatedData = {
        isRegistered: deviceInfo.isRegistered,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        gateway: deviceInfo.gatewayAddress || '',
        rewardAddress: deviceInfo.rewardAddress || '',
        code: deviceInfo.code || ''
      };

      setData(updatedData);
    });

    // 如果后端可用，立即获取最新的注册信息
    if (backendStatus?.isRunning) {
      const timer = setTimeout(() => {
        fetchDetailedInfo();
      }, 1000); // 延迟1秒避免初始化冲突

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }

    return unsubscribe;
  }, [backendStatus?.isRunning, fetchDetailedInfo]);

  // 当Dashboard设备信息变化时更新数据
  useEffect(() => {
    if (dashboardDeviceInfo) {
      setData(prev => {
        const updatedData = {
          ...prev,
          isRegistered: dashboardDeviceInfo.isRegistered,
          deviceId: dashboardDeviceInfo.deviceId,
          deviceName: dashboardDeviceInfo.deviceName
        };

        // 同步到缓存
        DataPersistenceManager.syncDeviceRegistrationStatus(dashboardDeviceInfo, {
          gateway: prev.gateway,
          rewardAddress: prev.rewardAddress,
          code: prev.code
        });

        return updatedData;
      });
    }
  }, [dashboardDeviceInfo]);

  return {
    data,
    error,
    isSubmitting,
    registerDevice,
    unregisterDevice,
    updateDid,
    refreshData,
    copyToClipboard
  };
};
