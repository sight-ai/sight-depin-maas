import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { VllmConfigService } from './vllm-config.service';

const execAsync = promisify(exec);

export interface VllmProcessConfig {
  model: string;
  gpuMemoryUtilization: number;
  maxModelLen: number;
  port: number;
  host: string;
  // 新增的显存控制参数
  maxNumSeqs?: number;
  maxNumBatchedTokens?: number;
  enforceEager?: boolean;
  swapSpace?: number;
  tensorParallelSize?: number;
  pipelineParallelSize?: number;
  blockSize?: number;
  quantization?: 'awq' | 'gptq' | 'squeezellm' | 'fp8' | 'int8' | null;
}

export interface VllmProcessStatus {
  isRunning: boolean;
  pid?: number;
  port?: number;
  config?: VllmProcessConfig;
  startTime?: Date;
  memoryUsage?: number;
  cpuUsage?: number;
}

@Injectable()
export class VllmProcessManagerService {
  private readonly logger = new Logger(VllmProcessManagerService.name);
  private vllmProcess: ChildProcess | null = null;
  private currentConfig: VllmProcessConfig | null = null;
  private readonly pidFile = path.join(os.tmpdir(), 'vllm-service.pid');
  private readonly logFile = path.join(os.tmpdir(), 'vllm-service.log');

  constructor(private readonly vllmConfigService: VllmConfigService) {}

  /**
   * 启动vLLM服务
   */
  async startVllmService(config: VllmProcessConfig): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
      // 检查是否已经在运行
      if (await this.isVllmRunning()) {
        return {
          success: false,
          message: 'vLLM service is already running. Stop it first or use restart.'
        };
      }

      // 合并用户配置和保存的配置
      const mergedConfig = this.mergeWithSavedConfig(config);
      this.logger.log('Starting vLLM service with merged configuration:', mergedConfig);

      // 构建启动命令
      const args = this.buildVllmArgs(mergedConfig);
      
      // 启动vLLM进程
      this.vllmProcess = spawn('python', ['-m', 'vllm.entrypoints.openai.api_server', ...args], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CUDA_VISIBLE_DEVICES: process.env['CUDA_VISIBLE_DEVICES'] || '0',
          VLLM_GPU_MEMORY_UTILIZATION: mergedConfig.gpuMemoryUtilization.toString(),
        }
      });

      if (!this.vllmProcess.pid) {
        throw new Error('Failed to start vLLM process');
      }

      // 保存PID
      await fs.promises.writeFile(this.pidFile, this.vllmProcess.pid.toString());
      
      // 设置日志记录
      this.setupLogging();
      
      // 保存当前配置
      this.currentConfig = mergedConfig;

      // 等待服务启动
      await this.waitForServiceReady(config.port, 30000); // 30秒超时

      this.logger.log(`vLLM service started successfully with PID: ${this.vllmProcess.pid}`);

      return {
        success: true,
        message: 'vLLM service started successfully',
        pid: this.vllmProcess.pid
      };

    } catch (error) {
      this.logger.error('Failed to start vLLM service:', error);
      return {
        success: false,
        message: `Failed to start vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 停止vLLM服务
   */
  async stopVllmService(): Promise<{ success: boolean; message: string }> {
    try {
      const pid = await this.getVllmPid();
      
      if (!pid) {
        return {
          success: true,
          message: 'vLLM service is not running'
        };
      }

      this.logger.log(`Stopping vLLM service with PID: ${pid}`);

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

      this.vllmProcess = null;
      this.currentConfig = null;

      this.logger.log('vLLM service stopped successfully');

      return {
        success: true,
        message: 'vLLM service stopped successfully'
      };

    } catch (error) {
      this.logger.error('Failed to stop vLLM service:', error);
      return {
        success: false,
        message: `Failed to stop vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 重启vLLM服务
   */
  async restartVllmService(config?: VllmProcessConfig): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
      this.logger.log('Restarting vLLM service...');

      // 使用新配置或当前配置
      const restartConfig = config || this.currentConfig;
      
      if (!restartConfig) {
        return {
          success: false,
          message: 'No configuration available for restart. Please provide configuration.'
        };
      }

      // 停止当前服务
      const stopResult = await this.stopVllmService();
      if (!stopResult.success) {
        return stopResult;
      }

      // 等待一下确保完全停止
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 启动新服务
      const startResult = await this.startVllmService(restartConfig);
      
      if (startResult.success) {
        this.logger.log('vLLM service restarted successfully');
        return {
          success: true,
          message: 'vLLM service restarted successfully with new configuration',
          pid: startResult.pid
        };
      } else {
        return startResult;
      }

    } catch (error) {
      this.logger.error('Failed to restart vLLM service:', error);
      return {
        success: false,
        message: `Failed to restart vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取vLLM服务状态
   */
  async getVllmStatus(): Promise<VllmProcessStatus> {
    try {
      // 首先检查服务是否通过HTTP可访问（更可靠的检测方法）
      const isServiceRunning = await this.checkVllmService();

      if (!isServiceRunning) {
        return { isRunning: false };
      }

      // 尝试获取PID（如果是通过此服务启动的）
      const pid = await this.getVllmPid();

      const result: VllmProcessStatus = {
        isRunning: true,
        port: this.currentConfig?.port || 8000,
        config: this.currentConfig || undefined
      };

      // 如果有PID，获取进程信息
      if (pid && await this.isProcessRunning(pid)) {
        const processInfo = await this.getProcessInfo(pid);
        result.pid = pid;
        result.startTime = processInfo.startTime;
        result.memoryUsage = processInfo.memoryUsage;
        result.cpuUsage = processInfo.cpuUsage;
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to get vLLM status:', error);
      return { isRunning: false };
    }
  }

  /**
   * 构建vLLM启动参数
   */
  private buildVllmArgs(config: VllmProcessConfig): string[] {
    const args = [
      '--model', config.model,
      '--gpu-memory-utilization', config.gpuMemoryUtilization.toString(),
      '--max-model-len', config.maxModelLen.toString(),
      '--port', config.port.toString(),
      '--host', config.host
    ];

    // 添加可选的显存控制参数
    if (config.maxNumSeqs !== undefined) {
      args.push('--max-num-seqs', config.maxNumSeqs.toString());
    }

    if (config.maxNumBatchedTokens !== undefined) {
      args.push('--max-num-batched-tokens', config.maxNumBatchedTokens.toString());
    }

    if (config.enforceEager === true) {
      args.push('--enforce-eager');
    }

    if (config.swapSpace !== undefined && config.swapSpace > 0) {
      args.push('--swap-space', config.swapSpace.toString());
    }

    if (config.tensorParallelSize !== undefined && config.tensorParallelSize > 1) {
      args.push('--tensor-parallel-size', config.tensorParallelSize.toString());
    }

    if (config.pipelineParallelSize !== undefined && config.pipelineParallelSize > 1) {
      args.push('--pipeline-parallel-size', config.pipelineParallelSize.toString());
    }

    if (config.blockSize !== undefined) {
      args.push('--block-size', config.blockSize.toString());
    }

    if (config.quantization) {
      args.push('--quantization', config.quantization);
    }

    return args;
  }

  /**
   * 从配置服务获取默认配置并合并用户配置
   */
  private mergeWithSavedConfig(userConfig: Partial<VllmProcessConfig>): VllmProcessConfig {
    const savedConfig = this.vllmConfigService.getFullConfig();

    return {
      model: userConfig.model || savedConfig.model || 'microsoft/DialoGPT-medium',
      gpuMemoryUtilization: userConfig.gpuMemoryUtilization || savedConfig.gpuMemoryUtilization || 0.9,
      maxModelLen: userConfig.maxModelLen || savedConfig.maxModelLen || 4096,
      port: userConfig.port || savedConfig.port || 8000,
      host: userConfig.host || savedConfig.host || '0.0.0.0',
      maxNumSeqs: userConfig.maxNumSeqs || savedConfig.maxNumSeqs,
      maxNumBatchedTokens: userConfig.maxNumBatchedTokens || savedConfig.maxNumBatchedTokens,
      enforceEager: userConfig.enforceEager !== undefined ? userConfig.enforceEager : savedConfig.enforceEager,
      swapSpace: userConfig.swapSpace || savedConfig.swapSpace,
      tensorParallelSize: userConfig.tensorParallelSize || savedConfig.tensorParallelSize,
      pipelineParallelSize: userConfig.pipelineParallelSize || savedConfig.pipelineParallelSize,
      blockSize: userConfig.blockSize || savedConfig.blockSize,
      quantization: userConfig.quantization || savedConfig.quantization
    };
  }

  /**
   * 设置日志记录
   */
  private setupLogging(): void {
    if (!this.vllmProcess) return;

    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

    this.vllmProcess.stdout?.pipe(logStream);
    this.vllmProcess.stderr?.pipe(logStream);

    this.vllmProcess.on('error', (error) => {
      this.logger.error('vLLM process error:', error);
    });

    this.vllmProcess.on('exit', (code, signal) => {
      this.logger.log(`vLLM process exited with code ${code} and signal ${signal}`);
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
        const response = await fetch(`http://localhost:${port}/v1/models`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // 服务还未就绪，继续等待
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`vLLM service did not become ready within ${timeout}ms`);
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
   * 检查vLLM服务是否可访问（通过HTTP）
   */
  private async checkVllmService(): Promise<boolean> {
    try {
      // 尝试多个常见端口
      const ports = [8000, 8001, 8080];
      const vllmHost = process.env.VLLM_HOST || '127.0.0.1';

      for (const port of ports) {
        try {
          const response = await fetch(`http://${vllmHost}:${port}/v1/models`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000) // 3秒超时
          });
          if (response.ok) {
            return true;
          }
        } catch (error) {
          // 继续尝试下一个端口
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查vLLM是否在运行
   */
  private async isVllmRunning(): Promise<boolean> {
    const pid = await this.getVllmPid();
    return pid ? await this.isProcessRunning(pid) : false;
  }

  /**
   * 获取vLLM进程PID
   */
  private async getVllmPid(): Promise<number | null> {
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
