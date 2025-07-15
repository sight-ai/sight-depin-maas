/**
 * 全局设备信息管理器
 * 
 * 功能：
 * - 统一管理设备注册信息的获取和缓存
 * - 避免多个组件同时请求同一个API
 * - 提供订阅机制，让多个组件共享同一份数据
 * - 智能缓存和自动刷新
 */

import { cachedFetch } from './api-request-manager';
import { DataPersistenceManager } from './data-persistence';

export interface DeviceInfo {
  isRegistered: boolean;
  deviceId: string;
  deviceName: string;
  gatewayAddress?: string;
  rewardAddress?: string;
  code?: string;
}

type DeviceInfoListener = (deviceInfo: DeviceInfo) => void;

class DeviceInfoManager {
  private static instance: DeviceInfoManager;
  private deviceInfo: DeviceInfo | null = null;
  private listeners: Set<DeviceInfoListener> = new Set();
  private isLoading = false;
  private lastFetchTime = 0;
  private fetchPromise: Promise<DeviceInfo> | null = null;

  private constructor() {
    // 初始化时从缓存加载数据
    this.loadFromCache();
  }

  static getInstance(): DeviceInfoManager {
    if (!DeviceInfoManager.instance) {
      DeviceInfoManager.instance = new DeviceInfoManager();
    }
    return DeviceInfoManager.instance;
  }

  /**
   * 从缓存加载设备信息
   */
  private loadFromCache(): void {
    try {
      const cachedInfo = DataPersistenceManager.getDashboardDeviceInfo();
      if (cachedInfo) {
        this.deviceInfo = cachedInfo;
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load device info from cache:', error);
    }
  }

  /**
   * 保存设备信息到缓存
   */
  private saveToCache(deviceInfo: DeviceInfo): void {
    try {
      DataPersistenceManager.saveDashboardDeviceInfo(deviceInfo);
      
      // 同时保存到设备注册数据缓存
      DataPersistenceManager.saveDeviceRegistrationData({
        isRegistered: deviceInfo.isRegistered,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        gateway: deviceInfo.gatewayAddress || '',
        rewardAddress: deviceInfo.rewardAddress || '',
        code: deviceInfo.code || ''
      });
    } catch (error) {
      console.warn('Failed to save device info to cache:', error);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    if (this.deviceInfo) {
      this.listeners.forEach(listener => {
        try {
          listener(this.deviceInfo!);
        } catch (error) {
          console.error('Error in device info listener:', error);
        }
      });
    }
  }

  /**
   * 获取设备信息（带缓存和去重）
   */
  async getDeviceInfo(backendPort?: number, forceRefresh = false): Promise<DeviceInfo> {
    // 如果有缓存且不强制刷新，直接返回
    if (this.deviceInfo && !forceRefresh) {
      const now = Date.now();
      // 缓存有效期30秒
      if (now - this.lastFetchTime < 30000) {
        return this.deviceInfo;
      }
    }

    // 如果正在加载，返回现有的Promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // 如果没有后端端口，返回缓存或默认值
    if (!backendPort) {
      return this.deviceInfo || this.getDefaultDeviceInfo();
    }

    // 创建新的获取Promise
    this.fetchPromise = this.fetchDeviceInfoFromAPI(backendPort);

    try {
      const deviceInfo = await this.fetchPromise;
      this.deviceInfo = deviceInfo;
      this.lastFetchTime = Date.now();
      this.saveToCache(deviceInfo);
      this.notifyListeners();
      return deviceInfo;
    } catch (error) {
      console.error('Failed to fetch device info:', error);
      // 返回缓存或默认值
      return this.deviceInfo || this.getDefaultDeviceInfo();
    } finally {
      this.fetchPromise = null;
      this.isLoading = false;
    }
  }

  /**
   * 从API获取设备信息
   */
  private async fetchDeviceInfoFromAPI(backendPort: number): Promise<DeviceInfo> {
    this.isLoading = true;

    const registrationUrl = `http://localhost:${backendPort}/api/v1/device-status/registration-info`;
    const result = await cachedFetch(registrationUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }, {
      cacheTime: 30000, // 30秒缓存
      debounceTime: 2000 // 2秒防抖
    });

    const typedResult = result as any;
    if (typedResult.success && typedResult.data) {
      const deviceData = typedResult.data as any;
      
      return {
        isRegistered: deviceData.isRegistered || false,
        deviceId: deviceData.deviceId || '',
        deviceName: deviceData.deviceName || 'Unknown Device',
        gatewayAddress: deviceData.gatewayAddress || '',
        rewardAddress: deviceData.rewardAddress || '',
        code: deviceData.code || ''
      };
    }

    throw new Error('Failed to fetch device info from API');
  }

  /**
   * 获取默认设备信息
   */
  private getDefaultDeviceInfo(): DeviceInfo {
    return {
      isRegistered: false,
      deviceId: '',
      deviceName: 'Unknown Device',
      gatewayAddress: '',
      rewardAddress: '',
      code: ''
    };
  }

  /**
   * 订阅设备信息变化
   */
  subscribe(listener: DeviceInfoListener): () => void {
    this.listeners.add(listener);
    
    // 如果已有数据，立即通知
    if (this.deviceInfo) {
      try {
        listener(this.deviceInfo);
      } catch (error) {
        console.error('Error in device info listener:', error);
      }
    }

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 手动刷新设备信息
   */
  async refresh(backendPort?: number): Promise<DeviceInfo> {
    return this.getDeviceInfo(backendPort, true);
  }

  /**
   * 更新设备信息（用于注册后更新）
   */
  updateDeviceInfo(deviceInfo: Partial<DeviceInfo>): void {
    if (this.deviceInfo) {
      this.deviceInfo = { ...this.deviceInfo, ...deviceInfo };
    } else {
      this.deviceInfo = { ...this.getDefaultDeviceInfo(), ...deviceInfo };
    }
    
    this.saveToCache(this.deviceInfo);
    this.notifyListeners();
  }

  /**
   * 清除设备信息（用于注销）
   */
  clearDeviceInfo(): void {
    this.deviceInfo = this.getDefaultDeviceInfo();
    this.saveToCache(this.deviceInfo);
    this.notifyListeners();
  }

  /**
   * 获取当前缓存的设备信息（同步）
   */
  getCurrentDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * 检查是否正在加载
   */
  isLoadingDeviceInfo(): boolean {
    return this.isLoading;
  }
}

// 导出单例实例
export const deviceInfoManager = DeviceInfoManager.getInstance();

// 便捷Hook
export const useDeviceInfoManager = () => {
  return deviceInfoManager;
};

export default deviceInfoManager;
