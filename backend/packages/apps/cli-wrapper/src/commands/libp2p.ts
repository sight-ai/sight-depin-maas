import { LibP2PProcessManagerService } from '../services/libp2p-process-manager';
import { UIUtils } from '../utils/ui';

/**
 * LibP2P相关命令处理类
 */
export class LibP2PCommands {
  
  /**
   * 启动LibP2P服务
   */
  static async startService(): Promise<void> {
    try {
      UIUtils.showSection('Starting LibP2P Service');

      const spinner = UIUtils.createSpinner('Starting LibP2P server...');
      spinner.start();

      const result = LibP2PProcessManagerService.startDaemonProcess();
      spinner.stop();

      if (result.success) {
        UIUtils.success('LibP2P server started successfully');
        UIUtils.info(`Process ID: ${result.pid}`);
        UIUtils.info('LibP2P is now running in background');
        
        // 显示日志文件位置
        const logInfo = LibP2PProcessManagerService.getLogFileInfo();
        if (logInfo.exists) {
          UIUtils.info(`Logs: ${logInfo.path}`);
        }
      } else {
        UIUtils.error(`Failed to start LibP2P server: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error starting LibP2P service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 停止LibP2P服务
   */
  static async stopService(): Promise<void> {
    try {
      UIUtils.showSection('Stopping LibP2P Service');

      const spinner = UIUtils.createSpinner('Stopping LibP2P server...');
      spinner.start();

      const result = LibP2PProcessManagerService.stopDaemonProcess();
      spinner.stop();

      if (result.success) {
        UIUtils.success('LibP2P server stopped successfully');
      } else {
        UIUtils.error(`Failed to stop LibP2P server: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error stopping LibP2P service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 重启LibP2P服务
   */
  static async restartService(): Promise<void> {
    try {
      UIUtils.showSection('Restarting LibP2P Service');

      // 先停止
      UIUtils.info('Stopping LibP2P server...');
      const stopResult = LibP2PProcessManagerService.stopDaemonProcess();
      
      if (stopResult.success || stopResult.error?.includes('not running')) {
        // 等待一段时间确保进程完全停止
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 再启动
        UIUtils.info('Starting LibP2P server...');
        const startResult = LibP2PProcessManagerService.startDaemonProcess();
        
        if (startResult.success) {
          UIUtils.success('LibP2P server restarted successfully');
          UIUtils.info(`Process ID: ${startResult.pid}`);
        } else {
          UIUtils.error(`Failed to start LibP2P server: ${startResult.error}`);
        }
      } else {
        UIUtils.error(`Failed to stop LibP2P server: ${stopResult.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error restarting LibP2P service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取LibP2P进程状态
   */
  static async getProcessStatus(): Promise<void> {
    try {
      UIUtils.showSection('LibP2P Process Status');

      const status = LibP2PProcessManagerService.getServerStatus();

      if (status.running) {
        UIUtils.success('LibP2P server is running');
        console.log('');
        console.log(`  Process ID: ${status.pid}`);
        console.log(`  Started: ${status.startTime ? new Date(status.startTime).toLocaleString() : 'Unknown'}`);
        console.log(`  Project Path: ${status.projectPath || 'Unknown'}`);
        
        // 显示日志文件信息
        const logInfo = LibP2PProcessManagerService.getLogFileInfo();
        if (logInfo.exists) {
          console.log(`  Log File: ${logInfo.path}`);
          console.log(`  Log Size: ${logInfo.size ? (logInfo.size / 1024).toFixed(2) + ' KB' : 'Unknown'}`);
          console.log(`  Last Modified: ${logInfo.lastModified ? logInfo.lastModified.toLocaleString() : 'Unknown'}`);
        }
      } else {
        UIUtils.warning('LibP2P server is not running');
        UIUtils.info('Use "sight libp2p start" to start the LibP2P server');
      }
    } catch (error) {
      UIUtils.error(`Error getting LibP2P status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 查看LibP2P日志
   */
  static async viewLogs(lines: number = 30): Promise<void> {
    try {
      UIUtils.showSection('LibP2P Server Logs');

      // 检查服务器状态
      const status = LibP2PProcessManagerService.getServerStatus();
      if (!status.running) {
        UIUtils.warning('LibP2P server is not running');
        UIUtils.info('Use "sight libp2p start" to start the LibP2P server');
        console.log('');
      }

      // 获取日志文件信息
      const logInfo = LibP2PProcessManagerService.getLogFileInfo();
      if (!logInfo.exists) {
        UIUtils.warning('No log file found');
        UIUtils.info('LibP2P server may not have been started yet');
        return;
      }

      // 显示日志文件信息
      console.log(`📁 Log file: ${logInfo.path}`);
      console.log(`📊 Size: ${logInfo.size ? (logInfo.size / 1024).toFixed(2) + ' KB' : 'Unknown'}`);
      console.log(`🕒 Last modified: ${logInfo.lastModified ? logInfo.lastModified.toLocaleString() : 'Unknown'}`);
      console.log('');

      // 读取日志
      const result = LibP2PProcessManagerService.readLogs(lines);

      if (result.success && result.logs) {
        if (result.logs.length === 0) {
          UIUtils.info('Log file is empty');
        } else {
          UIUtils.info(`Showing last ${result.logs.length} lines:`);
          console.log('');
          console.log('─'.repeat(80));
          result.logs.forEach(line => {
            console.log(line);
          });
          console.log('─'.repeat(80));
        }
      } else {
        UIUtils.error(`Failed to read logs: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error reading LibP2P logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 清理LibP2P日志
   */
  static async clearLogs(): Promise<void> {
    try {
      UIUtils.showSection('Clearing LibP2P Logs');

      const result = LibP2PProcessManagerService.clearLogs();
      if (result.success) {
        UIUtils.success('LibP2P log file cleared successfully');
      } else {
        UIUtils.error(`Failed to clear logs: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error clearing LibP2P logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 显示LibP2P配置信息
   */
  static async showConfiguration(): Promise<void> {
    try {
      UIUtils.showSection('LibP2P Configuration');

      const logFile = LibP2PProcessManagerService.getLogFileInfo();

      console.log('📁 Project Configuration:');
      console.log(`  Log File: ${logFile.path}`);
      console.log('');

      // 显示环境变量
      console.log('🔧 Environment Variables:');
      console.log(`  SIGHTAI_DATA_DIR: ${process.env.SIGHTAI_DATA_DIR || 'Not set (using default)'}`);
      console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
      console.log('');

      // 显示当前状态
      const status = LibP2PProcessManagerService.getServerStatus();
      console.log('📊 Current Status:');
      console.log(`  Running: ${status.running ? '✅ Yes' : '❌ No'}`);
      if (status.running) {
        console.log(`  PID: ${status.pid}`);
        console.log(`  Started: ${status.startTime ? new Date(status.startTime).toLocaleString() : 'Unknown'}`);
        console.log(`  Project Path: ${status.projectPath || 'Unknown'}`);
      }
    } catch (error) {
      UIUtils.error(`Error showing LibP2P configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
