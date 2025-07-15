/**
 * 数据持久化工具
 * 处理应用数据的本地存储和缓存
 */

interface DeviceRegistrationCache {
  isRegistered: boolean;
  deviceId: string;
  deviceName: string;
  gateway: string;
  rewardAddress: string;
  code: string;
  lastUpdated: number;
}

interface DashboardCache {
  deviceInfo: {
    isRegistered: boolean;
    deviceId: string;
    deviceName: string;
  };
  lastUpdated: number;
}

const CACHE_KEYS = {
  DEVICE_REGISTRATION: 'sightai_device_registration',
  DASHBOARD_DEVICE_INFO: 'sightai_dashboard_device_info'
} as const;

const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存过期

/**
 * 数据持久化管理器
 */
export class DataPersistenceManager {
  /**
   * 保存设备注册数据到本地存储
   */
  static saveDeviceRegistrationData(data: Omit<DeviceRegistrationCache, 'lastUpdated'>): void {
    try {
      const cacheData: DeviceRegistrationCache = {
        ...data,
        lastUpdated: Date.now()
      };
      localStorage.setItem(CACHE_KEYS.DEVICE_REGISTRATION, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save device registration data:', error);
    }
  }

  /**
   * 从本地存储获取设备注册数据
   */
  static getDeviceRegistrationData(): DeviceRegistrationCache | null {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.DEVICE_REGISTRATION);
      if (!cached) return null;

      const data: DeviceRegistrationCache = JSON.parse(cached);
      
      // 检查缓存是否过期
      if (Date.now() - data.lastUpdated > CACHE_EXPIRY) {
        this.clearDeviceRegistrationData();
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to get device registration data:', error);
      return null;
    }
  }

  /**
   * 清除设备注册数据（保留DID）
   */
  static clearDeviceRegistrationData(preserveDid: boolean = true): void {
    try {
      if (preserveDid) {
        const current = this.getDeviceRegistrationData();
        if (current) {
          // 只保留DID相关信息
          const preservedData: DeviceRegistrationCache = {
            isRegistered: false,
            deviceId: current.deviceId, // 保留DID
            deviceName: '',
            gateway: 'gateway.sightai.com',
            rewardAddress: '',
            code: '',
            lastUpdated: Date.now()
          };
          localStorage.setItem(CACHE_KEYS.DEVICE_REGISTRATION, JSON.stringify(preservedData));
        }
      } else {
        localStorage.removeItem(CACHE_KEYS.DEVICE_REGISTRATION);
      }
    } catch (error) {
      console.warn('Failed to clear device registration data:', error);
    }
  }

  /**
   * 保存Dashboard设备信息
   */
  static saveDashboardDeviceInfo(deviceInfo: DashboardCache['deviceInfo']): void {
    try {
      const cacheData: DashboardCache = {
        deviceInfo,
        lastUpdated: Date.now()
      };
      localStorage.setItem(CACHE_KEYS.DASHBOARD_DEVICE_INFO, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save dashboard device info:', error);
    }
  }

  /**
   * 获取Dashboard设备信息
   */
  static getDashboardDeviceInfo(): DashboardCache['deviceInfo'] | null {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.DASHBOARD_DEVICE_INFO);
      if (!cached) return null;

      const data: DashboardCache = JSON.parse(cached);
      
      // 检查缓存是否过期
      if (Date.now() - data.lastUpdated > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEYS.DASHBOARD_DEVICE_INFO);
        return null;
      }

      return data.deviceInfo;
    } catch (error) {
      console.warn('Failed to get dashboard device info:', error);
      return null;
    }
  }

  /**
   * 同步设备注册状态
   * 确保Dashboard和Device Registration页面的数据一致
   */
  static syncDeviceRegistrationStatus(
    dashboardDeviceInfo: DashboardCache['deviceInfo'],
    registrationData?: Partial<DeviceRegistrationCache>
  ): void {
    try {
      // 保存Dashboard设备信息
      this.saveDashboardDeviceInfo(dashboardDeviceInfo);

      // 如果有注册数据，合并保存
      if (registrationData) {
        const current = this.getDeviceRegistrationData();
        const merged: DeviceRegistrationCache = {
          isRegistered: dashboardDeviceInfo.isRegistered,
          deviceId: dashboardDeviceInfo.deviceId,
          deviceName: dashboardDeviceInfo.deviceName,
          gateway: registrationData.gateway || current?.gateway || 'gateway.sightai.com',
          rewardAddress: registrationData.rewardAddress || current?.rewardAddress || '',
          code: registrationData.code || current?.code || '',
          lastUpdated: Date.now()
        };
        this.saveDeviceRegistrationData(merged);
      } else {
        // 只更新注册状态相关信息
        const current = this.getDeviceRegistrationData();
        if (current) {
          const updated: DeviceRegistrationCache = {
            ...current,
            isRegistered: dashboardDeviceInfo.isRegistered,
            deviceId: dashboardDeviceInfo.deviceId,
            deviceName: dashboardDeviceInfo.deviceName,
            lastUpdated: Date.now()
          };
          this.saveDeviceRegistrationData(updated);
        }
      }
    } catch (error) {
      console.warn('Failed to sync device registration status:', error);
    }
  }

  /**
   * 获取合并后的设备注册数据
   * 优先使用Dashboard的注册状态，合并本地的详细信息
   */
  static getMergedDeviceRegistrationData(): DeviceRegistrationCache | null {
    try {
      const dashboardInfo = this.getDashboardDeviceInfo();
      const registrationData = this.getDeviceRegistrationData();

      if (!dashboardInfo && !registrationData) {
        return null;
      }

      // 合并数据，Dashboard的注册状态为准
      const merged: DeviceRegistrationCache = {
        isRegistered: dashboardInfo?.isRegistered || false,
        deviceId: dashboardInfo?.deviceId || registrationData?.deviceId || '',
        deviceName: dashboardInfo?.deviceName || registrationData?.deviceName || '',
        gateway: registrationData?.gateway || 'gateway.sightai.com',
        rewardAddress: registrationData?.rewardAddress || '',
        code: registrationData?.code || '',
        lastUpdated: Math.max(
          dashboardInfo ? Date.now() : 0,
          registrationData?.lastUpdated || 0
        )
      };

      return merged;
    } catch (error) {
      console.warn('Failed to get merged device registration data:', error);
      return null;
    }
  }

  /**
   * 清除所有缓存数据
   */
  static clearAllCache(): void {
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * 检查缓存是否有效
   */
  static isCacheValid(lastUpdated: number): boolean {
    return Date.now() - lastUpdated < CACHE_EXPIRY;
  }
}

export default DataPersistenceManager;
