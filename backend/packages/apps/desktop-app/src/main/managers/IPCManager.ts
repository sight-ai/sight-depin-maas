import { ipcMain, app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import * as os from 'os';
import * as fs from 'fs';
import { LogManager } from './LogManager';
import { ServiceManager } from './ServiceManager';
import { getDesktopConfigService, IDesktopConfigService } from '../services';

export class IPCManager {
  private logger: LogManager;
  private serviceManager: ServiceManager;
  private configService: IDesktopConfigService | null = null;

  constructor(logger: LogManager, serviceManager: ServiceManager) {
    this.logger = logger;
    this.serviceManager = serviceManager;
    this.initializeConfigService();
    this.setupIPC();
  }

  private async initializeConfigService(): Promise<void> {
    try {
      this.configService = await getDesktopConfigService();
      this.logger.log('Desktop config service initialized successfully');
    } catch (error) {
      this.logger.log(`Failed to initialize desktop config service: ${error}`, 'ERROR');
    }
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

    // 读取设备配置 - 使用新的统一配置管理
    ipcMain.handle('read-device-config', async () => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const deviceConfig = await this.configService.getDeviceConfig();

        return {
          success: true,
          data: {
            deviceId: deviceConfig.deviceId,
            deviceName: deviceConfig.deviceName,
            gatewayAddress: deviceConfig.gatewayAddress,
            rewardAddress: deviceConfig.rewardAddress,
            code: deviceConfig.code
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

    // 系统信息 API - 使用新的统一配置管理
    ipcMain.handle('get-system-info', async () => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const systemInfo = await this.configService.getSystemInfo();

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

    // 应用信息 API - 使用新的统一配置管理
    ipcMain.handle('get-app-info', async () => {
      try {
        if (!this.configService) {
          return {
            version: app.getVersion(),
            startTime: this.serviceManager.getStartTime(),
            uptime: Date.now() - this.serviceManager.getStartTime(),
            environment: 'production'
          };
        }

        const appInfo = await this.configService.getAppInfo();

        // 合并服务管理器的信息
        return {
          ...appInfo,
          startTime: this.serviceManager.getStartTime(),
          uptime: Date.now() - this.serviceManager.getStartTime()
        };
      } catch (error) {
        this.logger.log(`Failed to get app info: ${error}`, 'ERROR');
        return {
          version: app.getVersion(),
          startTime: this.serviceManager.getStartTime(),
          uptime: Date.now() - this.serviceManager.getStartTime(),
          environment: 'production'
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

    // 新增：配置管理 API
    ipcMain.handle('get-all-config', async () => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const config = await this.configService.getAllConfig();
        return {
          success: true,
          data: config
        };
      } catch (error) {
        this.logger.log(`Failed to get all config: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 新增：更新设备配置
    ipcMain.handle('update-device-config', async (_, config) => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const success = await this.configService.updateDeviceConfig(config);
        return {
          success,
          message: success ? 'Device configuration updated successfully' : 'Failed to update device configuration'
        };
      } catch (error) {
        this.logger.log(`Failed to update device config: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 新增：获取应用设置
    ipcMain.handle('get-app-settings', async () => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const settings = await this.configService.getAppSettings();
        return {
          success: true,
          data: settings
        };
      } catch (error) {
        this.logger.log(`Failed to get app settings: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 新增：更新应用设置
    ipcMain.handle('update-app-settings', async (_, settings) => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const success = await this.configService.updateAppSettings(settings);
        return {
          success,
          message: success ? 'App settings updated successfully' : 'Failed to update app settings'
        };
      } catch (error) {
        this.logger.log(`Failed to update app settings: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 新增：验证配置
    ipcMain.handle('validate-config', async () => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const validation = await this.configService.validateConfig();
        return {
          success: true,
          data: validation
        };
      } catch (error) {
        this.logger.log(`Failed to validate config: ${error}`, 'ERROR');
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // 新增：备份配置
    ipcMain.handle('backup-config', async (_, description) => {
      try {
        if (!this.configService) {
          return {
            success: false,
            error: 'Configuration service not initialized'
          };
        }

        const result = await this.configService.backupConfig(description);
        return result;
      } catch (error) {
        this.logger.log(`Failed to backup config: ${error}`, 'ERROR');
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
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
