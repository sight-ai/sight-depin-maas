/**
 * Desktop 应用配置接口
 * 
 * 定义 desktop-app 特有的配置类型和接口
 * 基于统一配置管理系统
 */

/**
 * 设备注册配置
 */
export interface DeviceRegistrationConfig {
  deviceId: string;
  deviceName: string;
  gatewayAddress: string;
  rewardAddress: string;
  code: string;
  isRegistered: boolean;
  registrationTime?: string;
  lastUpdated?: string;
}

/**
 * 服务配置
 */
export interface ServiceConfig {
  backend: {
    port: number;
    host: string;
    autoStart: boolean;
    healthCheckInterval: number;
    maxStartupTime: number;
  };
  libp2p: {
    port: number;
    nodePort: number;
    isGateway: boolean;
    bootstrapAddrs: string;
    autoStart: boolean;
    maxStartupTime: number;
  };
}

/**
 * 应用设置配置
 */
export interface AppSettingsConfig {
  autoStart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  enableNotifications: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'zh' | 'ja' | 'ko';
  updateChannel: 'stable' | 'beta' | 'dev';
}

/**
 * 系统监控配置
 */
export interface SystemMonitorConfig {
  enableMonitoring: boolean;
  monitoringInterval: number;
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
  enableAlerts: boolean;
  alertCooldown: number;
}

/**
 * 网络配置
 */
export interface NetworkConfig {
  proxy: {
    enabled: boolean;
    type: 'http' | 'https' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  timeout: {
    connection: number;
    request: number;
    response: number;
  };
  retries: {
    maxAttempts: number;
    backoffDelay: number;
  };
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  enableFileLogging: boolean;
  maxFileSize: number;
  maxFiles: number;
  logDirectory: string;
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
}

/**
 * 完整的 Desktop 应用配置
 */
export interface DesktopAppConfig {
  device: DeviceRegistrationConfig;
  services: ServiceConfig;
  app: AppSettingsConfig;
  system: SystemMonitorConfig;
  network: NetworkConfig;
  logging: LoggingConfig;
  version: string;
  lastUpdated: string;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  section: keyof DesktopAppConfig;
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  source: 'main' | 'renderer' | 'system';
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: Array<{
    section: string;
    key: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    section: string;
    key: string;
    message: string;
  }>;
}

/**
 * 系统信息
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  uptime: number;
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  cpu: {
    model: string;
    cores: number;
    usage: number;
    temperature?: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
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
    temperature?: number;
  };
}

/**
 * 应用信息
 */
export interface AppInfo {
  version: string;
  buildDate: string;
  startTime: number;
  uptime: number;
  environment: 'development' | 'production';
  electronVersion: string;
  nodeVersion: string;
  chromiumVersion: string;
}

/**
 * 服务状态
 */
export interface ServiceStatus {
  backend: {
    isRunning: boolean;
    port: number;
    pid?: number;
    startTime?: number;
    uptime?: number;
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastHealthCheck?: number;
  };
  libp2p: {
    isRunning: boolean;
    port: number;
    nodePort: number;
    pid?: number;
    startTime?: number;
    uptime?: number;
    peersConnected?: number;
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastHealthCheck?: number;
  };
}

/**
 * Desktop 配置服务接口
 */
export interface IDesktopConfigService {
  /**
   * 初始化配置服务
   */
  initialize(): Promise<void>;

  /**
   * 获取设备配置
   */
  getDeviceConfig(): Promise<DeviceRegistrationConfig>;

  /**
   * 更新设备配置
   */
  updateDeviceConfig(config: Partial<DeviceRegistrationConfig>): Promise<boolean>;

  /**
   * 获取服务配置
   */
  getServiceConfig(): Promise<ServiceConfig>;

  /**
   * 更新服务配置
   */
  updateServiceConfig(config: Partial<ServiceConfig>): Promise<boolean>;

  /**
   * 获取应用设置
   */
  getAppSettings(): Promise<AppSettingsConfig>;

  /**
   * 更新应用设置
   */
  updateAppSettings(settings: Partial<AppSettingsConfig>): Promise<boolean>;

  /**
   * 获取系统监控配置
   */
  getSystemMonitorConfig(): Promise<SystemMonitorConfig>;

  /**
   * 更新系统监控配置
   */
  updateSystemMonitorConfig(config: Partial<SystemMonitorConfig>): Promise<boolean>;

  /**
   * 获取网络配置
   */
  getNetworkConfig(): Promise<NetworkConfig>;

  /**
   * 更新网络配置
   */
  updateNetworkConfig(config: Partial<NetworkConfig>): Promise<boolean>;

  /**
   * 获取日志配置
   */
  getLoggingConfig(): Promise<LoggingConfig>;

  /**
   * 更新日志配置
   */
  updateLoggingConfig(config: Partial<LoggingConfig>): Promise<boolean>;

  /**
   * 获取完整配置
   */
  getAllConfig(): Promise<DesktopAppConfig>;

  /**
   * 验证配置
   */
  validateConfig(): Promise<ConfigValidationResult>;

  /**
   * 重置配置到默认值
   */
  resetConfig(sections?: Array<keyof DesktopAppConfig>): Promise<boolean>;

  /**
   * 备份配置
   */
  backupConfig(description?: string): Promise<{ success: boolean; backupId?: string; message: string }>;

  /**
   * 恢复配置
   */
  restoreConfig(backupId: string): Promise<{ success: boolean; message: string }>;

  /**
   * 监听配置变更
   */
  onConfigChange(callback: (event: ConfigChangeEvent) => void): void;

  /**
   * 移除配置变更监听
   */
  offConfigChange(callback: (event: ConfigChangeEvent) => void): void;

  /**
   * 获取系统信息
   */
  getSystemInfo(): Promise<SystemInfo>;

  /**
   * 获取应用信息
   */
  getAppInfo(): Promise<AppInfo>;

  /**
   * 获取服务状态
   */
  getServiceStatus(): Promise<ServiceStatus>;

  /**
   * 清理资源
   */
  cleanup(): Promise<void>;
}
