import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import chokidar from 'chokidar';
import { 
  IConfigSource, 
  ConfigChangeCallback, 
  ConfigFormat,
  ConfigError 
} from '../abstractions/config.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 文件配置源服务 
 * 只负责文件系统的配置读写和监听
 */
@Injectable()
export class FileConfigSourceService implements IConfigSource {
  private readonly logger = new Logger(FileConfigSourceService.name);
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private changeCallback: ConfigChangeCallback | null = null;

  constructor(
    public readonly name: string,
    public readonly priority: number,
    private readonly filePath: string,
    private readonly format: ConfigFormat = ConfigFormat.JSON,
    public readonly isReadonly: boolean = false,
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * 加载配置
   */
  async load(): Promise<Record<string, any>> {
    try {
      this.logger.debug(`Loading config from file: ${this.filePath}`);
      
      const exists = await this.fileExists();
      if (!exists) {
        this.logger.debug(`Config file does not exist: ${this.filePath}`);
        return {};
      }

      const content = await fs.readFile(this.filePath, 'utf-8');
      const config = this.parseContent(content);
      
      this.logger.debug(`Loaded config from file: ${this.filePath}`);
      return config;
    } catch (error) {
      this.logger.error(`Failed to load config from file: ${this.filePath}`, error);
      throw new ConfigError(
        `Failed to load config from file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_LOAD_ERROR',
        { filePath: this.filePath, format: this.format }
      );
    }
  }

  /**
   * 保存配置
   */
  async save(config: Record<string, any>): Promise<void> {
    if (this.isReadonly) {
      throw new ConfigError(
        'Cannot save to readonly config source',
        'READONLY_SOURCE',
        { name: this.name, filePath: this.filePath }
      );
    }

    try {
      this.logger.debug(`Saving config to file: ${this.filePath}`);
      
      // 确保目录存在
      await this.ensureDirectoryExists();
      
      const content = this.stringifyContent(config);
      await fs.writeFile(this.filePath, content, 'utf-8');
      
      this.logger.debug(`Saved config to file: ${this.filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save config to file: ${this.filePath}`, error);
      throw new ConfigError(
        `Failed to save config to file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_SAVE_ERROR',
        { filePath: this.filePath, format: this.format }
      );
    }
  }

  /**
   * 监听配置变化
   */
  async watch(callback: ConfigChangeCallback): Promise<void> {
    try {
      this.logger.debug(`Starting to watch config file: ${this.filePath}`);
      
      this.changeCallback = callback;
      
      // 确保目录存在
      await this.ensureDirectoryExists();
      
      this.watcher = chokidar.watch(this.filePath, {
        persistent: true,
        ignoreInitial: true
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.watcher as any).on('change', async () => {
        try {
          this.logger.debug(`Config file changed: ${this.filePath}`);
          
          const newConfig = await this.load();
          
          if (this.changeCallback) {
            this.changeCallback({
              key: '*', // 文件变化影响所有键
              oldValue: null, // 无法获取旧值
              newValue: newConfig,
              source: this.name,
              timestamp: new Date(),
              type: 'set'
            });
          }
        } catch (error) {
          this.logger.error(`Error handling config file change: ${this.filePath}`, error);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.watcher as any).on('unlink', () => {
        this.logger.warn(`Config file deleted: ${this.filePath}`);
        
        if (this.changeCallback) {
          this.changeCallback({
            key: '*',
            oldValue: null,
            newValue: {},
            source: this.name,
            timestamp: new Date(),
            type: 'clear'
          });
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.watcher as any).on('error', (error: Error) => {
        this.logger.error(`Config file watcher error: ${this.filePath}`, error);
      });

      this.logger.debug(`Started watching config file: ${this.filePath}`);
    } catch (error) {
      this.logger.error(`Failed to start watching config file: ${this.filePath}`, error);
      throw new ConfigError(
        `Failed to start watching config file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_WATCH_ERROR',
        { filePath: this.filePath }
      );
    }
  }

  /**
   * 停止监听
   */
  async unwatch(): Promise<void> {
    try {
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
        this.changeCallback = null;
        this.logger.debug(`Stopped watching config file: ${this.filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to stop watching config file: ${this.filePath}`, error);
      throw new ConfigError(
        `Failed to stop watching config file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_UNWATCH_ERROR',
        { filePath: this.filePath }
      );
    }
  }

  /**
   * 检查配置源是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 检查文件是否存在或目录是否可写
      const exists = await this.fileExists();
      if (exists) {
        // 文件存在，检查是否可读
        await fs.access(this.filePath, fs.constants.R_OK);
        
        // 如果不是只读，还要检查是否可写
        if (!this.isReadonly) {
          await fs.access(this.filePath, fs.constants.W_OK);
        }
        
        return true;
      } else {
        // 文件不存在，检查目录是否可写（用于创建文件）
        if (this.isReadonly) {
          return false;
        }
        
        const dir = dirname(this.filePath);
        await fs.access(dir, fs.constants.W_OK);
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(): Promise<{
    exists: boolean;
    size: number;
    lastModified: Date;
    isReadable: boolean;
    isWritable: boolean;
  }> {
    try {
      const exists = await this.fileExists();
      
      if (!exists) {
        return {
          exists: false,
          size: 0,
          lastModified: new Date(0),
          isReadable: false,
          isWritable: !this.isReadonly
        };
      }

      const stats = await fs.stat(this.filePath);
      
      let isReadable = false;
      let isWritable = false;
      
      try {
        await fs.access(this.filePath, fs.constants.R_OK);
        isReadable = true;
      } catch {
        // 文件不可读，保持 isReadable = false
      }
      
      try {
        if (!this.isReadonly) {
          await fs.access(this.filePath, fs.constants.W_OK);
          isWritable = true;
        }
      } catch {
        // 文件不可写，保持 isWritable = false
      }

      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        isReadable,
        isWritable
      };
    } catch (error) {
      this.logger.error(`Failed to get file info: ${this.filePath}`, error);
      throw new ConfigError(
        `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_INFO_ERROR',
        { filePath: this.filePath }
      );
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * 解析文件内容
   */
  private parseContent(content: string): Record<string, unknown> {
    try {
      switch (this.format) {
        case ConfigFormat.JSON:
          return JSON.parse(content);
        case ConfigFormat.YAML:
          // 需要安装 yaml 包
          throw new ConfigError('YAML format not implemented', 'FORMAT_NOT_IMPLEMENTED');
        case ConfigFormat.TOML:
          // 需要安装 toml 包
          throw new ConfigError('TOML format not implemented', 'FORMAT_NOT_IMPLEMENTED');
        case ConfigFormat.INI:
          // 需要安装 ini 包
          throw new ConfigError('INI format not implemented', 'FORMAT_NOT_IMPLEMENTED');
        default:
          throw new ConfigError(`Unsupported format: ${this.format}`, 'UNSUPPORTED_FORMAT');
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      
      throw new ConfigError(
        `Failed to parse config content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARSE_ERROR',
        { format: this.format, content: content.substring(0, 100) }
      );
    }
  }

  /**
   * 序列化配置内容
   */
  private stringifyContent(config: Record<string, unknown>): string {
    try {
      switch (this.format) {
        case ConfigFormat.JSON:
          return JSON.stringify(config, null, 2);
        case ConfigFormat.YAML:
          throw new ConfigError('YAML format not implemented', 'FORMAT_NOT_IMPLEMENTED');
        case ConfigFormat.TOML:
          throw new ConfigError('TOML format not implemented', 'FORMAT_NOT_IMPLEMENTED');
        case ConfigFormat.INI:
          throw new ConfigError('INI format not implemented', 'FORMAT_NOT_IMPLEMENTED');
        default:
          throw new ConfigError(`Unsupported format: ${this.format}`, 'UNSUPPORTED_FORMAT');
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      
      throw new ConfigError(
        `Failed to stringify config: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STRINGIFY_ERROR',
        { format: this.format }
      );
    }
  }
}
