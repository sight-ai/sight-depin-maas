import { contextBridge, ipcRenderer, clipboard } from 'electron';

// 定义暴露给渲染进程的 API
export interface ElectronAPI {
  getBackendStatus: () => Promise<{
    isRunning: boolean;
    port: number;
  }>;
  onBackendStatusChange: (callback: (status: { isRunning: boolean; port: number }) => void) => void;
  setAutoStart: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getAutoStart: () => Promise<boolean>;
  // 文件系统 API
  readDeviceConfig: () => Promise<{
    success: boolean;
    data?: {
      deviceId: string;
      deviceName: string;
      gatewayAddress: string;
      rewardAddress: string;
      code: string;
    };
    error?: string;
  }>;
  // 系统监控 API
  getSystemInfo: () => Promise<{
    success: boolean;
    data?: {
      platform: string;
      arch: string;
      version: string;
      uptime: number;
      memory: {
        total: number;
        used: number;
        free: number;
      };
      cpu: {
        model: string;
        usage: number;
      };
      disk: {
        total: number;
        used: number;
        free: number;
      };
    };
    error?: string;
  }>;

  // 应用信息 API
  getAppInfo: () => Promise<{
    version: string;
    startTime: number;
    uptime: number;
  }>;

  // 服务管理 API
  restartBackend: () => Promise<{ success: boolean; error?: string }>;
  stopBackend: () => Promise<{ success: boolean; error?: string }>;
  startBackend: () => Promise<{ success: boolean; error?: string }>;

  // 日志管理 API
  getLogs: (options?: {
    lines?: number;
    level?: 'error' | 'warn' | 'info' | 'debug';
    service?: 'backend' | 'libp2p' | 'all';
  }) => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;

  // 文件/目录操作 API
  openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
  showItemInFolder: (path: string) => Promise<{ success: boolean; error?: string }>;

  // 剪贴板 API
  clipboard: {
    writeText: (text: string) => void;
    readText: () => string;
    writeHTML: (markup: string) => void;
    readHTML: () => string;
    clear: () => void;
  };
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

// 暴露安全的 API 给渲染进程
const electronAPI: ElectronAPI = {
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  onBackendStatusChange: (callback) => {
    ipcRenderer.on('backend-status-changed', (_, status) => callback(status));
  },
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('set-auto-start', enabled),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  readDeviceConfig: () => ipcRenderer.invoke('read-device-config'),

  // 系统监控 API 实现
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // 应用信息 API 实现
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // 服务管理 API 实现
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  stopBackend: () => ipcRenderer.invoke('stop-backend'),
  startBackend: () => ipcRenderer.invoke('start-backend'),

  // 日志管理 API 实现
  getLogs: (options) => ipcRenderer.invoke('get-logs', options),

  // 文件/目录操作 API 实现
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),

  // 剪贴板 API 实现
  clipboard: {
    writeText: (text: string) => clipboard.writeText(text),
    readText: () => clipboard.readText(),
    writeHTML: (markup: string) => clipboard.writeHTML(markup),
    readHTML: () => clipboard.readHTML(),
    clear: () => clipboard.clear(),
  },
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome || '',
    electron: process.versions.electron || '',
  },
};

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明，供 TypeScript 使用
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
