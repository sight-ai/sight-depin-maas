interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  getBackendStatus(): Promise<{
    isRunning: boolean;
    port: number;
  }>;
  onBackendStatusChange(callback: (status: { isRunning: boolean; port: number }) => void): void;
  setAutoStart(enabled: boolean): Promise<{ success: boolean; error?: string }>;
  getAutoStart(): Promise<boolean>;
  readDeviceConfig(): Promise<{
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
  // 服务管理 API
  restartBackend(): Promise<{ success: boolean; error?: string }>;
  stopBackend(): Promise<{ success: boolean; error?: string }>;
  startBackend(): Promise<{ success: boolean; error?: string }>;
  clipboard: {
    writeText: (text: string) => void;
    readText: () => string;
    writeHTML: (markup: string) => void;
    readHTML: () => string;
    clear: () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
