/**
 * Dashboard数据Hook
 * 获取真实的系统数据，无loading状态，直接显示数据
 */

import { useState, useEffect, useCallback } from 'react';
import { BackendStatus } from './types';
import { createApiClient } from '../utils/api-client';
import { DataPersistenceManager } from '../utils/data-persistence';
import { deviceInfoManager } from '../utils/device-info-manager';

interface DashboardData {
  systemInfo: {
    status: string;
    port: string;
    version: string;
    uptime: string;
  };
  deviceInfo: {
    isRegistered: boolean;
    deviceId: string;
    deviceName: string;
  };
  earnings: {
    taskCompleted: number;
    todayEarnings: number;
    totalEarnings: number;
  };
  systemResources: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage: number;
    temperatureUsage: number;
  };
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'warning';
    uptime: string;
    connections: number;
    port?: number;
    responseTime?: number;
  }>;
}

interface UseDashboardDataReturn {
  data: DashboardData;
  error: string | null;
  refresh: () => void;
}

export const useDashboardData = (backendStatus: BackendStatus | null): UseDashboardDataReturn => {
  const [error, setError] = useState<string | null>(null);

  // 获取真实系统数据
  const getRealSystemData = useCallback(async (): Promise<DashboardData> => {
    const apiClient = backendStatus ? createApiClient(backendStatus) : null;

    // 初始化默认数据
    let systemData: DashboardData = {
      systemInfo: {
        status: backendStatus?.isRunning ? 'ONLINE' : 'OFFLINE',
        port: backendStatus?.port?.toString() || '8716',
        version: 'v0.9.3 Beta',
        uptime: '0min'
      },
      deviceInfo: (() => {
        // 尝试从缓存获取设备信息
        const cachedDeviceInfo = DataPersistenceManager.getDashboardDeviceInfo();
        return cachedDeviceInfo || {
          isRegistered: false,
          deviceId: '',
          deviceName: 'Unknown Device'
        };
      })(),
      earnings: {
        taskCompleted: 0,
        todayEarnings: 0,
        totalEarnings: 0
      },
      systemResources: {
        cpuUsage: 0,
        memoryUsage: 0,
        gpuUsage: 0,
        temperatureUsage: 45
      },
      services: []
    };

    if (apiClient) {
      try {
        // 并行获取所有数据
        const [healthResult, earningsResult, systemResourcesResult, servicesResult] = await Promise.allSettled([
          apiClient.getHealth(),
          apiClient.getEarnings(),
          apiClient.getSystemResources(),
          apiClient.getServicesStatus()
        ]);

        // 处理健康检查数据
        if (healthResult.status === 'fulfilled' && healthResult.value.success) {
          const healthData = healthResult.value.data as any;
          systemData.systemInfo = {
            status: 'ONLINE',
            port: backendStatus?.port?.toString() || '8716',
            version: healthData?.version || 'v0.9.3 Beta',
            uptime: healthData?.uptime || '0min'
          };
        }

        // 处理收益数据
        if (earningsResult.status === 'fulfilled' && earningsResult.value.success) {
          const earningsData = earningsResult.value.data as any;
          systemData.earnings = {
            taskCompleted: earningsData?.taskCompleted || 0,
            todayEarnings: earningsData?.todayEarnings || 0,
            totalEarnings: earningsData?.totalEarnings || 0
          };
        }

        // 处理系统资源数据
        if (systemResourcesResult.status === 'fulfilled' && systemResourcesResult.value.success) {
          const resourcesData = systemResourcesResult.value.data as any;
          systemData.systemResources = {
            cpuUsage: resourcesData?.cpu?.usage || 0,
            memoryUsage: resourcesData?.memory?.usage || 0,
            gpuUsage: resourcesData?.gpu?.usage || 0,
            temperatureUsage: resourcesData?.temperature || 45
          };
        }

        // 处理服务状态数据
        if (servicesResult.status === 'fulfilled' && servicesResult.value.success) {
          const servicesData = servicesResult.value.data as any;
          if (servicesData?.services && Array.isArray(servicesData.services)) {
            systemData.services = servicesData.services.map((service: any) => ({
              name: service?.name || 'Unknown Service',
              status: service?.status || 'offline',
              uptime: service?.uptime || '0min',
              connections: service?.connections || 0,
              port: service?.port,
              responseTime: service?.responseTime
            }));
          }
        }

        // 使用全局设备信息管理器获取设备信息
        try {
          const deviceInfo = await deviceInfoManager.getDeviceInfo(backendStatus?.port);
          systemData.deviceInfo = {
            isRegistered: deviceInfo.isRegistered,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName
          };
        } catch (deviceError) {
          console.warn('Failed to get device info:', deviceError);
          // 使用缓存的设备信息作为后备
          const cachedDeviceInfo = DataPersistenceManager.getDashboardDeviceInfo();
          if (cachedDeviceInfo) {
            systemData.deviceInfo = cachedDeviceInfo;
          }
        }

      } catch (apiError) {
        console.warn('API calls failed:', apiError);
        setError('Some data may be unavailable');
      }
    }

    // 如果没有服务数据，提供默认服务状态
    if (systemData.services.length === 0) {
      systemData.services = [
        {
          name: 'Backend API',
          status: backendStatus?.isRunning ? 'online' : 'offline',
          uptime: systemData.systemInfo.uptime,
          connections: backendStatus?.isRunning ? 1 : 0,
          port: backendStatus?.port || 8716,
          responseTime: backendStatus?.isRunning ? 45 : 0
        },
        {
          name: 'P2P Service',
          status: 'offline',
          uptime: '0min',
          connections: 0,
          port: 4010,
          responseTime: 0
        },
        {
          name: 'Gateway Service',
          status: 'offline',
          uptime: '0min',
          connections: 0,
          port: 8080,
          responseTime: 0
        }
      ];
    }

    return systemData;
  }, []);

  // 使用状态存储当前数据
  const [data, setData] = useState<DashboardData>(() => {
    // 初始化时立即返回基础数据
    return {
      systemInfo: {
        status: backendStatus?.isRunning ? 'ONLINE' : 'OFFLINE',
        port: backendStatus?.port?.toString() || '8716',
        version: 'v0.9.3 Beta',
        uptime: '0min'
      },
      deviceInfo: {
        isRegistered: false,
        deviceId: '',
        deviceName: 'Unknown Device'
      },
      earnings: {
        taskCompleted: 0,
        todayEarnings: 0,
        totalEarnings: 0
      },
      systemResources: {
        cpuUsage: 0,
        memoryUsage: 0,
        gpuUsage: 0,
        temperatureUsage: 45
      },
      services: []
    };
  });

  // 刷新数据函数
  const refresh = useCallback(async () => {
    try {
      const realData = await getRealSystemData();
      setData(realData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Dashboard data fetch error:', err);
    }
  }, []);

  // 初始加载数据
  useEffect(() => {
    refresh();
  }, []);

  // 定时刷新数据
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 10000); // 每10秒刷新一次

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    error,
    refresh
  };
};

// 工具函数：复制到剪贴板
export const copyToClipboard = async (text: string): Promise<boolean> => {
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
};

// 格式化运行时间
export const formatUptime = (seconds: number): string => {
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
};

// 格式化数字
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
};
