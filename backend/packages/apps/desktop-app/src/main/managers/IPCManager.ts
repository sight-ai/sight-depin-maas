import { ipcMain, app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import * as os from 'os';
import * as fs from 'fs';
import { LogManager } from './LogManager';
import { ServiceManager } from './ServiceManager';

export class IPCManager {
  private logger: LogManager;
  private serviceManager: ServiceManager;

  constructor(logger: LogManager, serviceManager: ServiceManager) {
    this.logger = logger;
    this.serviceManager = serviceManager;
    this.setupIPC();
  }

  private setupIPC(): void {
    // 获取后端服务状态
    ipcMain.handle('get-backend-status', () => {
      return this.serviceManager.getBackendStatus();
    });

    // 设置自动启动
    ipcMain.handle('set-auto-start', async (_, enabled: boolean) => {
      try {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: process.execPath,
          args: []
        });
        this.logger.log(`Auto start setting updated: ${enabled}`);
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to set auto start: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 获取自动启动状态
    ipcMain.handle('get-auto-start', () => {
      try {
        const loginItemSettings = app.getLoginItemSettings();
        return loginItemSettings.openAtLogin;
      } catch (error) {
        this.logger.log(`Failed to get auto start status: ${error}`, 'ERROR');
        return false;
      }
    });

    // 读取设备配置
    ipcMain.handle('read-device-config', () => {
      try {
        const configPath = join(homedir(), '.sightai', 'config', 'device-registration.json');
        if (!existsSync(configPath)) {
          return {
            success: false,
            error: 'Device registration config file not found'
          };
        }

        const configData = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);

        return {
          success: true,
          data: {
            deviceId: config.deviceId || '',
            deviceName: config.deviceName || '',
            gatewayAddress: config.gatewayAddress || '',
            rewardAddress: config.rewardAddress || '',
            code: config.code || ''
          }
        };
      } catch (error) {
        this.logger.log(`Failed to read device config: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 重启服务
    ipcMain.handle('restart-services', async () => {
      try {
        await this.serviceManager.restartAllServices();
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to restart services: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 系统信息 API
    ipcMain.handle('get-system-info', async () => {
      try {
        const systemInfo = {
          platform: os.platform(),
          arch: os.arch(),
          version: os.release(),
          uptime: os.uptime(),
          memory: {
            total: os.totalmem(),
            used: os.totalmem() - os.freemem(),
            free: os.freemem()
          },
          cpu: {
            model: os.cpus()[0]?.model || 'Unknown',
            usage: 0 // CPU usage calculation would need additional implementation
          },
          disk: {
            total: 0, // Disk info would need additional implementation
            used: 0,
            free: 0
          }
        };

        return {
          success: true,
          data: systemInfo
        };
      } catch (error) {
        this.logger.log(`Failed to get system info: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 应用信息 API
    ipcMain.handle('get-app-info', async () => {
      try {
        const appInfo = {
          version: app.getVersion(),
          startTime: this.serviceManager.getStartTime(),
          uptime: Date.now() - this.serviceManager.getStartTime()
        };

        return appInfo;
      } catch (error) {
        this.logger.log(`Failed to get app info: ${error}`, 'ERROR');
        return {
          version: 'Unknown',
          startTime: Date.now(),
          uptime: 0
        };
      }
    });

    // 服务管理 API
    ipcMain.handle('restart-backend', async () => {
      try {
        await this.serviceManager.restartBackendService();
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to restart backend: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('stop-backend', async () => {
      try {
        this.serviceManager.stopBackendServicePublic();
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to stop backend: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('start-backend', async () => {
      try {
        await this.serviceManager.startBackendServicePublic();
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to start backend: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 日志管理 API
    ipcMain.handle('get-logs', async (_, options) => {
      try {
        const logs = await this.logger.getLogs(options);
        return {
          success: true,
          data: logs
        };
      } catch (error) {
        this.logger.log(`Failed to get logs: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 文件/目录操作 API
    ipcMain.handle('open-path', async (_, path: string) => {
      try {
        await shell.openPath(path);
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to open path: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('show-item-in-folder', async (_, path: string) => {
      try {
        shell.showItemInFolder(path);
        return { success: true };
      } catch (error) {
        this.logger.log(`Failed to show item in folder: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  public notifyBackendStatusChange(mainWindow: BrowserWindow | null): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const status = this.serviceManager.getBackendStatus();
      mainWindow.webContents.send('backend-status-changed', status);
    }
  }
}
