import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

export interface OllamaProcessConfig {
  // Ollama使用默认配置，不需要额外配置项
}

export interface OllamaProcessStatus {
  isRunning: boolean;
  pid?: number;
  port?: number;
  config?: OllamaProcessConfig;
  startTime?: Date;
  memoryUsage?: number;
  cpuUsage?: number;
  version?: string;
  // 新增字段
  health?: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    lastCheck?: Date;
    error?: string;
  };
  models?: {
    total: number;
    loaded: string[];
    running?: string[];
  };
  resources?: {
    memoryUsageMB?: number;
    cpuUsagePercent?: number;
    diskUsageMB?: number;
  };
}

@Injectable()
export class OllamaProcessManagerService {
  private readonly logger = new Logger(OllamaProcessManagerService.name);
  private ollamaProcess: ChildProcess | null = null;
  private currentConfig: OllamaProcessConfig | null = null;
  private readonly pidFile = path.join(os.tmpdir(), 'ollama-service.pid');
  private readonly logFile = path.join(os.tmpdir(), 'ollama-service.log');

  /**
   * 启动Ollama服务
   */
  async startOllamaService(config: OllamaProcessConfig = {}): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
      // 检查是否已经在运行
      if (await this.isOllamaRunning()) {
        return {
          success: false,
          message: 'Ollama service is already running. Stop it first or use restart.'
        };
      }

      this.logger.log('Starting Ollama service with configuration:', config);

      // 构建启动命令和环境变量
      const { args, env } = this.buildOllamaConfig(config);
      
      // 启动Ollama进程
      this.ollamaProcess = spawn('ollama', ['serve', ...args], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...env
        }
      });

      if (!this.ollamaProcess.pid) {
        throw new Error('Failed to start Ollama process');
      }

      // 保存PID
      await fs.promises.writeFile(this.pidFile, this.ollamaProcess.pid.toString());
      
      // 设置日志记录
      this.setupLogging();
      
      // 保存当前配置
      this.currentConfig = config;

      // 等待服务启动
      const port = 11434; // Ollama默认端口
      await this.waitForServiceReady(port, 30000); // 30秒超时

      this.logger.log(`Ollama service started successfully with PID: ${this.ollamaProcess.pid}`);

      return {
        success: true,
        message: 'Ollama service started successfully',
        pid: this.ollamaProcess.pid
      };

    } catch (error) {
      this.logger.error('Failed to start Ollama service:', error);
      return {
        success: false,
        message: `Failed to start Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 停止Ollama服务
   */
  async stopOllamaService(): Promise<{ success: boolean; message: string }> {
    try {
      const pid = await this.getOllamaPid();
      
      if (!pid) {
        return {
          success: true,
          message: 'Ollama service is not running'
        };
      }

      this.logger.log(`Stopping Ollama service with PID: ${pid}`);

      // 尝试优雅停止
      try {
        process.kill(pid, 'SIGTERM');
        
        // 等待进程停止
        await this.waitForProcessStop(pid, 10000); // 10秒超时
        
      } catch (error) {
        // 如果优雅停止失败，强制停止
        this.logger.warn('Graceful shutdown failed, forcing stop...');
        process.kill(pid, 'SIGKILL');
      }

      // 清理文件
      await this.cleanup();

      this.ollamaProcess = null;
      this.currentConfig = null;

      this.logger.log('Ollama service stopped successfully');

      return {
        success: true,
        message: 'Ollama service stopped successfully'
      };

    } catch (error) {
      this.logger.error('Failed to stop Ollama service:', error);
      return {
        success: false,
        message: `Failed to stop Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取实时监控信息
   */
  async getOllamaMonitoringInfo(): Promise<{
    service: {
      status: 'running' | 'stopped' | 'error';
      uptime?: number;
      responseTime?: number;
      version?: string;
    };
    models: {
      total: number;
      loaded: string[];
      running?: string[];
      details?: Array<{
        name: string;
        size?: string;
        modified?: string;
        digest?: string;
      }>;
    };
    resources: {
      memory?: {
        used: number;
        unit: 'MB' | 'GB';
      };
      cpu?: {
        usage: number;
        unit: '%';
      };
    };
    health: {
      lastCheck: Date;
      checks: Array<{
        name: string;
        status: 'pass' | 'fail';
        responseTime?: number;
        error?: string;
      }>;
    };
  }> {
    const result: {
      service: {
        status: 'running' | 'stopped' | 'error';
        uptime?: number;
        responseTime?: number;
        version?: string;
      };
      models: {
        total: number;
        loaded: string[];
        running?: string[];
        details?: Array<{
          name: string;
          size?: string;
          modified?: string;
          digest?: string;
        }>;
      };
      resources: {
        memory?: {
          used: number;
          unit: 'MB' | 'GB';
        };
        cpu?: {
          usage: number;
          unit: '%';
        };
      };
      health: {
        lastCheck: Date;
        checks: Array<{
          name: string;
          status: 'pass' | 'fail';
          responseTime?: number;
          error?: string;
        }>;
      };
    } = {
      service: {
        status: 'stopped'
      },
      models: {
        total: 0,
        loaded: []
      },
      resources: {},
      health: {
        lastCheck: new Date(),
        checks: []
      }
    };

    try {
      // 执行多项健康检查
      const healthChecks = await Promise.allSettled([
        this.performHealthCheck(),
        this.getModelsInfo(),
        this.getOllamaVersion(),
        this.getOllamaPid()
      ]);

      // 处理健康检查结果
      const healthCheck = healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : null;
      const modelsInfo = healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : null;
      const version = healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : undefined;
      const pid = healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : null;

      // 设置服务状态
      if (healthCheck?.isHealthy) {
        result.service.status = 'running';
        result.service.responseTime = healthCheck.responseTime;
        result.service.version = version;

        // 如果有PID，计算运行时间
        if (pid && await this.isProcessRunning(pid)) {
          const processInfo = await this.getProcessInfo(pid);
          if (processInfo.startTime) {
            result.service.uptime = Date.now() - processInfo.startTime.getTime();
          }

          // 设置资源使用情况
          if (processInfo.memoryUsage) {
            const memoryMB = Math.round(processInfo.memoryUsage / 1024 / 1024);
            result.resources.memory = {
              used: memoryMB > 1024 ? Math.round(memoryMB / 1024) : memoryMB,
              unit: memoryMB > 1024 ? 'GB' : 'MB'
            };
          }

          if (processInfo.cpuUsage) {
            result.resources.cpu = {
              usage: Math.round(processInfo.cpuUsage * 100) / 100,
              unit: '%'
            };
          }
        }
      } else {
        result.service.status = healthCheck ? 'error' : 'stopped';
      }

      // 设置模型信息
      if (modelsInfo) {
        result.models = {
          total: modelsInfo.total,
          loaded: modelsInfo.loaded,
          running: modelsInfo.running
        };

        // 获取详细模型信息
        if (modelsInfo.loaded.length > 0) {
          try {
            const detailedModels = await this.getDetailedModelsInfo();
            result.models.details = detailedModels;
          } catch (error) {
            this.logger.debug('Failed to get detailed models info:', error);
          }
        }
      }

      // 设置健康检查结果
      result.health.checks = [
        {
          name: 'API Connectivity',
          status: healthCheck?.isHealthy ? 'pass' : 'fail',
          responseTime: healthCheck?.responseTime,
          error: healthCheck?.error
        },
        {
          name: 'Model Loading',
          status: modelsInfo && modelsInfo.total >= 0 ? 'pass' : 'fail'
        },
        {
          name: 'Version Check',
          status: version ? 'pass' : 'fail'
        }
      ];

    } catch (error) {
      this.logger.error('Failed to get monitoring info:', error);
      result.service.status = 'error';
      result.health.checks.push({
        name: 'General Health',
        status: 'fail',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return result;
  }

  /**
   * 获取详细模型信息
   */
  private async getDetailedModelsInfo(): Promise<Array<{
    name: string;
    size?: string;
    modified?: string;
    digest?: string;
  }>> {
    try {
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json() as any;
        return (data.models || []).map((model: any) => ({
          name: model.name || model.model || 'unknown',
          size: model.size ? this.formatBytes(model.size) : undefined,
          modified: model.modified_at || model.modified,
          digest: model.digest
        }));
      }
    } catch (error) {
      this.logger.debug('Failed to get detailed models info:', error);
    }
    return [];
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 重启Ollama服务
   */
  async restartOllamaService(config?: OllamaProcessConfig): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
      this.logger.log('Restarting Ollama service...');

      // 使用新配置或当前配置
      const restartConfig = config || this.currentConfig || {};

      // 停止当前服务
      const stopResult = await this.stopOllamaService();
      if (!stopResult.success) {
        return stopResult;
      }

      // 等待一下确保完全停止
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 启动新服务
      const startResult = await this.startOllamaService(restartConfig);
      
      if (startResult.success) {
        this.logger.log('Ollama service restarted successfully');
        return {
          success: true,
          message: 'Ollama service restarted successfully with new configuration',
          pid: startResult.pid
        };
      } else {
        return startResult;
      }

    } catch (error) {
      this.logger.error('Failed to restart Ollama service:', error);
      return {
        success: false,
        message: `Failed to restart Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取Ollama服务状态 - 增强版本
   */
  async getOllamaStatus(): Promise<OllamaProcessStatus> {
    try {
      // 执行健康检查
      const healthCheck = await this.performHealthCheck();

      if (!healthCheck.isHealthy) {
        return {
          isRunning: false,
          health: {
            status: 'unhealthy',
            responseTime: healthCheck.responseTime,
            lastCheck: new Date(),
            error: healthCheck.error
          }
        };
      }

      // 尝试获取PID（如果是通过此服务启动的）
      const pid = await this.getOllamaPid();

      // 获取Ollama版本
      const version = await this.getOllamaVersion();

      // 获取模型信息
      const modelsInfo = await this.getModelsInfo();

      const result: OllamaProcessStatus = {
        isRunning: true,
        port: 11434, // Ollama默认端口
        config: this.currentConfig || undefined,
        version,
        health: {
          status: 'healthy',
          responseTime: healthCheck.responseTime,
          lastCheck: new Date()
        },
        models: modelsInfo
      };

      // 如果有PID，获取进程信息
      if (pid && await this.isProcessRunning(pid)) {
        const processInfo = await this.getProcessInfo(pid);
        result.pid = pid;
        result.startTime = processInfo.startTime;
        result.memoryUsage = processInfo.memoryUsage;
        result.cpuUsage = processInfo.cpuUsage;

        // 设置资源使用信息
        result.resources = {
          memoryUsageMB: processInfo.memoryUsage ? Math.round(processInfo.memoryUsage / 1024 / 1024) : undefined,
          cpuUsagePercent: processInfo.cpuUsage
        };
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to get Ollama status:', error);
      return { isRunning: false };
    }
  }

  /**
   * 构建Ollama配置 - 使用默认配置
   */
  private buildOllamaConfig(_config: OllamaProcessConfig): { args: string[]; env: Record<string, string> } {
    const args: string[] = [];
    const env: Record<string, string> = {};

    // Ollama使用默认配置，不需要额外的环境变量设置
    return { args, env };
  }

  /**
   * 设置日志记录
   */
  private setupLogging(): void {
    if (!this.ollamaProcess) return;

    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

    this.ollamaProcess.stdout?.pipe(logStream);
    this.ollamaProcess.stderr?.pipe(logStream);

    this.ollamaProcess.on('error', (error) => {
      this.logger.error('Ollama process error:', error);
    });

    this.ollamaProcess.on('exit', (code, signal) => {
      this.logger.log(`Ollama process exited with code ${code} and signal ${signal}`);
      this.cleanup().catch(err => this.logger.error('Cleanup error:', err));
    });
  }

  /**
   * 等待服务就绪
   */
  private async waitForServiceReady(port: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/api/tags`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // 服务还未就绪，继续等待
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Ollama service did not become ready within ${timeout}ms`);
  }

  /**
   * 等待进程停止
   */
  private async waitForProcessStop(pid: number, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (!(await this.isProcessRunning(pid))) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Process ${pid} did not stop within ${timeout}ms`);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<{
    isHealthy: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
      const response = await fetch(`${ollamaUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          isHealthy: true,
          responseTime
        };
      } else {
        return {
          isHealthy: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取模型信息
   */
  private async getModelsInfo(): Promise<{
    total: number;
    loaded: string[];
    running?: string[];
  }> {
    try {
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';

      // 获取已安装的模型列表
      const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      let loadedModels: string[] = [];
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json() as any;
        loadedModels = (tagsData.models || []).map((model: any) => model.name || model.model || 'unknown');
      }

      // 尝试获取运行中的模型（如果API支持）
      let runningModels: string[] | undefined;
      try {
        const runningResponse = await fetch(`${ollamaUrl}/api/ps`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });

        if (runningResponse.ok) {
          const runningData = await runningResponse.json() as any;
          runningModels = (runningData.models || []).map((model: any) => model.name || model.model || 'unknown');
        }
      } catch (error) {
        // /api/ps 可能不被支持，忽略错误
        this.logger.debug('Failed to get running models (API may not be supported):', error);
      }

      return {
        total: loadedModels.length,
        loaded: loadedModels,
        running: runningModels
      };
    } catch (error) {
      this.logger.warn('Failed to get models info:', error);
      return {
        total: 0,
        loaded: [],
        running: undefined
      };
    }
  }

  /**
   * 检查Ollama服务是否可访问（通过HTTP）
   */
  private async checkOllamaService(): Promise<boolean> {
    try {
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查Ollama是否在运行
   */
  private async isOllamaRunning(): Promise<boolean> {
    const pid = await this.getOllamaPid();
    return pid ? await this.isProcessRunning(pid) : false;
  }

  /**
   * 获取Ollama进程PID
   */
  private async getOllamaPid(): Promise<number | null> {
    try {
      if (fs.existsSync(this.pidFile)) {
        const pidStr = await fs.promises.readFile(this.pidFile, 'utf8');
        return parseInt(pidStr.trim());
      }
    } catch (error) {
      this.logger.warn('Failed to read PID file:', error);
    }
    return null;
  }

  /**
   * 检查进程是否在运行
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取进程信息
   */
  private async getProcessInfo(pid: number): Promise<{ startTime?: Date; memoryUsage?: number; cpuUsage?: number }> {
    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const { stdout } = await execAsync(`ps -o pid,etime,rss,pcpu -p ${pid}`);
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          return {
            memoryUsage: parseInt(parts[2]) * 1024, // RSS in bytes
            cpuUsage: parseFloat(parts[3])
          };
        }
      }
    } catch (error) {
      this.logger.warn('Failed to get process info:', error);
    }
    return {};
  }

  /**
   * 获取Ollama版本
   */
  private async getOllamaVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('ollama --version');
      return stdout.trim();
    } catch (error) {
      this.logger.warn('Failed to get Ollama version:', error);
      return undefined;
    }
  }

  /**
   * 清理文件
   */
  private async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.pidFile)) {
        await fs.promises.unlink(this.pidFile);
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup files:', error);
    }
  }
}
