import { app, BrowserWindow } from 'electron';
import {
  LogManager,
  ServiceManager,
  WindowManager,
  TrayManager,
  IPCManager
} from './managers';

class DesktopApp {
  private isQuiting = false;
  private isDev = process.argv.includes('--dev');

  // 管理器实例
  private logger: LogManager;
  private serviceManager: ServiceManager;
  private windowManager: WindowManager;
  private trayManager: TrayManager;
  private ipcManager: IPCManager;

  constructor() {
    // 初始化管理器
    this.logger = new LogManager();
    this.serviceManager = new ServiceManager(this.logger, this.isDev);
    this.windowManager = new WindowManager(this.logger, this.isDev);
    this.trayManager = new TrayManager(this.logger, this.isDev);
    this.ipcManager = new IPCManager(this.logger, this.serviceManager);

    this.logger.log(`Development mode: ${this.isDev}`);
    this.setupApp();
  }

  private setupApp(): void {
    // 设置应用程序安全策略
    app.whenReady().then(async () => {
      try {
        this.logger.log('App is ready, starting services...');

        // 启动所有服务
        await this.serviceManager.startAllServices();
        this.logger.log('All services startup completed, creating window...');

        // 创建主窗口
        const mainWindow = this.windowManager.createWindow();
        this.logger.log('Window created successfully');

        // 设置窗口关闭到托盘
        this.windowManager.setCloseToTray(() => {
          if (!this.isQuiting) {
            this.windowManager.hideMainWindow();
          }
        });

        // 创建系统托盘
        this.setupTray();

        // 通知渲染进程后端服务已就绪
        this.logger.log('Notifying renderer that backend is ready...');
        this.ipcManager.notifyBackendStatusChange(mainWindow);
        this.logger.log('Backend status notification sent');

      } catch (error) {
        this.logger.log(`Error during app initialization: ${error}`, 'ERROR');
        this.showError('Failed to initialize application: ' + (error as Error).message);
      }

      app.on('activate', () => {
        // On macOS, clicking the dock icon should show the window
        if (BrowserWindow.getAllWindows().length === 0) {
          this.windowManager.createWindow();
        } else {
          // Show and focus the existing window
          this.windowManager.showMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      this.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.isQuiting = true;
      this.cleanup();
    });

    // 处理应用程序崩溃或异常退出
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('uncaughtException', (error) => {
      this.logger.log(`Uncaught Exception: ${error}`, 'ERROR');
      this.cleanup();
    });
  }

  private setupTray(): void {
    this.trayManager.createTray(
      () => this.windowManager.showMainWindow(),
      () => this.windowManager.hideMainWindow(),
      () => this.trayManager.showStatus(this.serviceManager.getBackendStatus()),
      () => this.cleanup()
    );
  }

  private showError(message: string): void {
    const { dialog } = require('electron');
    dialog.showErrorBox('Error', message);
  }

  private async cleanup(): Promise<void> {
    this.logger.log('Cleaning up...');
    this.isQuiting = true;

    try {
      await this.serviceManager.stopAllServices();
    } catch (error) {
      this.logger.log(`Error during cleanup: ${error}`, 'ERROR');
    }

    this.trayManager.destroy();
    app.quit();
  }
}

// Create application instance
new DesktopApp();
