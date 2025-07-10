/**
 * 页面数据Hook
 * 
 * 为每个页面提供专门的数据管理Hook
 * 遵循单一职责原则，每个Hook只负责特定页面的数据管理
 */

import { useMemo } from 'react';
import { useBaseData } from './useBaseData';
import { 
  BackendStatus,
  DashboardData,
  DeviceStatusData,
  ModelConfigData,
  EarningsData,
  GatewayConfigData,
  CommunicationData,
  SettingsData,
  BaseHookReturn,
  UpdatableHookReturn,
  ActionableHookReturn,
  FetchConfig
} from './types';
import {
  DashboardDataService,
  DeviceStatusDataService,
  ModelConfigDataService,
  EarningsDataService,
  GatewayConfigDataService,
  CommunicationDataService,
  SettingsDataService
} from '../services/dataServices';

/**
 * Dashboard页面数据Hook
 */
export function useDashboardData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<DashboardData> {
  const dataService = useMemo(() => {
    return backendStatus ? new DashboardDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  return useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 5000, // 5秒刷新一次
    ...config
  });
}

/**
 * 设备状态页面数据Hook
 */
export function useDeviceStatusData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): UpdatableHookReturn<DeviceStatusData> {
  const dataService = useMemo(() => {
    return backendStatus ? new DeviceStatusDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 10000, // 10秒刷新一次
    ...config
  });

  // 扩展更新功能
  const update = async (data: Partial<DeviceStatusData>): Promise<boolean> => {
    if (!dataService) return false;

    try {
      const response = await dataService.update(data);
      if (response.success) {
        await baseHook.refresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update device status:', error);
      return false;
    }
  };

  return {
    ...baseHook,
    update,
    isUpdating: baseHook.loading.isLoading
  };
}

/**
 * 模型配置页面数据Hook
 */
export function useModelConfigData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): ActionableHookReturn<ModelConfigData, { type: 'switchFramework' | 'reportModels'; payload: any }> {
  const dataService = useMemo(() => {
    return backendStatus ? new ModelConfigDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 15000, // 15秒刷新一次
    ...config
  });

  // 扩展操作功能
  const executeAction = async (action: { type: 'switchFramework' | 'reportModels'; payload: any }): Promise<boolean> => {
    if (!dataService) return false;

    try {
      switch (action.type) {
        case 'switchFramework':
          const switchResponse = await dataService.update({ currentFramework: action.payload.framework });
          if (switchResponse.success) {
            await baseHook.refresh();
            return true;
          }
          return false;

        case 'reportModels':
          // 这里需要调用模型上报API
          // 暂时返回true，实际实现需要根据API调整
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      return false;
    }
  };

  return {
    ...baseHook,
    executeAction,
    isExecuting: baseHook.loading.isLoading,
    lastActionResult: null
  };
}

/**
 * 收益页面数据Hook
 */
export function useEarningsData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): BaseHookReturn<EarningsData> {
  const dataService = useMemo(() => {
    return backendStatus ? new EarningsDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  return useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 30000, // 30秒刷新一次
    ...config
  });
}

/**
 * 网关配置页面数据Hook
 */
export function useGatewayConfigData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): UpdatableHookReturn<GatewayConfigData> {
  const dataService = useMemo(() => {
    return backendStatus ? new GatewayConfigDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 15000, // 15秒刷新一次
    ...config
  });

  // 扩展更新功能
  const update = async (data: Partial<GatewayConfigData>): Promise<boolean> => {
    if (!dataService) return false;

    try {
      const response = await dataService.update(data);
      if (response.success) {
        await baseHook.refresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update gateway config:', error);
      return false;
    }
  };

  return {
    ...baseHook,
    update,
    isUpdating: baseHook.loading.isLoading
  };
}

/**
 * 通信页面数据Hook
 */
export function useCommunicationData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): UpdatableHookReturn<CommunicationData> {
  const dataService = useMemo(() => {
    return backendStatus ? new CommunicationDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  const baseHook = useBaseData(dataService, {
    autoRefresh: true,
    refreshInterval: 10000, // 10秒刷新一次
    ...config
  });

  // 扩展更新功能
  const update = async (data: Partial<CommunicationData>): Promise<boolean> => {
    if (!dataService) return false;

    try {
      const response = await dataService.update(data);
      if (response.success) {
        await baseHook.refresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update communication config:', error);
      return false;
    }
  };

  return {
    ...baseHook,
    update,
    isUpdating: baseHook.loading.isLoading
  };
}

/**
 * 设置页面数据Hook
 */
export function useSettingsData(
  backendStatus: BackendStatus | null,
  config?: Partial<FetchConfig>
): UpdatableHookReturn<SettingsData> {
  const dataService = useMemo(() => {
    return backendStatus ? new SettingsDataService(backendStatus) : null;
  }, [backendStatus?.isRunning, backendStatus?.port]);

  const baseHook = useBaseData(dataService, {
    autoRefresh: false, // 设置页面不需要自动刷新
    ...config
  });

  // 扩展更新功能
  const update = async (data: Partial<SettingsData>): Promise<boolean> => {
    if (!dataService) return false;

    try {
      const response = await dataService.update(data);
      if (response.success) {
        await baseHook.refresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  };

  return {
    ...baseHook,
    data: baseHook.data as SettingsData | null,
    update,
    isUpdating: baseHook.loading.isLoading
  };
}
