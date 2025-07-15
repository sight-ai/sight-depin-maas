/**
 * 系统资源监控服务
 * 
 * 使用Electron的Node.js API获取真实的系统资源数据
 * 遵循SOLID原则：
 * - 单一职责原则：只负责系统资源数据的获取
 * - 依赖倒置原则：通过接口提供数据
 */

import { getElectronAPI } from '../../utils/electron-api';
import { ApiClient } from '../../utils/api-client';
import { BackendStatus } from '../../hooks/types';

// 获取IPC渲染器接口
const getIpcRenderer = () => {
  return getElectronAPI();
};

export interface SystemResourcesData {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
  };
  memory: {
    usage: number;
    total: number;
    used: number;
    available: number;
  };
  disk: {
    usage: number;
    total: number;
    used: number;
    available: number;
  };
  network: {
    upload: number;
    download: number;
  };
  uptime: number;
  platform: string;
  arch: string;
}

export class SystemResourcesService {
  private static instance: SystemResourcesService;
  private apiClient: ApiClient | null = null;

  private constructor() {}

  public static getInstance(): SystemResourcesService {
    if (!SystemResourcesService.instance) {
      SystemResourcesService.instance = new SystemResourcesService();
    }
    return SystemResourcesService.instance;
  }

  /**
   * 设置API客户端
   */
  setApiClient(backendStatus: BackendStatus): void {
    this.apiClient = new ApiClient(backendStatus);
  }

  /**
   * 获取系统资源数据
   */
  async getSystemResources(): Promise<SystemResourcesData> {
    try {
      // 优先尝试通过API获取系统资源信息
      if (this.apiClient) {
        try {
          const apiResponse = await this.apiClient.getSystemResources();
          if (apiResponse.success && apiResponse.data) {
            return this.transformApiSystemData(apiResponse.data);
          }
        } catch (apiError) {
          console.warn('API system resources call failed, trying IPC:', apiError);
        }
      }

      // 回退到IPC调用
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) {
        console.warn('IPC Renderer not available, using default system resources');
        return this.getDefaultSystemResources();
      }

      // 检查invoke方法是否存在且为函数
      if (typeof ipcRenderer.invoke !== 'function') {
        console.warn('IPC Renderer invoke method not available, using default system resources');
        return this.getDefaultSystemResources();
      }

      // 通过IPC调用主进程获取系统信息
      const response = await ipcRenderer.invoke('get-system-info');

      if (!response || !response.success) {
        console.warn('Failed to get system info from IPC:', response?.error || 'Unknown error');
        return this.getDefaultSystemResources();
      }

      const systemInfo = response.data;

      return {
        cpu: {
          usage: systemInfo.cpu?.usage || 0,
          cores: systemInfo.cpu?.cores || 0,
          model: systemInfo.cpu?.model || 'Unknown',
          speed: systemInfo.cpu?.speed || 0
        },
        memory: {
          usage: systemInfo.memory?.usage || this.calculateUsagePercentage(systemInfo.memory?.used || 0, systemInfo.memory?.total || 1),
          total: systemInfo.memory?.total || 0,
          used: systemInfo.memory?.used || 0,
          available: systemInfo.memory?.free || 0
        },
        disk: {
          usage: systemInfo.disk?.usage || this.calculateUsagePercentage(systemInfo.disk?.used || 0, systemInfo.disk?.total || 1),
          total: systemInfo.disk?.total || 0,
          used: systemInfo.disk?.used || 0,
          available: systemInfo.disk?.free || 0
        },
        network: {
          upload: systemInfo.network?.upload || 0,
          download: systemInfo.network?.download || 0
        },
        uptime: systemInfo.uptime || 0,
        platform: systemInfo.platform || 'unknown',
        arch: systemInfo.arch || 'unknown'
      };
    } catch (error) {
      console.error('Failed to get system resources:', error);
      // 返回默认值以避免UI崩溃
      return this.getDefaultSystemResources();
    }
  }

  /**
   * 获取CPU使用率
   */
  async getCpuUsage(): Promise<number> {
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) return 0;

      const cpuUsage = await ipcRenderer.invoke('get-cpu-usage');
      return cpuUsage || 0;
    } catch (error) {
      console.error('Failed to get CPU usage:', error);
      return 0;
    }
  }

  /**
   * 获取内存使用率
   */
  async getMemoryUsage(): Promise<{ usage: number; total: number; used: number }> {
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) return { usage: 0, total: 0, used: 0 };

      const memoryInfo = await ipcRenderer.invoke('get-memory-info');
      return {
        usage: this.calculateUsagePercentage(memoryInfo.used, memoryInfo.total),
        total: memoryInfo.total || 0,
        used: memoryInfo.used || 0
      };
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return { usage: 0, total: 0, used: 0 };
    }
  }

  /**
   * 获取磁盘使用率
   */
  async getDiskUsage(): Promise<{ usage: number; total: number; used: number }> {
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) return { usage: 0, total: 0, used: 0 };

      const diskInfo = await ipcRenderer.invoke('get-disk-info');
      return {
        usage: this.calculateUsagePercentage(diskInfo.used, diskInfo.total),
        total: diskInfo.total || 0,
        used: diskInfo.used || 0
      };
    } catch (error) {
      console.error('Failed to get disk usage:', error);
      return { usage: 0, total: 0, used: 0 };
    }
  }

  /**
   * 计算使用率百分比
   */
  private calculateUsagePercentage(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化运行时间
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * 获取默认系统资源数据（用于错误情况）
   */
  private getDefaultSystemResources(): SystemResourcesData {
    return {
      cpu: {
        usage: 0,
        cores: 0,
        model: 'Unknown',
        speed: 0
      },
      memory: {
        usage: 0,
        total: 0,
        used: 0,
        available: 0
      },
      disk: {
        usage: 0,
        total: 0,
        used: 0,
        available: 0
      },
      network: {
        upload: 0,
        download: 0
      },
      uptime: 0,
      platform: 'unknown',
      arch: 'unknown'
    };
  }

  /**
   * 转换API返回的系统数据
   */
  private transformApiSystemData(apiData: any): SystemResourcesData {
    return {
      cpu: {
        usage: apiData.cpu?.usage || 0,
        cores: apiData.cpu?.cores || 0,
        model: apiData.cpu?.model || 'Unknown',
        speed: apiData.cpu?.speed || 0
      },
      memory: {
        usage: apiData.memory?.usage || 0,
        total: apiData.memory?.total || 0,
        used: apiData.memory?.used || 0,
        available: apiData.memory?.available || 0
      },
      disk: {
        usage: apiData.disk?.usage || 0,
        total: apiData.disk?.total || 0,
        used: apiData.disk?.used || 0,
        available: apiData.disk?.available || 0
      },
      network: {
        upload: apiData.network?.upload || 0,
        download: apiData.network?.download || 0
      },
      uptime: apiData.uptime || 0,
      platform: apiData.platform || 'unknown',
      arch: apiData.arch || 'unknown'
    };
  }
}

// 导出单例实例
export const systemResourcesService = SystemResourcesService.getInstance();
