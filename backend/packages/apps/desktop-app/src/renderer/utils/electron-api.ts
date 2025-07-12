/**
 * Electron API安全访问工具
 * 
 * 提供统一的Electron API访问方法，支持多环境兼容
 */

// Electron API接口定义
interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  getBackendStatus?: () => Promise<any>;
  onBackendStatusChange?: (callback: (status: any) => void) => void;
  clipboard?: {
    writeText: (text: string) => void;
  };
  readDeviceConfig?: () => Promise<any>;
  getSystemInfo?: () => Promise<any>;
  getAppSettings?: () => Promise<any>;
  getAllConfig?: () => Promise<any>;
}

/**
 * 获取Electron API的安全访问方法
 */
export const getElectronAPI = (): ElectronAPI | null => {
  // 首先尝试通过window对象访问（推荐方式）
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  
  // 在浏览器环境中，返回模拟的API接口
  if (typeof window !== 'undefined' && !window.require) {
    return {
      invoke: async (channel: string, ...args: any[]) => {
        // 返回模拟数据
        switch (channel) {
          case 'get-backend-status':
            return {
              isRunning: true,
              port: 8716,
              version: '1.0.0'
            };
          case 'read-device-config':
            return {
              success: true,
              data: {
                deviceId: 'mock-device-id',
                deviceName: 'Mock Device',
                isRegistered: false
              }
            };
          case 'get-system-info':
            return {
              success: true,
              data: {
                platform: 'mock',
                arch: 'x64',
                version: '1.0.0',
                cpu: { usage: Math.random() * 100, cores: 8 },
                memory: { usage: Math.random() * 100, total: 16 * 1024 * 1024 * 1024 }
              }
            };
          default:
            return { success: false, error: 'Unknown channel' };
        }
      },
      getBackendStatus: async () => ({
        isRunning: true,
        port: 8716,
        version: '1.0.0'
      }),
      onBackendStatusChange: (callback: (status: any) => void) => {
        // 模拟状态变化
        setTimeout(() => {
          callback({
            isRunning: true,
            port: 8716,
            version: '1.0.0'
          });
        }, 1000);
      },
      clipboard: {
        writeText: (text: string) => {
          // 使用浏览器的剪贴板API
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
          } else {
            console.log('Clipboard write (mock):', text);
          }
        }
      },
      readDeviceConfig: async () => ({
        success: true,
        data: {
          deviceId: 'mock-device-id',
          deviceName: 'Mock Device',
          isRegistered: false
        }
      }),
      getSystemInfo: async () => ({
        success: true,
        data: {
          platform: 'mock',
          arch: 'x64',
          version: '1.0.0'
        }
      }),
      getAppSettings: async () => ({
        success: true,
        data: {
          theme: 'light',
          language: 'en',
          autoStart: false
        }
      }),
      getAllConfig: async () => ({
        success: true,
        data: {
          device: { deviceId: 'mock-device-id' },
          app: { theme: 'light' },
          system: { platform: 'mock' }
        }
      })
    };
  }
  
  // 如果在Node.js环境中，返回null（避免直接require electron）
  console.warn('Electron API not available');
  return null;
};

/**
 * 检查Electron API是否可用
 */
export const isElectronAPIAvailable = (): boolean => {
  return getElectronAPI() !== null;
};

/**
 * 安全地调用Electron API
 */
export const safeInvokeElectronAPI = async (
  channel: string,
  ...args: any[]
): Promise<any> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    throw new Error('Electron API not available');
  }
  
  return electronAPI.invoke(channel, ...args);
};

/**
 * 获取后端状态
 */
export const getBackendStatus = async () => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    return {
      isRunning: false,
      port: 8716,
      version: '1.0.0'
    };
  }
  
  if (electronAPI.getBackendStatus) {
    return electronAPI.getBackendStatus();
  } else {
    return electronAPI.invoke('get-backend-status');
  }
};

/**
 * 监听后端状态变化
 */
export const onBackendStatusChange = (callback: (status: any) => void) => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    // 在非Electron环境中，模拟状态变化
    setTimeout(() => {
      callback({
        isRunning: true,
        port: 8716,
        version: '1.0.0'
      });
    }, 1000);
    return;
  }
  
  if (electronAPI.onBackendStatusChange) {
    electronAPI.onBackendStatusChange(callback);
  }
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = (text: string) => {
  const electronAPI = getElectronAPI();
  if (electronAPI?.clipboard) {
    electronAPI.clipboard.writeText(text);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    console.log('Clipboard write (fallback):', text);
  }
};
