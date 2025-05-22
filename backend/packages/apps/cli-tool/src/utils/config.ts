import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  gatewayUrl?: string;
  nodeCode?: string;
  gatewayApiKey?: string;
  rewardAddress?: string;
  apiBasePath?: string;
  lastRegistration?: string;
  autoStart?: boolean;
}

export class ConfigManager {
  private configPath: string;
  private config: CliConfig = {};

  constructor() {
    // 配置文件存储在用户主目录下的 .sightai 文件夹中
    const configDir = path.join(os.homedir(), '.sightai');
    this.configPath = path.join(configDir, 'cli-config.json');
    
    // 确保配置目录存在
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.loadConfig();
  }

  // 加载配置
  private loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults');
      this.config = {};
    }
  }

  // 保存配置
  private saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  // 获取配置值
  get<K extends keyof CliConfig>(key: K): CliConfig[K] {
    return this.config[key];
  }

  // 设置配置值
  set<K extends keyof CliConfig>(key: K, value: CliConfig[K]) {
    this.config[key] = value;
    this.saveConfig();
  }

  // 获取所有配置
  getAll(): CliConfig {
    return { ...this.config };
  }

  // 更新多个配置
  update(updates: Partial<CliConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  // 清除配置
  clear() {
    this.config = {};
    this.saveConfig();
  }

  // 检查是否已配置注册信息
  hasRegistrationInfo(): boolean {
    return !!(
      this.config.gatewayUrl &&
      this.config.nodeCode &&
      this.config.gatewayApiKey &&
      this.config.rewardAddress
    );
  }

  // 获取注册信息
  getRegistrationInfo() {
    if (!this.hasRegistrationInfo()) {
      return null;
    }
    
    return {
      gatewayUrl: this.config.gatewayUrl!,
      nodeCode: this.config.nodeCode!,
      gatewayApiKey: this.config.gatewayApiKey!,
      rewardAddress: this.config.rewardAddress!,
      apiBasePath: this.config.apiBasePath || 'http://localhost:8716'
    };
  }

  // 保存注册信息
  saveRegistrationInfo(info: {
    gatewayUrl: string;
    nodeCode: string;
    gatewayApiKey: string;
    rewardAddress: string;
    apiBasePath?: string;
  }) {
    this.update({
      gatewayUrl: info.gatewayUrl,
      nodeCode: info.nodeCode,
      gatewayApiKey: info.gatewayApiKey,
      rewardAddress: info.rewardAddress,
      apiBasePath: info.apiBasePath || 'http://localhost:8716',
      lastRegistration: new Date().toISOString()
    });
  }

  // 清除注册信息
  clearRegistrationInfo() {
    this.update({
      gatewayUrl: undefined,
      nodeCode: undefined,
      gatewayApiKey: undefined,
      rewardAddress: undefined,
      apiBasePath: undefined,
      lastRegistration: undefined
    });
  }
}

// 单例实例
export const configManager = new ConfigManager();
