import { app } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { 
  EnhancedUnifiedConfigService,
  UnifiedConfigFactoryService,
  IConfigManager,
  ConfigType,
  ConfigScope
} from '@saito/common';
import {
  IDesktopConfigService,
  DeviceRegistrationConfig,
  ServiceConfig,
  AppSettingsConfig,
  SystemMonitorConfig,
  NetworkConfig,
  LoggingConfig,
  DesktopAppConfig,
  ConfigChangeEvent,
  ConfigValidationResult,
  SystemInfo,
  AppInfo,
  ServiceStatus
} from '../interfaces/desktop-config.interface';

/**
 * Desktop 配置服务
 * 
 * 基于统一配置管理系统的 Desktop 应用配置服务
 * 遵循 SOLID 原则，提供类型安全的配置管理
 */
export class DesktopConfigService implements IDesktopConfigService {
  private deviceConfigManager: IConfigManager;
  private appConfigManager: IConfigManager;
  private systemConfigManager: IConfigManager;
  private userConfigManager: IConfigManager;

  private configChangeCallbacks: Set<(event: ConfigChangeEvent) => void> = new Set();
  private isInitialized = false;

  // 性能优化：配置缓存
  private configCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_CACHE_TTL = 30000; // 30秒缓存

  // 性能优化：批量操作队列
  private batchQueue: Map<string, any> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // 100ms 批量延迟

  constructor(
    private readonly configFactory: UnifiedConfigFactoryService,
    private readonly enhancedConfigService: EnhancedUnifiedConfigService
  ) {
    // 初始化配置管理器
    this.deviceConfigManager = this.configFactory.createManager(ConfigType.DEVICE, ConfigScope.DEVICE);
    this.appConfigManager = this.configFactory.createManager(ConfigType.APPLICATION, ConfigScope.USER);
    this.systemConfigManager = this.configFactory.createManager(ConfigType.SYSTEM, ConfigScope.GLOBAL);
    this.userConfigManager = this.configFactory.createManager(ConfigType.USER, ConfigScope.USER);
  }

  /**
   * 初始化配置服务 - 性能优化版本
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 初始化 Desktop 配置服务...');

      // 设置默认配置元数据
      await this.setupDefaultMetadata();

      // 初始化默认配置值
      await this.initializeDefaultConfigs();

      this.isInitialized = true;

      // 异步预热缓存，不阻塞初始化
      setImmediate(() => {
        this.warmupCache().catch(error => {
          console.warn('Cache warmup failed:', error);
        });
      });

      console.log('✅ Desktop 配置服务初始化完成');
    } catch (error) {
      console.error('❌ Desktop 配置服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取设备配置 - 性能优化版本
   */
  async getDeviceConfig(): Promise<DeviceRegistrationConfig> {
    const cacheKey = 'device_config';

    // 检查缓存
    const cached = this.getFromCache<DeviceRegistrationConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    const defaults: DeviceRegistrationConfig = {
      deviceId: '',
      deviceName: '',
      gatewayAddress: '',
      rewardAddress: '',
      code: '',
      isRegistered: false,
      registrationTime: undefined,
      lastUpdated: new Date().toISOString()
    };

    // 批量获取配置以减少 I/O 操作
    const configKeys = ['deviceId', 'deviceName', 'gatewayAddress', 'rewardAddress', 'code', 'isRegistered', 'registrationTime', 'lastUpdated'];
    const configValues = await this.batchGetConfig(this.deviceConfigManager, configKeys, defaults);

    const result: DeviceRegistrationConfig = {
      deviceId: configValues.deviceId,
      deviceName: configValues.deviceName,
      gatewayAddress: configValues.gatewayAddress,
      rewardAddress: configValues.rewardAddress,
      code: configValues.code,
      isRegistered: configValues.isRegistered,
      registrationTime: configValues.registrationTime,
      lastUpdated: configValues.lastUpdated
    };

    // 缓存结果
    this.setCache(cacheKey, result, this.DEFAULT_CACHE_TTL);

    return result;
  }

  /**
   * 更新设备配置 - 性能优化版本
   */
  async updateDeviceConfig(config: Partial<DeviceRegistrationConfig>): Promise<boolean> {
    try {
      // 准备批量更新数据
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return true; // 没有需要更新的内容
      }

      // 添加最后更新时间
      updates.lastUpdated = new Date().toISOString();

      // 使用批量更新
      const success = await this.batchSetConfig(this.deviceConfigManager, updates);

      if (success) {
        // 清除相关缓存
        this.clearCache('device');
        this.notifyConfigChange('device', 'bulk_update', {}, config);
      }

      return success;
    } catch (error) {
      console.error('Failed to update device config:', error);
      return false;
    }
  }

  /**
   * 获取服务配置 - 性能优化版本
   */
  async getServiceConfig(): Promise<ServiceConfig> {
    const cacheKey = 'service_config';

    // 检查缓存
    const cached = this.getFromCache<ServiceConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    const defaults: ServiceConfig = {
      backend: {
        port: 8716,
        host: 'localhost',
        autoStart: true,
        healthCheckInterval: 30000,
        maxStartupTime: 60000
      },
      libp2p: {
        port: 4010,
        nodePort: 15050,
        isGateway: false,
        bootstrapAddrs: "/ip4/34.84.180.62/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X",
        autoStart: true,
        maxStartupTime: 60000
      }
    };

    // 批量获取所有服务配置
    const configKeys = [
      'backend.port', 'backend.host', 'backend.autoStart', 'backend.healthCheckInterval', 'backend.maxStartupTime',
      'libp2p.port', 'libp2p.nodePort', 'libp2p.isGateway', 'libp2p.bootstrapAddrs', 'libp2p.autoStart', 'libp2p.maxStartupTime'
    ];

    const flatDefaults: any = {
      'backend.port': defaults.backend.port,
      'backend.host': defaults.backend.host,
      'backend.autoStart': defaults.backend.autoStart,
      'backend.healthCheckInterval': defaults.backend.healthCheckInterval,
      'backend.maxStartupTime': defaults.backend.maxStartupTime,
      'libp2p.port': defaults.libp2p.port,
      'libp2p.nodePort': defaults.libp2p.nodePort,
      'libp2p.isGateway': defaults.libp2p.isGateway,
      'libp2p.bootstrapAddrs': defaults.libp2p.bootstrapAddrs,
      'libp2p.autoStart': defaults.libp2p.autoStart,
      'libp2p.maxStartupTime': defaults.libp2p.maxStartupTime
    };

    const configValues = await this.batchGetConfig(this.systemConfigManager, configKeys, flatDefaults);

    const result: ServiceConfig = {
      backend: {
        port: configValues['backend.port'],
        host: configValues['backend.host'],
        autoStart: configValues['backend.autoStart'],
        healthCheckInterval: configValues['backend.healthCheckInterval'],
        maxStartupTime: configValues['backend.maxStartupTime']
      },
      libp2p: {
        port: configValues['libp2p.port'],
        nodePort: configValues['libp2p.nodePort'],
        isGateway: configValues['libp2p.isGateway'],
        bootstrapAddrs: configValues['libp2p.bootstrapAddrs'],
        autoStart: configValues['libp2p.autoStart'],
        maxStartupTime: configValues['libp2p.maxStartupTime']
      }
    };

    // 缓存结果
    this.setCache(cacheKey, result, this.DEFAULT_CACHE_TTL);

    return result;
  }

  /**
   * 更新服务配置
   */
  async updateServiceConfig(config: Partial<ServiceConfig>): Promise<boolean> {
    try {
      let allSuccess = true;

      if (config.backend) {
        for (const [key, value] of Object.entries(config.backend)) {
          if (value !== undefined) {
            const success = await this.systemConfigManager.set(`backend.${key}`, value);
            if (!success) allSuccess = false;
          }
        }
      }

      if (config.libp2p) {
        for (const [key, value] of Object.entries(config.libp2p)) {
          if (value !== undefined) {
            const success = await this.systemConfigManager.set(`libp2p.${key}`, value);
            if (!success) allSuccess = false;
          }
        }
      }

      if (allSuccess) {
        this.notifyConfigChange('services', 'bulk_update', {}, config);
      }

      return allSuccess;
    } catch (error) {
      console.error('Failed to update service config:', error);
      return false;
    }
  }

  /**
   * 获取应用设置
   */
  async getAppSettings(): Promise<AppSettingsConfig> {
    const defaults: AppSettingsConfig = {
      autoStart: false,
      minimizeToTray: true,
      startMinimized: false,
      enableNotifications: true,
      logLevel: 'info',
      theme: 'auto',
      language: 'en',
      updateChannel: 'stable'
    };

    return {
      autoStart: await this.appConfigManager.get('autoStart', defaults.autoStart),
      minimizeToTray: await this.appConfigManager.get('minimizeToTray', defaults.minimizeToTray),
      startMinimized: await this.appConfigManager.get('startMinimized', defaults.startMinimized),
      enableNotifications: await this.appConfigManager.get('enableNotifications', defaults.enableNotifications),
      logLevel: await this.appConfigManager.get('logLevel', defaults.logLevel),
      theme: await this.appConfigManager.get('theme', defaults.theme),
      language: await this.appConfigManager.get('language', defaults.language),
      updateChannel: await this.appConfigManager.get('updateChannel', defaults.updateChannel)
    };
  }

  /**
   * 更新应用设置
   */
  async updateAppSettings(settings: Partial<AppSettingsConfig>): Promise<boolean> {
    try {
      let allSuccess = true;

      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          const success = await this.appConfigManager.set(key, value);
          if (!success) allSuccess = false;
        }
      }

      if (allSuccess) {
        this.notifyConfigChange('app', 'bulk_update', {}, settings);
      }

      return allSuccess;
    } catch (error) {
      console.error('Failed to update app settings:', error);
      return false;
    }
  }

  /**
   * 获取系统监控配置
   */
  async getSystemMonitorConfig(): Promise<SystemMonitorConfig> {
    const defaults: SystemMonitorConfig = {
      enableMonitoring: true,
      monitoringInterval: 5000,
      cpuThreshold: 80,
      memoryThreshold: 80,
      diskThreshold: 90,
      enableAlerts: true,
      alertCooldown: 300000
    };

    return {
      enableMonitoring: await this.systemConfigManager.get('monitor.enableMonitoring', defaults.enableMonitoring),
      monitoringInterval: await this.systemConfigManager.get('monitor.monitoringInterval', defaults.monitoringInterval),
      cpuThreshold: await this.systemConfigManager.get('monitor.cpuThreshold', defaults.cpuThreshold),
      memoryThreshold: await this.systemConfigManager.get('monitor.memoryThreshold', defaults.memoryThreshold),
      diskThreshold: await this.systemConfigManager.get('monitor.diskThreshold', defaults.diskThreshold),
      enableAlerts: await this.systemConfigManager.get('monitor.enableAlerts', defaults.enableAlerts),
      alertCooldown: await this.systemConfigManager.get('monitor.alertCooldown', defaults.alertCooldown)
    };
  }

  /**
   * 更新系统监控配置
   */
  async updateSystemMonitorConfig(config: Partial<SystemMonitorConfig>): Promise<boolean> {
    try {
      let allSuccess = true;

      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          const success = await this.systemConfigManager.set(`monitor.${key}`, value);
          if (!success) allSuccess = false;
        }
      }

      if (allSuccess) {
        this.notifyConfigChange('system', 'bulk_update', {}, config);
      }

      return allSuccess;
    } catch (error) {
      console.error('Failed to update system monitor config:', error);
      return false;
    }
  }

  /**
   * 获取网络配置
   */
  async getNetworkConfig(): Promise<NetworkConfig> {
    const defaults: NetworkConfig = {
      proxy: {
        enabled: false,
        type: 'http',
        host: '',
        port: 8080
      },
      timeout: {
        connection: 5000,
        request: 10000,
        response: 10000
      },
      retries: {
        maxAttempts: 3,
        backoffDelay: 1000
      }
    };

    return {
      proxy: {
        enabled: await this.userConfigManager.get('network.proxy.enabled', defaults.proxy.enabled),
        type: await this.userConfigManager.get('network.proxy.type', defaults.proxy.type),
        host: await this.userConfigManager.get('network.proxy.host', defaults.proxy.host),
        port: await this.userConfigManager.get('network.proxy.port', defaults.proxy.port),
        username: await this.userConfigManager.get('network.proxy.username', defaults.proxy.username),
        password: await this.userConfigManager.get('network.proxy.password', defaults.proxy.password)
      },
      timeout: {
        connection: await this.userConfigManager.get('network.timeout.connection', defaults.timeout.connection),
        request: await this.userConfigManager.get('network.timeout.request', defaults.timeout.request),
        response: await this.userConfigManager.get('network.timeout.response', defaults.timeout.response)
      },
      retries: {
        maxAttempts: await this.userConfigManager.get('network.retries.maxAttempts', defaults.retries.maxAttempts),
        backoffDelay: await this.userConfigManager.get('network.retries.backoffDelay', defaults.retries.backoffDelay)
      }
    };
  }

  /**
   * 更新网络配置
   */
  async updateNetworkConfig(config: Partial<NetworkConfig>): Promise<boolean> {
    try {
      let allSuccess = true;

      if (config.proxy) {
        for (const [key, value] of Object.entries(config.proxy)) {
          if (value !== undefined) {
            const success = await this.userConfigManager.set(`network.proxy.${key}`, value);
            if (!success) allSuccess = false;
          }
        }
      }

      if (config.timeout) {
        for (const [key, value] of Object.entries(config.timeout)) {
          if (value !== undefined) {
            const success = await this.userConfigManager.set(`network.timeout.${key}`, value);
            if (!success) allSuccess = false;
          }
        }
      }

      if (config.retries) {
        for (const [key, value] of Object.entries(config.retries)) {
          if (value !== undefined) {
            const success = await this.userConfigManager.set(`network.retries.${key}`, value);
            if (!success) allSuccess = false;
          }
        }
      }

      if (allSuccess) {
        this.notifyConfigChange('network', 'bulk_update', {}, config);
      }

      return allSuccess;
    } catch (error) {
      console.error('Failed to update network config:', error);
      return false;
    }
  }

  /**
   * 获取日志配置
   */
  async getLoggingConfig(): Promise<LoggingConfig> {
    const defaults: LoggingConfig = {
      level: 'info',
      enableFileLogging: true,
      maxFileSize: 10485760, // 10MB
      maxFiles: 5,
      logDirectory: path.join(os.homedir(), '.sightai', 'logs'),
      enableConsoleLogging: true,
      enableRemoteLogging: false
    };

    return {
      level: await this.systemConfigManager.get('logging.level', defaults.level),
      enableFileLogging: await this.systemConfigManager.get('logging.enableFileLogging', defaults.enableFileLogging),
      maxFileSize: await this.systemConfigManager.get('logging.maxFileSize', defaults.maxFileSize),
      maxFiles: await this.systemConfigManager.get('logging.maxFiles', defaults.maxFiles),
      logDirectory: await this.systemConfigManager.get('logging.logDirectory', defaults.logDirectory),
      enableConsoleLogging: await this.systemConfigManager.get('logging.enableConsoleLogging', defaults.enableConsoleLogging),
      enableRemoteLogging: await this.systemConfigManager.get('logging.enableRemoteLogging', defaults.enableRemoteLogging),
      remoteEndpoint: await this.systemConfigManager.get('logging.remoteEndpoint', defaults.remoteEndpoint)
    };
  }

  /**
   * 更新日志配置
   */
  async updateLoggingConfig(config: Partial<LoggingConfig>): Promise<boolean> {
    try {
      let allSuccess = true;

      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          const success = await this.systemConfigManager.set(`logging.${key}`, value);
          if (!success) allSuccess = false;
        }
      }

      if (allSuccess) {
        this.notifyConfigChange('logging', 'bulk_update', {}, config);
      }

      return allSuccess;
    } catch (error) {
      console.error('Failed to update logging config:', error);
      return false;
    }
  }

  /**
   * 获取完整配置
   */
  async getAllConfig(): Promise<DesktopAppConfig> {
    const [device, services, app, system, network, logging] = await Promise.all([
      this.getDeviceConfig(),
      this.getServiceConfig(),
      this.getAppSettings(),
      this.getSystemMonitorConfig(),
      this.getNetworkConfig(),
      this.getLoggingConfig()
    ]);

    return {
      device,
      services,
      app,
      system,
      network,
      logging,
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 验证配置
   */
  async validateConfig(): Promise<ConfigValidationResult> {
    try {
      const validationResults = await this.enhancedConfigService.validateAllConfigs();
      const errors: Array<{ section: string; key: string; message: string; severity: 'error' | 'warning' }> = [];
      const warnings: Array<{ section: string; key: string; message: string }> = [];

      // 转换验证结果格式
      for (const [configType, result] of Object.entries(validationResults)) {
        for (const error of result.errors) {
          errors.push({
            section: configType,
            key: error.key,
            message: error.message,
            severity: error.severity
          });
        }

        for (const warning of result.warnings) {
          warnings.push({
            section: configType,
            key: warning.key,
            message: warning.message
          });
        }
      }

      return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Failed to validate config:', error);
      return {
        isValid: false,
        errors: [{
          section: 'validation',
          key: 'system',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * 重置配置到默认值
   */
  async resetConfig(sections?: Array<keyof DesktopAppConfig>): Promise<boolean> {
    try {
      const managersToReset = sections ?
        this.getManagersForSections(sections) :
        [this.deviceConfigManager, this.appConfigManager, this.systemConfigManager, this.userConfigManager];

      const resetPromises = managersToReset.map(manager => manager.reset());
      const results = await Promise.all(resetPromises);

      const allSuccess = results.every(result => result);

      if (allSuccess) {
        this.notifyConfigChange('app', 'reset', {}, { sections: sections || 'all' });
      }

      return allSuccess;
    } catch (error) {
      console.error('Failed to reset config:', error);
      return false;
    }
  }

  /**
   * 备份配置
   */
  async backupConfig(description?: string): Promise<{ success: boolean; backupId?: string; message: string }> {
    try {
      const backup = await this.enhancedConfigService.backupAllConfigs(description);
      return {
        success: true,
        backupId: backup.id,
        message: `Configuration backup created successfully: ${backup.id}`
      };
    } catch (error) {
      console.error('Failed to backup config:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 恢复配置
   */
  async restoreConfig(backupId: string): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.enhancedConfigService.restoreAllConfigs(backupId);
      return {
        success,
        message: success ?
          `Configuration restored successfully from backup: ${backupId}` :
          `Failed to restore configuration from backup: ${backupId}`
      };
    } catch (error) {
      console.error('Failed to restore config:', error);
      return {
        success: false,
        message: `Failed to restore configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 监听配置变更
   */
  onConfigChange(callback: (event: ConfigChangeEvent) => void): void {
    this.configChangeCallbacks.add(callback);
  }

  /**
   * 移除配置变更监听
   */
  offConfigChange(callback: (event: ConfigChangeEvent) => void): void {
    this.configChangeCallbacks.delete(callback);
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      return {
        platform: os.platform(),
        arch: os.arch(),
        version: os.release(),
        uptime: os.uptime(),
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usage: (usedMem / totalMem) * 100
        },
        cpu: {
          model: os.cpus()[0]?.model || 'Unknown',
          cores: os.cpus().length,
          usage: 0 // CPU usage calculation would need additional implementation
        },
        disk: {
          total: 0, // Disk info would need additional implementation
          used: 0,
          free: 0,
          usage: 0
        },
        network: {
          interfaces: Object.entries(os.networkInterfaces()).map(([name, interfaces]) => ({
            name,
            address: interfaces?.[0]?.address || '',
            type: interfaces?.[0]?.family || '',
            isActive: !interfaces?.[0]?.internal
          }))
        }
      };
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }

  /**
   * 获取应用信息
   */
  async getAppInfo(): Promise<AppInfo> {
    try {
      return {
        version: app.getVersion(),
        buildDate: new Date().toISOString(), // This should be set during build
        startTime: Date.now(), // This should be set when app starts
        uptime: Date.now() - Date.now(), // This should calculate from actual start time
        environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
        electronVersion: process.versions.electron || 'Unknown',
        nodeVersion: process.versions.node || 'Unknown',
        chromiumVersion: process.versions.chrome || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to get app info:', error);
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    try {
      // This would need to be integrated with actual service managers
      const serviceConfig = await this.getServiceConfig();

      return {
        backend: {
          isRunning: false, // This should check actual service status
          port: serviceConfig.backend.port,
          health: 'unknown'
        },
        libp2p: {
          isRunning: false, // This should check actual service status
          port: serviceConfig.libp2p.port,
          nodePort: serviceConfig.libp2p.nodePort,
          health: 'unknown'
        }
      };
    } catch (error) {
      console.error('Failed to get service status:', error);
      throw error;
    }
  }

  /**
   * 清理资源 - 性能优化版本
   */
  async cleanup(): Promise<void> {
    try {
      // 清理缓存
      this.configCache.clear();

      // 清理批量操作定时器
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }

      // 清理批量队列
      this.batchQueue.clear();

      // 清理回调
      this.configChangeCallbacks.clear();

      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to cleanup desktop config service:', error);
      throw error;
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 性能优化：从缓存获取数据
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.configCache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.configCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * 性能优化：设置缓存
   */
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.configCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 性能优化：清除缓存
   */
  private clearCache(pattern?: string): void {
    if (!pattern) {
      this.configCache.clear();
      return;
    }

    for (const key of this.configCache.keys()) {
      if (key.includes(pattern)) {
        this.configCache.delete(key);
      }
    }
  }

  /**
   * 性能优化：批量获取配置
   */
  private async batchGetConfig(manager: IConfigManager, keys: string[], defaults: any): Promise<any> {
    const result: any = {};

    // 如果配置管理器支持批量操作，使用批量操作
    if (typeof (manager as any).batchGet === 'function') {
      try {
        const batchResult = await (manager as any).batchGet(keys);
        for (const key of keys) {
          result[key] = batchResult[key] !== undefined ? batchResult[key] : defaults[key];
        }
        return result;
      } catch (error) {
        console.warn('Batch get failed, falling back to individual gets:', error);
      }
    }

    // 回退到并行的单个获取操作
    const promises = keys.map(async (key) => {
      const value = await manager.get(key, defaults[key]);
      return { key, value };
    });

    const results = await Promise.all(promises);
    for (const { key, value } of results) {
      result[key] = value;
    }

    return result;
  }

  /**
   * 性能优化：批量设置配置
   */
  private async batchSetConfig(manager: IConfigManager, updates: Record<string, any>): Promise<boolean> {
    // 如果配置管理器支持批量操作，使用批量操作
    if (typeof (manager as any).batchSet === 'function') {
      try {
        return await (manager as any).batchSet(updates);
      } catch (error) {
        console.warn('Batch set failed, falling back to individual sets:', error);
      }
    }

    // 回退到并行的单个设置操作
    const promises = Object.entries(updates).map(async ([key, value]) => {
      return await manager.set(key, value);
    });

    const results = await Promise.all(promises);
    return results.every(result => result);
  }

  /**
   * 性能优化：防抖批量更新
   */
  private debouncedBatchUpdate(key: string, value: any, callback: () => Promise<void>): void {
    this.batchQueue.set(key, value);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(async () => {
      try {
        await callback();
        this.batchQueue.clear();
      } catch (error) {
        console.error('Debounced batch update failed:', error);
      } finally {
        this.batchTimeout = null;
      }
    }, this.BATCH_DELAY);
  }

  /**
   * 性能监控：获取缓存统计信息
   */
  getCacheStats(): { size: number; hitRate: number; memoryUsage: number } {
    const size = this.configCache.size;
    const memoryUsage = JSON.stringify([...this.configCache.entries()]).length;

    return {
      size,
      hitRate: 0, // 可以在实际使用中添加命中率统计
      memoryUsage
    };
  }

  /**
   * 性能优化：预热缓存
   */
  async warmupCache(): Promise<void> {
    try {
      console.log('🔥 开始预热配置缓存...');

      // 并行预加载常用配置
      const warmupPromises = [
        this.getDeviceConfig(),
        this.getServiceConfig(),
        this.getAppSettings(),
        this.getSystemMonitorConfig()
      ];

      await Promise.all(warmupPromises);
      console.log('✅ 配置缓存预热完成');
    } catch (error) {
      console.error('❌ 配置缓存预热失败:', error);
    }
  }

  /**
   * 设置默认配置元数据
   */
  private async setupDefaultMetadata(): Promise<void> {
    // 这里可以设置配置项的元数据，如验证规则、描述等
    // 由于统一配置管理器已经处理了元数据，这里暂时留空
  }

  /**
   * 初始化默认配置
   */
  private async initializeDefaultConfigs(): Promise<void> {
    // 确保所有配置都有默认值
    // 统一配置管理器会处理默认值，这里可以做一些特殊的初始化
  }

  /**
   * 通知配置变更
   */
  private notifyConfigChange(section: keyof DesktopAppConfig, key: string, oldValue: any, newValue: any): void {
    const event: ConfigChangeEvent = {
      section,
      key,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      source: 'main'
    };

    this.configChangeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in config change callback:', error);
      }
    });
  }

  /**
   * 根据配置节获取对应的管理器
   */
  private getManagersForSections(sections: Array<keyof DesktopAppConfig>): IConfigManager[] {
    const managers: IConfigManager[] = [];

    for (const section of sections) {
      switch (section) {
        case 'device':
          managers.push(this.deviceConfigManager);
          break;
        case 'services':
        case 'system':
        case 'logging':
          managers.push(this.systemConfigManager);
          break;
        case 'app':
          managers.push(this.appConfigManager);
          break;
        case 'network':
          managers.push(this.userConfigManager);
          break;
      }
    }

    return [...new Set(managers)]; // 去重
  }
}
