import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { 
  IProcessManager, 
  ProcessResult, 
  ProcessStatus,
  CliError 
} from '../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 重构的进程管理服务 
 * 只负责后台进程的生命周期管理
 */
export class RefactoredProcessManagerService implements IProcessManager {
  private static readonly PID_FILE_NAME = 'sightai.pid';
  private static readonly LOCK_FILE_NAME = 'sightai.lock';
  private static readonly LOG_FILE_NAME = 'sightai.log';

  constructor(
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {}

  /**
   * 启动守护进程
   */
  async startDaemon(): Promise<ProcessResult> {
    try {
      // 检查是否已有进程在运行
      const isRunning = await this.isRunning();
      if (isRunning) {
        const status = await this.getStatus();
        return {
          success: false,
          message: `Backend server is already running (PID: ${status.pid})`,
          error: 'PROCESS_ALREADY_RUNNING'
        };
      }

      // 启动新进程
      const result = this.startDaemonProcess();
      
      if (result.success && result.pid) {
        this.savePid(result.pid);
        return {
          success: true,
          message: `Backend server started successfully (PID: ${result.pid})`,
          pid: result.pid
        };
      } else {
        return {
          success: false,
          message: result.error || 'Failed to start backend server',
          error: 'PROCESS_START_FAILED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to start daemon: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'DAEMON_START_ERROR'
      };
    }
  }

  /**
   * 停止守护进程
   */
  async stopDaemon(): Promise<ProcessResult> {
    try {
      const pid = this.readPid();
      
      if (!pid) {
        return {
          success: false,
          message: 'No backend server process found',
          error: 'PROCESS_NOT_FOUND'
        };
      }

      const isRunning = this.isProcessRunning(pid);
      if (!isRunning) {
        this.cleanupPidFiles();
        return {
          success: false,
          message: 'Backend server is not running',
          error: 'PROCESS_NOT_RUNNING'
        };
      }

      // 优雅停止进程
      const stopResult = await this.stopProcess(pid);
      
      if (stopResult.success) {
        this.cleanupPidFiles();
        return {
          success: true,
          message: `Backend server stopped successfully (PID: ${pid})`
        };
      } else {
        return {
          success: false,
          message: stopResult.error || 'Failed to stop backend server',
          error: 'PROCESS_STOP_FAILED'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop daemon: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'DAEMON_STOP_ERROR'
      };
    }
  }

  /**
   * 获取进程状态
   */
  async getStatus(): Promise<ProcessStatus> {
    try {
      const processInfo = this.getRunningProcessInfo();
      
      if (processInfo) {
        const startTime = new Date(processInfo.startTime);
        const uptime = Date.now() - startTime.getTime();
        
        return {
          isRunning: true,
          pid: processInfo.pid,
          startTime,
          uptime,
          memoryUsage: this.getProcessMemoryUsage(processInfo.pid),
          cpuUsage: 0 // 需要实现CPU使用率计算
        };
      } else {
        return {
          isRunning: false
        };
      }
    } catch (error) {
      return {
        isRunning: false
      };
    }
  }

  /**
   * 检查进程是否运行
   */
  async isRunning(): Promise<boolean> {
    try {
      const pid = this.readPid();
      return pid ? this.isProcessRunning(pid) : false;
    } catch {
      return false;
    }
  }

  /**
   * 重启进程
   */
  async restart(): Promise<ProcessResult> {
    try {
      // 先停止
      const stopResult = await this.stopDaemon();
      
      // 等待一段时间确保进程完全停止
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 再启动
      const startResult = await this.startDaemon();
      
      return {
        success: startResult.success,
        message: startResult.success 
          ? 'Backend server restarted successfully'
          : `Failed to restart: ${startResult.message}`,
        pid: startResult.pid,
        error: startResult.error
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to restart daemon: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'DAEMON_RESTART_ERROR'
      };
    }
  }

  /**
   * 强制杀死进程
   */
  async kill(signal: string = 'SIGKILL'): Promise<ProcessResult> {
    try {
      const pid = this.readPid();
      
      if (!pid) {
        return {
          success: false,
          message: 'No process to kill',
          error: 'PROCESS_NOT_FOUND'
        };
      }

      process.kill(pid, signal as NodeJS.Signals);
      this.cleanupPidFiles();
      
      return {
        success: true,
        message: `Process killed with signal ${signal} (PID: ${pid})`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to kill process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'PROCESS_KILL_ERROR'
      };
    }
  }

  /**
   * 获取SightAI目录
   */
  private getSightAIDir(): string {
    const dataDir = process.env['SIGHTAI_DATA_DIR'];
    
    let sightaiDir: string;
    if (dataDir) {
      sightaiDir = dataDir;
    } else {
      const homeDir = os.homedir();
      sightaiDir = path.join(homeDir, '.sightai');
    }

    if (!fs.existsSync(sightaiDir)) {
      fs.mkdirSync(sightaiDir, { recursive: true });
    }

    return sightaiDir;
  }

  /**
   * 获取PID文件路径
   */
  private getPidFilePath(): string {
    return path.join(this.getSightAIDir(), RefactoredProcessManagerService.PID_FILE_NAME);
  }

  /**
   * 获取锁文件路径
   */
  private getLockFilePath(): string {
    return path.join(this.getSightAIDir(), RefactoredProcessManagerService.LOCK_FILE_NAME);
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(): string {
    return path.join(this.getSightAIDir(), RefactoredProcessManagerService.LOG_FILE_NAME);
  }

  /**
   * 保存进程ID
   */
  private savePid(pid: number): void {
    try {
      const pidFile = this.getPidFilePath();
      const lockFile = this.getLockFilePath();

      fs.writeFileSync(pidFile, pid.toString());
      fs.writeFileSync(lockFile, JSON.stringify({
        pid,
        startTime: new Date().toISOString(),
        executable: process.argv[1]
      }));
    } catch (error) {
      throw new CliError(
        `Failed to save PID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PID_SAVE_ERROR'
      );
    }
  }

  /**
   * 读取进程ID
   */
  private readPid(): number | null {
    try {
      const pidFile = this.getPidFilePath();

      if (!fs.existsSync(pidFile)) {
        return null;
      }

      const pidStr = fs.readFileSync(pidFile, 'utf8').trim();
      const pid = parseInt(pidStr, 10);

      return isNaN(pid) ? null : pid;
    } catch {
      return null;
    }
  }

  /**
   * 检查进程是否运行
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取运行进程信息
   */
  private getRunningProcessInfo(): { pid: number; startTime: string; executable: string } | null {
    try {
      const lockFile = this.getLockFilePath();

      if (!fs.existsSync(lockFile)) {
        return null;
      }

      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

      if (this.isProcessRunning(lockData.pid)) {
        return lockData;
      } else {
        this.cleanupPidFiles();
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * 清理PID文件
   */
  private cleanupPidFiles(): void {
    try {
      const pidFile = this.getPidFilePath();
      const lockFile = this.getLockFilePath();

      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }

      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // 忽略清理错误
    }
  }

  /**
   * 启动守护进程
   */
  private startDaemonProcess(): { success: boolean; pid?: number; error?: string } {
    try {
      const currentExecutable = process.argv[0];
      const currentScript = process.argv[1];
      const logFile = this.getLogFilePath();
      const logStream = fs.openSync(logFile, 'a');

      const child = spawn(currentExecutable, [currentScript, 'start'], {
        detached: true,
        stdio: ['ignore', logStream, logStream],
        env: process.env
      });

      child.unref();

      if (child.pid) {
        return {
          success: true,
          pid: child.pid
        };
      } else {
        return {
          success: false,
          error: 'Failed to get process ID'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 停止进程
   */
  private async stopProcess(pid: number): Promise<{ success: boolean; error?: string }> {
    try {
      // 优雅停止
      process.kill(pid, 'SIGTERM');

      // 等待进程停止
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isProcessRunning(pid)) {
            clearInterval(checkInterval);
            resolve({ success: true });
          }
        }, 500);

        // 3秒后强制杀死
        setTimeout(() => {
          clearInterval(checkInterval);
          if (this.isProcessRunning(pid)) {
            try {
              process.kill(pid, 'SIGKILL');
              resolve({ success: true });
            } catch (error) {
              resolve({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          }
        }, 3000);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取进程内存使用情况
   */
  private getProcessMemoryUsage(pid: number): number {
    try {
      // 这里可以实现获取特定进程内存使用的逻辑
      // 目前返回当前进程的内存使用
      return process.memoryUsage().heapUsed;
    } catch {
      return 0;
    }
  }
}
