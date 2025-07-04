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
  restartBackend(): Promise<void>;
  onBackendStatusChange(callback: (status: { isRunning: boolean; port: number }) => void): void;
  setAutoStart(enabled: boolean): Promise<{ success: boolean; error?: string }>;
  getAutoStart(): Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
