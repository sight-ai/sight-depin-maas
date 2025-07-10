/**
 * Electron API 类型定义
 * 
 * 为渲染进程提供完整的 Electron API 类型定义
 */

declare global {
  interface Window {
    electronAPI: {
      // 后端状态管理
      getBackendStatus: () => Promise<{
        isRunning: boolean;
        port: number;
      }>;
      onBackendStatusChange: (callback: (status: { isRunning: boolean; port: number }) => void) => void;
      
      // 自动启动设置
      setAutoStart: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getAutoStart: () => Promise<boolean>;
      
      // 设备配置管理 - 原有 API
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
      
      // 新增：配置管理 API
      updateDeviceConfig?: (config: any) => Promise<{ success: boolean; message?: string; error?: string }>;
      getAllConfig?: () => Promise<{ success: boolean; data?: any; error?: string }>;
      getAppSettings?: () => Promise<{ success: boolean; data?: any; error?: string }>;
      updateAppSettings?: (settings: any) => Promise<{ success: boolean; message?: string; error?: string }>;
      validateConfig?: () => Promise<{ success: boolean; data?: any; error?: string }>;
      backupConfig?: (description?: string) => Promise<{ success: boolean; backupId?: string; message?: string }>;
      
      // 系统信息 API
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
            usage?: number;
          };
          cpu: {
            model: string;
            cores?: number;
            usage: number;
          };
          disk: {
            total: number;
            used: number;
            free: number;
            usage?: number;
          };
          network?: {
            interfaces: Array<{
              name: string;
              address: string;
              type: string;
              isActive: boolean;
            }>;
          };
          gpu?: {
            name: string;
            memory: number;
            usage: number;
          };
        };
        error?: string;
      }>;
      
      // 应用信息 API
      getAppInfo: () => Promise<{
        version: string;
        startTime: number;
        uptime: number;
        environment?: string;
        buildDate?: string;
        electronVersion?: string;
        nodeVersion?: string;
        chromiumVersion?: string;
      }>;
      
      // 服务管理 API
      restartBackend: () => Promise<{ success: boolean; error?: string }>;
      stopBackend?: () => Promise<{ success: boolean; error?: string }>;
      startBackend?: () => Promise<{ success: boolean; error?: string }>;
      
      // 日志管理 API
      getLogs?: (options?: {
        lines?: number;
        level?: 'error' | 'warn' | 'info' | 'debug';
        service?: 'backend' | 'libp2p' | 'all';
      }) => Promise<{
        success: boolean;
        data?: string[];
        error?: string;
      }>;
      
      // 文件/目录操作 API
      openPath?: (path: string) => Promise<{ success: boolean; error?: string }>;
      showItemInFolder?: (path: string) => Promise<{ success: boolean; error?: string }>;
      
      // 剪贴板 API
      clipboard?: {
        writeText: (text: string) => void;
        readText: () => string;
        writeHTML: (markup: string) => void;
        readHTML: () => string;
        clear: () => void;
      };
      
      // 平台信息
      platform?: string;
      versions?: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}

export {};
