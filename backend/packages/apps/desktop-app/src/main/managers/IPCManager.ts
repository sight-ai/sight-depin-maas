import { ipcMain, app, BrowserWindow } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
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
  }

  public notifyBackendStatusChange(mainWindow: BrowserWindow | null): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const status = this.serviceManager.getBackendStatus();
      mainWindow.webContents.send('backend-status-changed', status);
    }
  }
}
