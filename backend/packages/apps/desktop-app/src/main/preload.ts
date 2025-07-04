import { contextBridge, ipcRenderer } from 'electron';

// 定义暴露给渲染进程的 API
export interface ElectronAPI {
  getBackendStatus: () => Promise<{
    isRunning: boolean;
    port: number;
  }>;
  restartBackend: () => Promise<void>;
  onBackendStatusChange: (callback: (status: { isRunning: boolean; port: number }) => void) => void;
  setAutoStart: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getAutoStart: () => Promise<boolean>;
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
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  onBackendStatusChange: (callback) => {
    ipcRenderer.on('backend-status-changed', (_, status) => callback(status));
  },
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('set-auto-start', enabled),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
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
