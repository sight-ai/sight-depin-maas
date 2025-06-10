import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FSWatcher } from 'fs';
import {
  FrameworkConfig,
  AppConfig,
  ConfigValidationResult,
  ConfigChangeEvent,
  ConfigChangeCallback,
  LocalConfig
} from '@saito/models';

/**
 * 本地配置服务 - 增强版
 *
 * 负责管理 ~/.sightai/ 目录下的配置文件
 * 支持全局配置和网关特定配置
 *
 * 新增功能：
 * 1. 类型安全的配置方法
 * 2. 配置验证和错误处理
 * 3. 配置变更监听
 * 4. 配置完整性检查
 */
@Injectable()
export class LocalConfigService {
  private readonly logger = new Logger(LocalConfigService.name);
  private readonly baseConfigDir: string;
  private readonly configWatchers: Map<string, FSWatcher> = new Map();
  private readonly changeCallbacks: Map<string, Array<ConfigChangeCallback>> = new Map();

  constructor() {
    this.baseConfigDir = path.join(os.homedir(), '.sightai');
    this.ensureConfigDirectory();
  }

  /**
   * 获取配置值
   * @param configFile 配置文件名 (如 'config.json')
   * @param key 配置键名
   * @param gatewayPath 可选的网关路径 (如 'gateway/www.sightai.io/model/gateway-benchmark')
   */
  get<T = any>(configFile: string, key: string, gatewayPath?: string): T | null {
    try {
      const configPath = this.getConfigFilePath(configFile, gatewayPath);
      
      if (!fs.existsSync(configPath)) {
        this.logger.debug(`Config file not found: ${configPath}`);
        return null;
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      const value = this.getNestedValue(config, key);
      this.logger.debug(`Read config: ${key} = ${value} from ${configPath}`);
      
      return value;
    } catch (error) {
      this.logger.error(`Failed to read config ${key} from ${configFile}:`, error);
      return null;
    }
  }

  /**
   * 设置配置值
   * @param configFile 配置文件名
   * @param key 配置键名
   * @param value 配置值
   * @param gatewayPath 可选的网关路径
   */
  set<T = any>(configFile: string, key: string, value: T, gatewayPath?: string): boolean {
    try {
      const configPath = this.getConfigFilePath(configFile, gatewayPath);
      
      // 确保目录存在
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 读取现有配置或创建新配置
      let config = {};
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configContent);
      }

      // 设置嵌套值
      this.setNestedValue(config, key, value);

      // 写入文件
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      
      this.logger.log(`Set config: ${key} = ${value} in ${configPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set config ${key} in ${configFile}:`, error);
      return false;
    }
  }

  /**
   * 删除配置值
   * @param configFile 配置文件名
   * @param key 配置键名
   * @param gatewayPath 可选的网关路径
   */
  delete(configFile: string, key: string, gatewayPath?: string): boolean {
    try {
      const configPath = this.getConfigFilePath(configFile, gatewayPath);
      
      if (!fs.existsSync(configPath)) {
        return true; // 文件不存在，认为删除成功
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      this.deleteNestedValue(config, key);
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      
      this.logger.log(`Deleted config: ${key} from ${configPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete config ${key} from ${configFile}:`, error);
      return false;
    }
  }

  /**
   * 检查配置是否存在
   * @param configFile 配置文件名
   * @param key 配置键名
   * @param gatewayPath 可选的网关路径
   */
  has(configFile: string, key: string, gatewayPath?: string): boolean {
    return this.get(configFile, key, gatewayPath) !== null;
  }

  /**
   * 获取整个配置文件内容
   * @param configFile 配置文件名
   * @param gatewayPath 可选的网关路径
   */
  getAll(configFile: string, gatewayPath?: string): Record<string, any> | null {
    try {
      const configPath = this.getConfigFilePath(configFile, gatewayPath);
      
      if (!fs.existsSync(configPath)) {
        return null;
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      this.logger.error(`Failed to read config file ${configFile}:`, error);
      return null;
    }
  }

  /**
   * 获取客户端类型 (类型安全版本)
   */
  getClientType(): 'ollama' | 'vllm' | null {
    try {
      const clientType = this.get<'ollama' | 'vllm'>('config.json', 'client_type');

      // 验证客户端类型
      if (clientType && !['ollama', 'vllm'].includes(clientType)) {
        this.logger.warn(`Invalid client type: ${clientType}, resetting to null`);
        return null;
      }

      return clientType;
    } catch (error) {
      this.logger.error('Failed to get client type:', error);
      return null;
    }
  }

  /**
   * 设置客户端类型 (类型安全版本)
   */
  setClientType(clientType: 'ollama' | 'vllm'): boolean {
    try {
      // 验证输入
      if (!['ollama', 'vllm'].includes(clientType)) {
        throw new Error(`Invalid client type: ${clientType}`);
      }

      const success = this.set('config.json', 'client_type', clientType);

      if (success) {
        this.logger.log(`Client type set to: ${clientType}`);
        this.notifyConfigChange('config.json', 'client_type', null, clientType);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to set client type: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 确保配置目录存在
   */
  private ensureConfigDirectory(): void {
    if (!fs.existsSync(this.baseConfigDir)) {
      fs.mkdirSync(this.baseConfigDir, { recursive: true });
      this.logger.log(`Created config directory: ${this.baseConfigDir}`);
    }
  }

  /**
   * 获取配置文件完整路径
   */
  private getConfigFilePath(configFile: string, gatewayPath?: string): string {
    if (gatewayPath) {
      return path.join(this.baseConfigDir, gatewayPath, configFile);
    }
    return path.join(this.baseConfigDir, configFile);
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, key: string): any {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return null;
      }
      current = current[k];
    }
    
    return current;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: any, key: string): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
        return; // 路径不存在，无需删除
      }
      current = current[k];
    }
    
    delete current[keys[keys.length - 1]];
  }

  // =============================================================================
  // 新增的增强方法
  // =============================================================================

  /**
   * 获取框架特定配置
   */
  getFrameworkConfig(framework: 'ollama' | 'vllm'): FrameworkConfig | null {
    try {
      const configFile = `${framework}-config.json`;
      return this.get<FrameworkConfig>(configFile, 'config');
    } catch (error) {
      this.logger.error(`Failed to get ${framework} config:`, error);
      return null;
    }
  }

  /**
   * 设置框架特定配置
   */
  setFrameworkConfig(framework: 'ollama' | 'vllm', config: FrameworkConfig): boolean {
    try {
      const configFile = `${framework}-config.json`;
      const success = this.set(configFile, 'config', config);

      if (success) {
        this.logger.log(`${framework} config updated`);
        this.notifyConfigChange(configFile, 'config', null, config);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to set ${framework} config:`, error);
      return false;
    }
  }

  /**
   * 获取完整的应用配置
   */
  getAppConfig(): AppConfig {
    try {
      const clientType = this.getClientType();
      const frameworkConfig = clientType ? this.getFrameworkConfig(clientType) : null;

      return {
        clientType,
        frameworkConfig,
        lastUpdated: new Date().toISOString(),
        environment: 'production',
        logLevel: 'info',
        enableMetrics: true,
        enableTelemetry: false
      };
    } catch (error) {
      this.logger.error('Failed to get app config:', error);
      return {
        clientType: null,
        frameworkConfig: null,
        lastUpdated: new Date().toISOString(),
        environment: 'production',
        logLevel: 'info',
        enableMetrics: true,
        enableTelemetry: false
      };
    }
  }

  /**
   * 验证配置完整性
   */
  validateConfig(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查客户端类型
      const clientType = this.getClientType();
      if (!clientType) {
        errors.push('Client type is not set');
      } else {
        // 检查框架特定配置
        const frameworkConfig = this.getFrameworkConfig(clientType);
        if (!frameworkConfig) {
          warnings.push(`${clientType} configuration is missing`);
        } else {
          // 验证框架配置
          const configErrors = this.validateFrameworkConfig(clientType, frameworkConfig);
          errors.push(...configErrors);
        }
      }

      // 检查配置目录权限
      if (!this.checkConfigDirectoryPermissions()) {
        errors.push('Configuration directory is not writable');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * 监听配置变更
   */
  watchConfig(configFile: string, callback: ConfigChangeCallback): void {
    try {
      const configPath = this.getConfigFilePath(configFile);

      // 添加回调
      if (!this.changeCallbacks.has(configFile)) {
        this.changeCallbacks.set(configFile, []);
      }
      this.changeCallbacks.get(configFile)!.push(callback);

      // 如果还没有监听器，创建一个
      if (!this.configWatchers.has(configFile)) {
        const watcher = fs.watch(configPath, (eventType) => {
          if (eventType === 'change') {
            this.handleConfigChange(configFile);
          }
        });

        this.configWatchers.set(configFile, watcher);
        this.logger.debug(`Started watching config file: ${configFile}`);
      }

    } catch (error) {
      this.logger.error(`Failed to watch config file ${configFile}:`, error);
    }
  }

  /**
   * 停止监听配置变更
   */
  unwatchConfig(configFile: string): void {
    const watcher = this.configWatchers.get(configFile);
    if (watcher) {
      watcher.close();
      this.configWatchers.delete(configFile);
      this.changeCallbacks.delete(configFile);
      this.logger.debug(`Stopped watching config file: ${configFile}`);
    }
  }

  /**
   * 重置配置到默认值
   */
  resetToDefaults(): boolean {
    try {
      // 删除所有配置文件
      const configFiles = ['config.json', 'ollama-config.json', 'vllm-config.json', 'resource-config.json'];

      for (const file of configFiles) {
        const configPath = this.getConfigFilePath(file);
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      }

      // 设置默认客户端类型
      this.setClientType('ollama');

      this.logger.log('Configuration reset to defaults');
      return true;

    } catch (error) {
      this.logger.error(`Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  // =============================================================================
  // 私有辅助方法 (新增)
  // =============================================================================

  /**
   * 验证框架配置
   */
  private validateFrameworkConfig(framework: string, config: FrameworkConfig): string[] {
    const errors: string[] = [];

    if (framework === 'ollama') {
      if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
        errors.push('Invalid Ollama base URL');
      }
    } else if (framework === 'vllm') {
      if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
        errors.push('Invalid vLLM base URL');
      }
      // vLLM 可能需要 API Key，但不是必须的
    }

    return errors;
  }

  /**
   * 检查配置目录权限
   */
  private checkConfigDirectoryPermissions(): boolean {
    try {
      const testFile = path.join(this.baseConfigDir, '.test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 处理配置变更
   */
  private handleConfigChange(configFile: string): void {
    try {
      const config = this.getAll(configFile);
      // 这里可以添加更详细的变更检测逻辑
      this.notifyConfigChange(configFile, 'file_changed', null, config);
    } catch (error) {
      this.logger.error(`Failed to handle config change for ${configFile}:`, error);
    }
  }

  /**
   * 通知配置变更
   */
  private notifyConfigChange(configFile: string, key: string, oldValue: any, newValue: any): void {
    const callbacks = this.changeCallbacks.get(configFile);
    if (callbacks) {
      const event: ConfigChangeEvent = {
        configFile,
        key,
        oldValue,
        newValue,
        timestamp: new Date().toISOString()
      };

      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          this.logger.error('Config change callback failed:', error);
        }
      });
    }
  }
}
