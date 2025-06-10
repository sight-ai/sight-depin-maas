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
 * 进程管理服务 
 * 只负责后台进程的生命周期管理
 */
export class ProcessManagerService implements IProcessManager {
  private readonly errorHandler: ErrorHandlerService;
  private static readonly PID_FILE_NAME = 'sightai.pid';
  private static readonly LOCK_FILE_NAME = 'sightai.lock';
  private static readonly LOG_FILE_NAME = 'sightai.log';

  constructor(errorHandler?: ErrorHandlerService) {
    this.errorHandler = errorHandler || new ErrorHandlerService();
  }

  /**
   * 获取用户目录下的.sightai路径或Docker数据目录
   */
  private static getSightAIDir(): string {
    // 在 Docker 环境中，优先使用 SIGHTAI_DATA_DIR 环境变量
    const dataDir = process.env['SIGHTAI_DATA_DIR'];

    let sightaiDir: string;
    if (dataDir) {
      // Docker 环境：使用数据卷目录
      sightaiDir = dataDir;
    } else {
      // 本地环境：使用用户主目录
      const homeDir = os.homedir();
      sightaiDir = path.join(homeDir, '.sightai');
    }

    // 确保目录存在
    if (!fs.existsSync(sightaiDir)) {
      fs.mkdirSync(sightaiDir, { recursive: true });
    }

    return sightaiDir;
  }

  /**
   * 获取PID文件路径
   */
  private static getPidFilePath(): string {
    return path.join(this.getSightAIDir(), this.PID_FILE_NAME);
  }

  /**
   * 获取锁文件路径
   */
  private static getLockFilePath(): string {
    return path.join(this.getSightAIDir(), this.LOCK_FILE_NAME);
  }

  /**
   * 获取日志文件路径
   */
  private static getLogFilePath(): string {
    return path.join(this.getSightAIDir(), this.LOG_FILE_NAME);
  }

  /**
   * 保存进程ID到文件
   */
  static savePid(pid: number): void {
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
      console.error(`Failed to save PID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 从文件读取进程ID
   */
  static readPid(): number | null {
    try {
      const pidFile = this.getPidFilePath();

      if (!fs.existsSync(pidFile)) {
        return null;
      }

      const pidStr = fs.readFileSync(pidFile, 'utf8').trim();
      const pid = parseInt(pidStr, 10);

      return isNaN(pid) ? null : pid;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查进程是否正在运行
   */
  static isProcessRunning(pid: number): boolean {
    try {
      // 发送信号0来检查进程是否存在
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前运行的后台进程信息
   */
  static getRunningProcessInfo(): { pid: number; startTime: string; executable: string } | null {
    try {
      const lockFile = this.getLockFilePath();

      if (!fs.existsSync(lockFile)) {
        return null;
      }

      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

      // 检查进程是否仍在运行
      if (this.isProcessRunning(lockData.pid)) {
        return lockData;
      } else {
        // 进程已停止，清理文件
        this.cleanupPidFiles();
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 清理PID和锁文件
   */
  static cleanupPidFiles(): void {
    try {
      const pidFile = this.getPidFilePath();
      const lockFile = this.getLockFilePath();

      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }

      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (error) {
      // 忽略清理错误
    }
  }

  /**
   * 启动后台进程
   */
  static startDaemonProcess(): { success: boolean; pid?: number; error?: string } {
    try {
      // 检查是否已有进程在运行
      const runningProcess = this.getRunningProcessInfo();
      if (runningProcess) {
        return {
          success: false,
          error: `Backend server is already running (PID: ${runningProcess.pid})`
        };
      }

      // 获取当前执行文件的路径
      const currentExecutable = process.argv[0]; // node 或打包后的可执行文件
      const currentScript = process.argv[1]; // 当前脚本路径

      // 创建日志文件
      const logFile = this.getLogFilePath();
      const logStream = fs.openSync(logFile, 'a');

      // 创建后台进程，将输出重定向到日志文件
      const child = spawn(currentExecutable, [currentScript, 'start'], {
        detached: true,
        stdio: ['ignore', logStream, logStream],
        env: process.env // 传递当前进程的环境变量
      });

      // 分离子进程，让它独立运行
      child.unref();

      if (child.pid) {
        // 保存PID
        this.savePid(child.pid);

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
   * 停止后台进程
   */
  static stopDaemonProcess(): { success: boolean; error?: string } {
    try {
      const pid = this.readPid();

      if (!pid) {
        return {
          success: false,
          error: 'No backend server process found'
        };
      }

      if (!this.isProcessRunning(pid)) {
        // 进程已停止，清理文件
        this.cleanupPidFiles();
        return {
          success: false,
          error: 'Backend server is not running'
        };
      }

      // 尝试优雅停止
      try {
        process.kill(pid, 'SIGTERM');

        // 等待一段时间让进程优雅退出
        setTimeout(() => {
          if (this.isProcessRunning(pid)) {
            // 如果还在运行，强制杀死
            try {
              process.kill(pid, 'SIGKILL');
            } catch (error) {
              // 忽略错误，可能进程已经停止
            }
          }

          // 清理PID文件
          this.cleanupPidFiles();
        }, 3000);

        return {
          success: true
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to stop process: ${error instanceof Error ? error.message : 'Unknown error'}`
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
   * 检查后台服务器状态
   */
  static getServerStatus(): {
    running: boolean;
    pid?: number;
    startTime?: string;
    executable?: string;
  } {
    const processInfo = this.getRunningProcessInfo();

    if (processInfo) {
      return {
        running: true,
        pid: processInfo.pid,
        startTime: processInfo.startTime,
        executable: processInfo.executable
      };
    } else {
      return {
        running: false
      };
    }
  }

  /**
   * 读取后台服务日志
   * @param lines 读取的行数，默认50行
   * @param follow 是否持续跟踪日志
   */
  static readLogs(lines: number = 50, follow: boolean = false): {
    success: boolean;
    logs?: string[];
    logFile?: string;
    error?: string;
  } {
    try {
      const logFile = this.getLogFilePath();

      if (!fs.existsSync(logFile)) {
        return {
          success: false,
          error: 'Log file not found. Backend server may not have been started yet.'
        };
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim() !== '');

      // 获取最后N行
      const logs = allLines.slice(-lines);

      return {
        success: true,
        logs,
        logFile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 清理日志文件
   */
  static clearLogs(): { success: boolean; error?: string } {
    try {
      const logFile = this.getLogFilePath();

      if (fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取日志文件信息
   */
  static getLogFileInfo(): {
    exists: boolean;
    path?: string;
    size?: number;
    lastModified?: Date;
  } {
    try {
      const logFile = this.getLogFilePath();

      if (!fs.existsSync(logFile)) {
        return { exists: false };
      }

      const stats = fs.statSync(logFile);

      return {
        exists: true,
        path: logFile,
        size: stats.size,
        lastModified: stats.mtime
      };
    } catch (error) {
      return { exists: false };
    }
  }

  // ===== IProcessManager 接口实现 =====

  async startDaemon(): Promise<ProcessResult> {
    const result = ProcessManagerService.startDaemonProcess();
    return {
      success: result.success,
      message: result.success ? 'Daemon started successfully' : (result.error || 'Failed to start daemon'),
      pid: result.pid,
      error: result.error
    };
  }

  async stopDaemon(): Promise<ProcessResult> {
    const result = ProcessManagerService.stopDaemonProcess();
    return {
      success: result.success,
      message: result.success ? 'Daemon stopped successfully' : (result.error || 'Failed to stop daemon'),
      error: result.error
    };
  }

  async getStatus(): Promise<ProcessStatus> {
    const status = ProcessManagerService.getServerStatus();
    return {
      isRunning: status.running,
      pid: status.pid,
      uptime: 0, // 可以扩展计算运行时间
      memoryUsage: 0, // 可以扩展获取内存使用
      cpuUsage: 0     // 可以扩展获取CPU使用
    };
  }

  async isRunning(): Promise<boolean> {
    const status = ProcessManagerService.getServerStatus();
    return status.running;
  }

  async restart(): Promise<ProcessResult> {
    // 先停止再启动
    const stopResult = await this.stopDaemon();
    if (stopResult.success) {
      // 等待一段时间确保进程完全停止
      await new Promise(resolve => setTimeout(resolve, 2000));
      const startResult = await this.startDaemon();
      return {
        success: startResult.success,
        message: startResult.success ? 'Daemon restarted successfully' : 'Failed to restart daemon',
        pid: startResult.pid,
        error: startResult.error
      };
    }
    return {
      success: false,
      message: 'Failed to stop daemon for restart',
      error: stopResult.error
    };
  }

  async kill(signal?: string): Promise<ProcessResult> {
    const result = await this.stopDaemon();
    return {
      success: result.success,
      message: result.success ? 'Process killed successfully' : 'Failed to kill process',
      error: result.error
    };
  }
}
