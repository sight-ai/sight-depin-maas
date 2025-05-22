import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface UnifiedAppConfig {
  theme: 'default' | 'minimal' | 'colorful';
  autoStartBackend: boolean;
  showDetailedLogs: boolean;
  checkUpdates: boolean;
  language: 'zh-CN' | 'en-US';
  shortcuts: {
    [key: string]: string;
  };
  lastUsed: {
    command?: string;
    timestamp: number;
  };
}

export class ConfigManager {
  private configPath: string;
  private defaultConfig: UnifiedAppConfig = {
    theme: 'default',
    autoStartBackend: false,
    showDetailedLogs: false,
    checkUpdates: true,
    language: 'zh-CN',
    shortcuts: {
      'q': 'exit',
      's': 'status',
      'r': 'register',
      'm': 'model',
      'b': 'backend'
    },
    lastUsed: {
      timestamp: Date.now()
    }
  };

  constructor() {
    const configDir = path.join(os.homedir(), '.sightai');
    this.configPath = path.join(configDir, 'unified-app-config.json');
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  public load(): UnifiedAppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(configData);
        return { ...this.defaultConfig, ...config };
      }
    } catch (error) {
      console.warn('配置文件加载失败，使用默认配置');
    }
    return this.defaultConfig;
  }

  public save(config: UnifiedAppConfig): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.warn('配置文件保存失败');
    }
  }

  public get<K extends keyof UnifiedAppConfig>(key: K): UnifiedAppConfig[K] {
    const config = this.load();
    return config[key];
  }

  public set<K extends keyof UnifiedAppConfig>(key: K, value: UnifiedAppConfig[K]): void {
    const config = this.load();
    config[key] = value;
    this.save(config);
  }

  public updateLastUsed(command?: string): void {
    const config = this.load();
    config.lastUsed = {
      command,
      timestamp: Date.now()
    };
    this.save(config);
  }

  public getShortcut(key: string): string | undefined {
    const config = this.load();
    return config.shortcuts[key];
  }

  public setShortcut(key: string, command: string): void {
    const config = this.load();
    config.shortcuts[key] = command;
    this.save(config);
  }

  public reset(): void {
    this.save(this.defaultConfig);
  }
}

export const configManager = new ConfigManager();
