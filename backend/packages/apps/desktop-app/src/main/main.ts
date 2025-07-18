import { app, BrowserWindow } from 'electron';
import {
  LogManager,
  ServiceManager,
  WindowManager,
  TrayManager,
  IPCManager
} from './managers';
import { getDesktopConfigService, cleanupDesktopConfigService } from './services';

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
        this.logger.log('App is ready, initializing configuration service...');

        // 初始化配置服务
        try {
          await getDesktopConfigService();
          this.logger.log('Desktop configuration service initialized successfully');
        } catch (error) {
          this.logger.log(`Failed to initialize configuration service: ${error}`, 'ERROR');
        }

        this.logger.log('Starting services...');

        // 启动所有服务
        await this.serviceManager.startAllServices();
        this.logger.log('All services startup completed, creating window...');

        // 创建主窗口
        const mainWindow = this.windowManager.createWindow();
        this.logger.log('Window created successfully');

        // 设置退出回调
        this.windowManager.setExitCallback(() => {
          this.logger.log('Exit requested from window manager');
          this.isQuiting = true;
          this.windowManager.setQuiting(true);
          this.cleanup();
        });

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
      // 在macOS上，即使所有窗口关闭，应用通常也保持活跃
      // 但如果用户明确要求退出，我们应该退出
      if (this.isQuiting || process.platform !== 'darwin') {
        this.cleanup();
      }
    });

    app.on('before-quit', (event) => {
      if (!this.isQuiting) {
        event.preventDefault();
        this.isQuiting = true;
        this.windowManager.setQuiting(true);
        this.cleanup();
      }
    });

    // 处理应用程序崩溃或异常退出
    process.on('SIGINT', () => {
      this.logger.log('Received SIGINT, cleaning up...');
      this.cleanup();
    });

    process.on('SIGTERM', () => {
      this.logger.log('Received SIGTERM, cleaning up...');
      this.cleanup();
    });

    process.on('uncaughtException', (error) => {
      this.logger.log(`Uncaught Exception: ${error}`, 'ERROR');
      this.cleanup();
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
    });
  }

  private setupTray(): void {
    this.trayManager.createTray(
      () => this.windowManager.showMainWindow(),
      () => this.windowManager.hideMainWindow(),
      () => this.trayManager.showStatus(this.serviceManager.getBackendStatus()),
      () => {
        this.logger.log('Exit requested from tray menu');
        this.isQuiting = true;
        this.windowManager.setQuiting(true);
        this.cleanup();
      }
    );
  }

  private showError(message: string): void {
    const { dialog } = require('electron');
    dialog.showErrorBox('Error', message);
  }

  private async cleanup(): Promise<void> {
    if (this.isQuiting) {
      return; // 防止重复清理
    }

    this.logger.log('Cleaning up...');
    this.isQuiting = true;

    try {
      // 设置清理超时，防止无限等待
      const cleanupPromise = this.performCleanup();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Cleanup timeout')), 10000); // 10秒超时
      });

      await Promise.race([cleanupPromise, timeoutPromise]);
    } catch (error) {
      this.logger.log(`Error during cleanup: ${error}`, 'ERROR');
    }

    // 强制退出
    this.forceQuit();
  }

  private async performCleanup(): Promise<void> {
    // 停止所有服务
    try {
      await this.serviceManager.stopAllServices();
      this.logger.log('All services stopped successfully');
    } catch (error) {
      this.logger.log(`Error stopping services: ${error}`, 'ERROR');
    }

    // 清理配置服务
    try {
      await cleanupDesktopConfigService();
      this.logger.log('Desktop configuration service cleaned up successfully');
    } catch (error) {
      this.logger.log(`Error cleaning up configuration service: ${error}`, 'ERROR');
    }

    // 销毁托盘
    try {
      this.trayManager.destroy();
      this.logger.log('Tray destroyed successfully');
    } catch (error) {
      this.logger.log(`Error destroying tray: ${error}`, 'ERROR');
    }
  }

  private forceQuit(): void {
    this.logger.log('Force quitting application...');

    // 关闭所有窗口
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      try {
        if (!window.isDestroyed()) {
          window.destroy();
        }
      } catch (error) {
        this.logger.log(`Error destroying window: ${error}`, 'ERROR');
      }
    });

    // 强制退出应用
    try {
      app.quit();
    } catch (error) {
      this.logger.log(`Error quitting app: ${error}`, 'ERROR');
      // 最后的手段：强制退出进程
      process.exit(0);
    }
  }
}

// Create application instance
new DesktopApp();
