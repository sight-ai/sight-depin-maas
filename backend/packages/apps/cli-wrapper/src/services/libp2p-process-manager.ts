import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import {
  ProcessResult,
  ProcessStatus,
} from '../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * LibP2P进程管理服务
 * 专门负责libp2p项目的生命周期管理
 */
export class LibP2PProcessManagerService {
  private readonly errorHandler: ErrorHandlerService;
  private static readonly PID_FILE_NAME = 'libp2p.pid';
  private static readonly LOCK_FILE_NAME = 'libp2p.lock';
  private static readonly LOG_FILE_NAME = 'libp2p.log';
  private static readonly LIBP2P_PROJECT_PATH = 'libp2p'; // 相对于backend目录的路径

  constructor(errorHandler?: ErrorHandlerService) {
    this.errorHandler = errorHandler || new ErrorHandlerService();
  }

  /**
   * 获取数据目录路径
   */
  private static getDataDir(): string {
    return process.env['SIGHTAI_DATA_DIR'] 
      ? path.join(process.env['SIGHTAI_DATA_DIR'], 'libp2p')
      : path.join(os.homedir(), '.sightai', 'libp2p');
  }

  /**
   * 获取PID文件路径
   */
  private static getPidFilePath(): string {
    return path.join(this.getDataDir(), this.PID_FILE_NAME);
  }

  /**
   * 获取锁文件路径
   */
  private static getLockFilePath(): string {
    return path.join(this.getDataDir(), this.LOCK_FILE_NAME);
  }

  /**
   * 获取日志文件路径
   */
  private static getLogFilePath(): string {
    return path.join(this.getDataDir(), this.LOG_FILE_NAME);
  }

  /**
   * 获取libp2p项目路径
   */
  private static getLibP2PProjectPath(): string {
    // 从当前执行目录找到backend目录，然后定位libp2p项目
    let currentDir = process.cwd();
    
    // 如果当前在dist-pkg目录（打包后的执行环境）
    if (currentDir.includes('dist-pkg')) {
      // 向上查找backend目录
      while (currentDir && !fs.existsSync(path.join(currentDir, 'backend'))) {
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break; // 到达根目录
        currentDir = parentDir;
      }
      return path.join(currentDir, 'backend', this.LIBP2P_PROJECT_PATH);
    }
    
    // 如果当前在backend目录或其子目录
    while (currentDir && !fs.existsSync(path.join(currentDir, 'libp2p'))) {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break; // 到达根目录
      currentDir = parentDir;
    }
    
    return path.join(currentDir, this.LIBP2P_PROJECT_PATH);
  }

  /**
   * 确保数据目录存在
   */
  private static ensureDataDir(): void {
    const dataDir = this.getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * 读取PID
   */
  private static readPid(): number | null {
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
   * 保存PID
   */
  private static savePid(pid: number): void {
    try {
      this.ensureDataDir();
      const pidFile = this.getPidFilePath();
      const lockFile = this.getLockFilePath();
      
      fs.writeFileSync(pidFile, pid.toString(), 'utf8');
      
      // 保存锁文件，包含更多信息
      const lockData = {
        pid,
        startTime: new Date().toISOString(),
        executable: process.argv[0],
        projectPath: this.getLibP2PProjectPath()
      };
      fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save LibP2P PID:', error);
    }
  }

  /**
   * 检查进程是否在运行
   */
  private static isProcessRunning(pid: number): boolean {
    try {
      // 发送信号0来检查进程是否存在
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前运行的libp2p进程信息
   */
  static getRunningProcessInfo(): { pid: number; startTime: string; executable: string; projectPath: string } | null {
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
   * 启动libp2p后台进程
   */
  static startDaemonProcess(): { success: boolean; pid?: number; error?: string } {
    try {
      // 检查是否已有进程在运行
      const runningProcess = this.getRunningProcessInfo();
      if (runningProcess) {
        return {
          success: false,
          error: `LibP2P server is already running (PID: ${runningProcess.pid})`
        };
      }

      // 获取libp2p项目路径
      const libp2pPath = this.getLibP2PProjectPath();

      // 检查libp2p项目是否存在
      if (!fs.existsSync(libp2pPath)) {
        return {
          success: false,
          error: `LibP2P project not found at: ${libp2pPath}`
        };
      }

      // 检查package.json是否存在
      const packageJsonPath = path.join(libp2pPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return {
          success: false,
          error: `LibP2P package.json not found at: ${packageJsonPath}`
        };
      }

      // 创建日志文件
      this.ensureDataDir();
      const logFile = this.getLogFilePath();
      const logStream = fs.openSync(logFile, 'a');

      // 启动libp2p进程
      // 使用 npm start 或 pnpm start 来启动libp2p项目
      const packageManager = fs.existsSync(path.join(libp2pPath, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';

      const child = spawn(packageManager, ['start'], {
        cwd: libp2pPath,
        detached: true,
        stdio: ['ignore', logStream, logStream],
        env: {
          ...process.env,
          // 可以在这里设置libp2p特定的环境变量
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });

      // 让子进程独立运行
      child.unref();

      if (child.pid) {
        // 保存PID信息
        this.savePid(child.pid);

        return {
          success: true,
          pid: child.pid
        };
      } else {
        return {
          success: false,
          error: 'Failed to get LibP2P process ID'
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
   * 停止libp2p后台进程
   */
  static stopDaemonProcess(): { success: boolean; error?: string } {
    try {
      const pid = this.readPid();

      if (!pid) {
        return {
          success: false,
          error: 'No LibP2P server process found'
        };
      }

      if (!this.isProcessRunning(pid)) {
        // 进程已停止，清理文件
        this.cleanupPidFiles();
        return {
          success: true  // 进程已经停止，这是我们想要的结果
        };
      }

      // 尝试优雅停止
      try {
        process.kill(pid, 'SIGTERM');

        // 同步等待进程停止，最多等待5秒
        let attempts = 0;
        const maxAttempts = 50; // 5秒，每次等待100ms

        while (attempts < maxAttempts && this.isProcessRunning(pid)) {
          // 使用同步等待
          const start = Date.now();
          while (Date.now() - start < 100) {
            // 忙等待100ms
          }
          attempts++;
        }

        // 如果进程仍在运行，强制杀死
        if (this.isProcessRunning(pid)) {
          try {
            process.kill(pid, 'SIGKILL');

            // 再等待一小段时间确保进程被杀死
            attempts = 0;
            const maxKillAttempts = 10; // 1秒
            while (attempts < maxKillAttempts && this.isProcessRunning(pid)) {
              const start = Date.now();
              while (Date.now() - start < 100) {
                // 忙等待100ms
              }
              attempts++;
            }
          } catch (error) {
            // 忽略错误，可能进程已经停止
          }
        }

        // 清理PID文件
        this.cleanupPidFiles();

        return {
          success: true
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to stop LibP2P process: ${error instanceof Error ? error.message : 'Unknown error'}`
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
   * 检查libp2p服务器状态
   */
  static getServerStatus(): {
    running: boolean;
    pid?: number;
    startTime?: string;
    projectPath?: string;
  } {
    const processInfo = this.getRunningProcessInfo();

    if (processInfo) {
      return {
        running: true,
        pid: processInfo.pid,
        startTime: processInfo.startTime,
        projectPath: processInfo.projectPath
      };
    } else {
      return {
        running: false
      };
    }
  }

  /**
   * 获取日志文件信息
   */
  static getLogFileInfo(): {
    exists: boolean;
    path: string;
    size?: number;
    lastModified?: Date;
  } {
    const logFile = this.getLogFilePath();

    try {
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        return {
          exists: true,
          path: logFile,
          size: stats.size,
          lastModified: stats.mtime
        };
      } else {
        return {
          exists: false,
          path: logFile
        };
      }
    } catch (error) {
      return {
        exists: false,
        path: logFile
      };
    }
  }

  /**
   * 读取日志文件
   */
  static readLogs(lines: number = 50): { success: boolean; logs?: string[]; error?: string } {
    try {
      const logFile = this.getLogFilePath();

      if (!fs.existsSync(logFile)) {
        return {
          success: false,
          error: 'Log file does not exist'
        };
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim() !== '');

      // 获取最后N行
      const logLines = allLines.slice(-lines);

      return {
        success: true,
        logs: logLines
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
        fs.writeFileSync(logFile, '', 'utf8');
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===== 实例方法 =====

  /**
   * 启动libp2p守护进程
   */
  async startDaemon(): Promise<ProcessResult> {
    const result = LibP2PProcessManagerService.startDaemonProcess();
    return {
      success: result.success,
      message: result.success ? 'LibP2P daemon started successfully' : (result.error || 'Failed to start LibP2P daemon'),
      pid: result.pid,
      error: result.error
    };
  }

  /**
   * 停止libp2p守护进程
   */
  async stopDaemon(): Promise<ProcessResult> {
    const result = LibP2PProcessManagerService.stopDaemonProcess();
    return {
      success: result.success,
      message: result.success ? 'LibP2P daemon stopped successfully' : (result.error || 'Failed to stop LibP2P daemon'),
      error: result.error
    };
  }

  /**
   * 获取libp2p进程状态
   */
  async getStatus(): Promise<ProcessStatus> {
    const status = LibP2PProcessManagerService.getServerStatus();
    return {
      isRunning: status.running,
      pid: status.pid,
      uptime: 0, // 可以扩展计算运行时间
      memoryUsage: 0, // 可以扩展获取内存使用
      cpuUsage: 0     // 可以扩展获取CPU使用
    };
  }

  /**
   * 检查libp2p是否在运行
   */
  async isRunning(): Promise<boolean> {
    const status = LibP2PProcessManagerService.getServerStatus();
    return status.running;
  }

  /**
   * 重启libp2p守护进程
   */
  async restart(): Promise<ProcessResult> {
    // 先停止再启动
    const stopResult = await this.stopDaemon();
    if (stopResult.success) {
      // 等待一段时间确保进程完全停止
      await new Promise(resolve => setTimeout(resolve, 2000));
      const startResult = await this.startDaemon();
      return {
        success: startResult.success,
        message: startResult.success ? 'LibP2P daemon restarted successfully' : 'Failed to restart LibP2P daemon',
        pid: startResult.pid,
        error: startResult.error
      };
    }
    return {
      success: false,
      message: 'Failed to stop LibP2P daemon for restart',
      error: stopResult.error
    };
  }

  /**
   * 强制杀死libp2p进程
   */
  async kill(signal?: string): Promise<ProcessResult> {
    const result = await this.stopDaemon();
    return {
      success: result.success,
      message: result.success ? 'LibP2P process killed successfully' : 'Failed to kill LibP2P process',
      error: result.error
    };
  }
}
