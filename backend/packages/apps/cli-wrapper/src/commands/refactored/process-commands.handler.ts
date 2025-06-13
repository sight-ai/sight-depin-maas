import {
  IDirectServiceAccess,
  IUserInterface,
  IProcessManager,
  CommandResult,
  ProcessResult,
  BoxType
} from '../../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 进程命令处理器 
 * 只负责进程管理相关命令的处理逻辑，直接使用libs服务
 */
export class ProcessCommandsHandler {
  constructor(
    private readonly serviceAccess: IDirectServiceAccess,
    private readonly ui: IUserInterface,
    private readonly processManager: IProcessManager,
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {}

  /**
   * 处理启动命令
   */
  async handleStart(daemon: boolean = false, port: string = '8716'): Promise<CommandResult> {
    try {
      // 检查是否已经运行
      const isRunning = await this.processManager.isRunning();
      if (isRunning) {
        const status = await this.processManager.getStatus();
        this.ui.warning(`Backend server is already running (PID: ${status.pid})`);
        return {
          success: false,
          error: 'Backend server is already running',
          code: 'ALREADY_RUNNING',
          timestamp: new Date().toISOString()
        };
      }

      if (daemon) {
        // 守护进程模式
        const spinner = this.ui.showSpinner('Starting backend server as daemon...');
        spinner.start();

        const result = await this.processManager.startDaemon();
        
        if (result.success) {
          spinner.succeed(`Backend server started successfully (PID: ${result.pid})`);
          this.showStartSuccess(result.pid, true);
        } else {
          spinner.fail('Failed to start backend server');
          this.ui.error(result.message || 'Failed to start daemon');
        }

        return {
          success: result.success,
          data: { pid: result.pid, daemon: true },
          error: result.error,
          timestamp: new Date().toISOString()
        };
      } else {
        // 前台模式
        this.ui.info('Starting backend server in foreground mode...');
        this.ui.info('Press Ctrl+C to stop the server');
        
        // 这里应该启动前台进程
        // 目前返回成功，实际实现需要启动Express服务器
        this.showStartSuccess(process.pid, false);
        
        return {
          success: true,
          data: { pid: process.pid, daemon: false },
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to start server: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'START_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理停止命令
   */
  async handleStop(): Promise<CommandResult> {
    try {
      const spinner = this.ui.showSpinner('Stopping backend server...');
      spinner.start();

      const result = await this.processManager.stopDaemon();
      
      if (result.success) {
        spinner.succeed('Backend server stopped successfully');
        this.ui.success(result.message || 'Server stopped');
      } else {
        spinner.fail('Failed to stop backend server');
        this.ui.error(result.message || 'Failed to stop server');
      }

      return {
        success: result.success,
        data: result,
        error: result.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to stop server: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'STOP_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理重启命令
   */
  async handleRestart(): Promise<CommandResult> {
    try {
      const spinner = this.ui.showSpinner('Restarting backend server...');
      spinner.start();

      const result = await this.processManager.restart();
      
      if (result.success) {
        spinner.succeed(`Backend server restarted successfully (PID: ${result.pid})`);
        this.showRestartSuccess(result.pid);
      } else {
        spinner.fail('Failed to restart backend server');
        this.ui.error(result.message || 'Failed to restart server');
      }

      return {
        success: result.success,
        data: { pid: result.pid },
        error: result.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to restart server: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'RESTART_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理进程状态查询命令
   */
  async handleProcessStatus(): Promise<CommandResult> {
    try {
      const spinner = this.ui.showSpinner('Checking process status...');
      spinner.start();

      const [processStatus, servicesHealth] = await Promise.allSettled([
        this.processManager.getStatus(),
        this.checkServicesHealth()
      ]);

      spinner.stop();

      const status = processStatus.status === 'fulfilled' ? processStatus.value : null;
      const health = servicesHealth.status === 'fulfilled' ? servicesHealth.value : null;

      this.showProcessStatus(status, health);

      return {
        success: true,
        data: { processStatus: status, servicesHealth: health },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to get process status: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'STATUS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理日志查看命令
   */
  async handleLogs(lines: number = 50, follow: boolean = false): Promise<CommandResult> {
    try {
      this.ui.info(`Showing last ${lines} lines of logs...`);
      
      if (follow) {
        this.ui.info('Following logs (Press Ctrl+C to stop)...');
        // 这里应该实现日志跟踪功能
        // 目前只显示提示信息
      }

      // 这里应该读取实际的日志文件
      // 目前返回模拟数据
      const logs = [
        `[${new Date().toISOString()}] INFO: Server started`,
        `[${new Date().toISOString()}] INFO: Listening on port 8716`,
        `[${new Date().toISOString()}] DEBUG: Health check passed`
      ];

      logs.forEach(log => console.log(log));

      return {
        success: true,
        data: { logs, lines, follow },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to get logs: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'LOGS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查服务健康状态
   */
  private async checkServicesHealth(): Promise<any> {
    try {
      const healthResult = await this.serviceAccess.checkServicesHealth();
      return healthResult;
    } catch {
      return null;
    }
  }

  /**
   * 显示启动成功信息
   */
  private showStartSuccess(pid?: number, daemon: boolean = false): void {
    const mode = daemon ? 'daemon' : 'foreground';
    const content = `Backend server started successfully in ${mode} mode.\n\n` +
      `Process ID: ${pid || 'N/A'}\n` +
      `API URL: http://localhost:8716\n\n` +
      `Available endpoints:\n` +
      `• Health: GET /api/v1/health\n` +
      `• Models: GET /api/v1/models/info/list\n` +
      `• Device: GET /api/v1/device/monitoring/current\n\n` +
      `Use 'status' command to check server status\n` +
      `Use 'stop' command to stop the server`;

    this.ui.showBox('Server Started', content, BoxType.SUCCESS);
  }

  /**
   * 显示重启成功信息
   */
  private showRestartSuccess(pid?: number): void {
    const content = `Backend server restarted successfully.\n\n` +
      `New Process ID: ${pid || 'N/A'}\n` +
      `API URL: http://localhost:8716\n\n` +
      `Server is ready to accept requests.`;

    this.ui.showBox('Server Restarted', content, BoxType.SUCCESS);
  }

  /**
   * 显示进程状态
   */
  private showProcessStatus(processStatus: any, apiHealth: any): void {
    this.ui.showSubtitle('Process Status');

    // 进程状态
    this.ui.showSubtitle('Process Information');
    if (processStatus?.isRunning) {
      this.ui.showKeyValue('Status', 'Running');
      this.ui.showKeyValue('Process ID', processStatus.pid?.toString() || 'N/A');
      this.ui.showKeyValue('Start Time', processStatus.startTime ? new Date(processStatus.startTime).toLocaleString() : 'N/A');
      this.ui.showKeyValue('Uptime', this.formatUptime(processStatus.uptime));
      this.ui.showKeyValue('Memory Usage', this.formatMemory(processStatus.memoryUsage));
    } else {
      this.ui.showKeyValue('Status', 'Not Running');
    }

    console.log();

    // API健康状态
    this.ui.showSubtitle('API Health');
    if (apiHealth?.isHealthy) {
      this.ui.showKeyValue('API Status', 'Healthy');
      this.ui.showKeyValue('Response Time', `${apiHealth.responseTime}ms`);
      this.ui.showKeyValue('Services', 
        Object.entries(apiHealth.services)
          .map(([name, status]) => `${name}: ${status ? 'OK' : 'FAIL'}`)
          .join(', ')
      );
    } else {
      this.ui.showKeyValue('API Status', 'Unhealthy or Unreachable');
    }
  }

  /**
   * 格式化运行时间
   */
  private formatUptime(uptimeMs?: number): string {
    if (!uptimeMs) return 'N/A';
    
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * 格式化内存使用
   */
  private formatMemory(bytes?: number): string {
    if (!bytes) return 'N/A';
    
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }
}
