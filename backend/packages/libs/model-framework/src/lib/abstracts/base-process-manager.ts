import { Logger } from '@nestjs/common';
import { ModelFramework } from '../types/framework.types';
import { 
  IProcessManager, 
  ProcessStartOptions, 
  ProcessResult, 
  ProcessStatus, 
  ProcessConfig 
} from '../interfaces/service.interface';

/**
 * 进程管理器抽象基类
 * 提供通用的进程管理功能实现
 */
export abstract class BaseProcessManager implements IProcessManager {
  protected readonly logger = new Logger(this.constructor.name);
  protected config: ProcessConfig;
  protected currentPid: number | null = null;
  protected startTime: Date | null = null;
  protected restartCount = 0;

  abstract readonly framework: ModelFramework;

  constructor(config: Partial<ProcessConfig> = {}) {
    this.config = this.createDefaultConfig(config);
  }

  /**
   * 启动进程
   */
  async start(options: ProcessStartOptions = {}): Promise<ProcessResult> {
    try {
      this.logger.log(`Starting ${this.framework} process...`);

      // 检查是否已经运行
      if (await this.isRunning()) {
        return {
          success: false,
          message: `${this.framework} process is already running`,
          pid: this.currentPid || undefined
        };
      }

      // 合并启动选项
      const startOptions = { ...this.getDefaultStartOptions(), ...options };

      // 执行启动逻辑
      const result = await this.executeStart(startOptions);

      if (result.success) {
        this.currentPid = result.pid || null;
        this.startTime = new Date();
        this.logger.log(`${this.framework} process started successfully with PID: ${this.currentPid}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to start ${this.framework} process:`, error);
      return {
        success: false,
        message: `Failed to start ${this.framework} process`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 停止进程
   */
  async stop(): Promise<ProcessResult> {
    try {
      this.logger.log(`Stopping ${this.framework} process...`);

      if (!(await this.isRunning())) {
        return {
          success: true,
          message: `${this.framework} process is not running`
        };
      }

      const result = await this.executeStop();

      if (result.success) {
        this.currentPid = null;
        this.startTime = null;
        this.logger.log(`${this.framework} process stopped successfully`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to stop ${this.framework} process:`, error);
      return {
        success: false,
        message: `Failed to stop ${this.framework} process`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 重启进程
   */
  async restart(): Promise<ProcessResult> {
    try {
      this.logger.log(`Restarting ${this.framework} process...`);

      // 先停止
      const stopResult = await this.stop();
      if (!stopResult.success) {
        return stopResult;
      }

      // 等待一段时间
      await this.sleep(2000);

      // 再启动
      const startResult = await this.start();
      
      if (startResult.success) {
        this.restartCount++;
      }

      return startResult;
    } catch (error) {
      this.logger.error(`Failed to restart ${this.framework} process:`, error);
      return {
        success: false,
        message: `Failed to restart ${this.framework} process`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取进程状态
   */
  async getStatus(): Promise<ProcessStatus> {
    try {
      const isRunning = await this.isRunning();
      
      if (!isRunning) {
        return {
          isRunning: false
        };
      }

      const status = await this.fetchDetailedStatus();
      return {
        isRunning: true,
        pid: this.currentPid || undefined,
        uptime: this.getUptime(),
        ...status
      };
    } catch (error) {
      this.logger.error(`Failed to get status for ${this.framework}:`, error);
      return {
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 检查进程是否运行
   */
  async isRunning(): Promise<boolean> {
    try {
      return await this.checkProcessRunning();
    } catch (error) {
      this.logger.error(`Failed to check if ${this.framework} is running:`, error);
      return false;
    }
  }

  /**
   * 获取配置
   */
  getConfig(): ProcessConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProcessConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log(`Updated ${this.framework} process config`);
  }

  // =============================================================================
  // 抽象方法 - 子类必须实现
  // =============================================================================

  /**
   * 执行启动逻辑
   */
  protected abstract executeStart(options: ProcessStartOptions): Promise<ProcessResult>;

  /**
   * 执行停止逻辑
   */
  protected abstract executeStop(): Promise<ProcessResult>;

  /**
   * 检查进程是否运行
   */
  protected abstract checkProcessRunning(): Promise<boolean>;

  /**
   * 获取详细状态信息
   */
  protected abstract fetchDetailedStatus(): Promise<Partial<ProcessStatus>>;

  /**
   * 获取默认启动选项
   */
  protected abstract getDefaultStartOptions(): ProcessStartOptions;

  // =============================================================================
  // 受保护的辅助方法
  // =============================================================================

  /**
   * 创建默认配置
   */
  protected createDefaultConfig(config: Partial<ProcessConfig>): ProcessConfig {
    return {
      framework: this.framework,
      port: this.getDefaultPort(),
      host: '127.0.0.1',
      autoStart: false,
      restartOnFailure: true,
      maxRestarts: 3,
      healthCheckInterval: 30000,
      ...config
    };
  }

  /**
   * 获取默认端口
   */
  protected getDefaultPort(): number {
    switch (this.framework) {
      case ModelFramework.OLLAMA:
        return 11434;
      case ModelFramework.VLLM:
        return 8000;
      default:
        return 8000;
    }
  }

  /**
   * 获取运行时间
   */
  protected getUptime(): number | undefined {
    if (!this.startTime) return undefined;
    return Date.now() - this.startTime.getTime();
  }

  /**
   * 睡眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证端口是否可用
   */
  protected async isPortAvailable(port: number): Promise<boolean> {
    try {
      const net = await import('net');
      return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
      });
    } catch {
      return false;
    }
  }

  /**
   * 查找可用端口
   */
  protected async findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available port found starting from ${startPort}`);
  }

  /**
   * 验证配置
   */
  protected validateConfig(): void {
    if (!this.config.port || this.config.port < 1 || this.config.port > 65535) {
      throw new Error('Invalid port number');
    }
    if (!this.config.host) {
      throw new Error('Host is required');
    }
  }
}
