import { app, BrowserWindow, ipcMain, shell, Menu, dialog, MenuItemConstructorOptions, Tray, nativeImage } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

interface BackendService {
  instance: any;
  port: number;
  isRunning: boolean;
}

interface Libp2pService {
  instance: any;
  port: number;
  isRunning: boolean;
}

class DesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isQuiting = false;
  private backendService: BackendService = {
    instance: null,
    port: 8716,
    isRunning: false,
  };
  private libp2pService: Libp2pService = {
    instance: null,
    port: 4010,
    isRunning: false,
  };
  private isDev = process.argv.includes('--dev');

  constructor() {
    this.setupApp();
    this.setupIPC();
    this.setupTray();
  }

  private setupApp(): void {
    // 设置应用程序安全策略
    app.whenReady().then(async () => {
      try {
        console.log('App is ready, starting services...');
        // 先启动后端服务，等待完全启动
        await this.startBackendService();
        console.log('Backend service started, now starting libp2p service...');
        // 然后启动libp2p服务
        await this.startLibp2pService();
        console.log('All services startup completed, creating window...');
        this.createWindow();
        console.log('Window created successfully');

        // 通知渲染进程后端服务已就绪
        console.log('Notifying renderer that backend is ready...');
        this.notifyBackendStatusChange();
        console.log('Backend status notification sent');
      } catch (error) {
        console.error('Error during app initialization:', error);
        this.showError('Failed to initialize application: ' + (error as Error).message);
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
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
      this.cleanup();
    });

    // 处理应用程序崩溃或异常退出
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.cleanup();
    });
  }

  private createWindow(): void {
    console.log('Creating main window...');
    const preloadPath = join(__dirname, 'preload.js');
    console.log('Preload script path:', preloadPath);
    console.log('__dirname:', __dirname);

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // enableRemoteModule: false, // 已弃用
        preload: preloadPath,
      },
      titleBarStyle: 'default',
      show: false, // 先不显示，等加载完成后再显示
    });
    console.log('BrowserWindow created');

    // 加载应用
    if (this.isDev) {
      console.log('Loading development URL...');
      this.mainWindow.loadURL('http://localhost:4200');
      this.mainWindow.webContents.openDevTools();
    } else {
      console.log('Loading production HTML file...');
      this.mainWindow.loadFile(join(__dirname, '../index.html'));
    }

    // 窗口加载完成后显示
    this.mainWindow.once('ready-to-show', () => {
      console.log('Window is ready to show');
      this.mainWindow?.show();
    });

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 处理窗口关闭事件 - 最小化到托盘而不是退出
    this.mainWindow.on('close', (event) => {
      if (!this.isQuiting) {
        event.preventDefault();
        this.hideMainWindow();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.setupMenu();
  }

  private setupMenu(): void {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Restart Backend Service',
            click: () => this.restartBackendService(),
          },
          {
            label: 'View Logs',
            click: () => this.showLogs(),
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private async startLibp2pService(): Promise<void> {
    if (this.libp2pService.isRunning) {
      return;
    }

    try {
      const libp2pPath = this.getLibp2pPath();
      if (!existsSync(libp2pPath)) {
        console.error('Libp2p service not found:', libp2pPath);
        this.showError('Libp2p service not found. Please ensure the application is properly built.');
        return;
      }

      console.log('Starting libp2p service:', libp2pPath);

      const { spawn } = require('child_process');

      // 启动Go libp2p服务
      this.libp2pService.instance = spawn(libp2pPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LIBP2P_REST_API: this.libp2pService.port.toString(),
          API_PORT: this.backendService.port.toString(),
        }
      });

      // 监听输出
      this.libp2pService.instance.stdout.on('data', (data: Buffer) => {
        console.log('[Libp2p]', data.toString());
      });

      this.libp2pService.instance.stderr.on('data', (data: Buffer) => {
        console.error('[Libp2p Error]', data.toString());
      });

      this.libp2pService.instance.on('close', (code: number) => {
        console.log(`Libp2p service exited with code ${code}`);
        this.libp2pService.isRunning = false;
        this.libp2pService.instance = null;
      });

      // 等待libp2p服务启动
      await this.waitForLibp2pReady();

      this.libp2pService.isRunning = true;
      console.log('Libp2p service started successfully and is ready');

    } catch (error) {
      console.error('Failed to start libp2p service:', error);
      this.showError('Failed to start libp2p service: ' + (error as Error).message);
      this.libp2pService.isRunning = false;
      this.libp2pService.instance = null;
    }
  }

  private async startBackendService(): Promise<void> {
    if (this.backendService.isRunning) {
      return;
    }

    try {
      const backendPath = this.getBackendPath();
      if (!existsSync(backendPath)) {
        console.error('Backend service not found:', backendPath);
        this.showError('Backend service not found. Please ensure the application is properly built.');
        return;
      }

      console.log('Starting backend service:', backendPath);
      if (!this.isDev) {
        console.log('生产模式');
      }

      // 设置环境变量
      process.env['PORT'] = this.backendService.port.toString();

      // 使用 eval 来避免 webpack 的静态分析
      this.backendService.instance = eval('require')(backendPath);

      // 等待后端服务完全启动
      await this.waitForBackendReady();

      this.backendService.isRunning = true;
      console.log('Backend service started successfully and is ready');

      // 通知渲染进程后端服务状态变化
      this.notifyBackendStatusChange();

    } catch (error) {
      console.error('Failed to start backend service:', error);
      this.showError('Failed to start backend service: ' + (error as Error).message);
      this.backendService.isRunning = false;
      this.backendService.instance = null;
    }
  }

  private getBackendPath(): string {
    if (this.isDev) {
      // 开发模式：从工作目录的 dist 文件夹读取
      return join(process.cwd(), 'dist/packages/apps/api-server/main.js');
    } else {
      console.log('生产模式');
      // 生产模式：从应用资源目录读取
      const resourcesPath = this.getResourcesPath();
      return join(resourcesPath, 'backend/main.js');
    }
  }

  private getLibp2pPath(): string {
    if (this.isDev) {
      // 开发模式：从工作目录的libp2p服务目录读取
      return join(process.cwd(), 'packages/apps/desktop-app/libp2p-node-service/sight-libp2p-node');
    } else {
      // 生产模式：从应用资源目录读取
      const resourcesPath = this.getResourcesPath();
      return join(resourcesPath, 'libp2p/sight-libp2p-node');
    }
  }

  private getResourcesPath(): string {
    if (app.isPackaged) {
      // 打包后的应用：resources 在 app.asar 同级目录
      return join(process.resourcesPath, 'app');
    } else {
      // 未打包的应用：从 dist/packages/apps/desktop-app/electron 到 packages/apps/desktop-app/resources
      // __dirname = /path/to/backend/dist/packages/apps/desktop-app/electron
      // 需要回到项目根目录，然后到 packages/apps/desktop-app/resources
      const projectRoot = join(__dirname, '../../../../..');
      return join(projectRoot, 'packages/apps/desktop-app/resources');
    }
  }

  private async waitForBackendReady(): Promise<void> {
    const maxAttempts = 30; // 最多等待30秒
    const delay = 1000; // 每次检查间隔1秒

    console.log('Waiting for backend service to be ready...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 检查后端服务是否响应
        const response = await this.checkBackendHealth();
        if (response) {
          console.log(`Backend service is ready after ${attempt} attempts`);
          return;
        }
      } catch (error) {
        // 忽略连接错误，继续等待
      }

      console.log(`Waiting for backend... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Backend service failed to start within timeout period');
  }

  private async checkBackendHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: this.backendService.port,
        path: '/healthz', // 使用后端服务的简单健康检查端点
        method: 'GET',
        timeout: 2000,
      };

      console.log(`Checking backend health at http://localhost:${this.backendService.port}/healthz`);

      const req = http.request(options, (res: any) => {
        console.log(`Health check response: ${res.statusCode}`);
        resolve(res.statusCode === 200);
      });

      req.on('error', (error: any) => {
        console.log(`Health check error: ${error.message}`);
        resolve(false);
      });

      req.on('timeout', () => {
        console.log('Health check timeout');
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private async waitForLibp2pReady(): Promise<void> {
    const maxAttempts = 30; // 最多等待30秒
    const delay = 1000; // 每次检查间隔1秒

    console.log('Waiting for libp2p service to be ready...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 检查libp2p服务是否响应
        const response = await this.checkLibp2pHealth();
        if (response) {
          console.log(`Libp2p service is ready after ${attempt} attempts`);
          return;
        }
      } catch (error) {
        // 忽略连接错误，继续等待
      }

      console.log(`Waiting for libp2p... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Libp2p service failed to start within timeout period');
  }

  private async checkLibp2pHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: this.libp2pService.port,
        path: '/libp2p/send', // 检查libp2p REST API端点
        method: 'GET',
        timeout: 2000,
      };

      console.log(`Checking libp2p health at http://localhost:${this.libp2pService.port}/libp2p/send`);

      const req = http.request(options, (res: any) => {
        console.log(`Libp2p health check response: ${res.statusCode}`);
        // 405 Method Not Allowed 表示端点存在但不接受GET请求，这是正常的
        resolve(res.statusCode === 405 || res.statusCode === 200);
      });

      req.on('error', (error: any) => {
        console.log(`Libp2p health check error: ${error.message}`);
        resolve(false);
      });

      req.on('timeout', () => {
        console.log('Libp2p health check timeout');
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private stopBackendService(): void {
    if (this.backendService.instance && this.backendService.isRunning) {
      console.log('Stopping backend service...');

      try {
        // 如果后端应用有 close 或 stop 方法，调用它
        if (typeof this.backendService.instance.close === 'function') {
          this.backendService.instance.close();
        } else if (typeof this.backendService.instance.stop === 'function') {
          this.backendService.instance.stop();
        }
      } catch (error) {
        console.error('Error stopping backend service:', error);
      }

      this.backendService.isRunning = false;
      this.backendService.instance = null;
    }
  }

  private stopLibp2pService(): void {
    if (this.libp2pService.instance && this.libp2pService.isRunning) {
      console.log('Stopping libp2p service...');

      try {
        // 终止Go进程
        this.libp2pService.instance.kill('SIGTERM');

        // 如果SIGTERM不起作用，5秒后强制终止
        setTimeout(() => {
          if (this.libp2pService.instance && this.libp2pService.isRunning) {
            console.log('Force killing libp2p service...');
            this.libp2pService.instance.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        console.error('Error stopping libp2p service:', error);
      }

      this.libp2pService.isRunning = false;
      this.libp2pService.instance = null;
    }
  }

  private restartBackendService(): void {
    console.log('Restarting all services...');
    this.stopLibp2pService();
    this.stopBackendService();

    setTimeout(async () => {
      try {
        await this.startBackendService();
        await this.startLibp2pService();
      } catch (error) {
        console.error('Error restarting services:', error);
        this.showError('Failed to restart services: ' + (error as Error).message);
      }
    }, 2000);
  }

  private showLogs(): void {
    // 这里可以实现日志查看功能
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'Logs',
      message: 'Log viewing feature will be implemented here.',
    });
  }

  private showError(message: string): void {
    dialog.showErrorBox('Error', message);
  }

  private setupIPC(): void {
    ipcMain.handle('get-backend-status', () => {
      return {
        isRunning: this.backendService.isRunning,
        port: this.backendService.port,
      };
    });

    ipcMain.handle('restart-backend', () => {
      this.restartBackendService();
    });

    ipcMain.handle('set-auto-start', async (_, enabled: boolean) => {
      try {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: process.execPath,
          args: []
        });
        return { success: true };
      } catch (error) {
        console.error('Failed to set auto start:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    ipcMain.handle('get-auto-start', () => {
      try {
        const loginItemSettings = app.getLoginItemSettings();
        return loginItemSettings.openAtLogin;
      } catch (error) {
        console.error('Failed to get auto start status:', error);
        return false;
      }
    });
  }

  private notifyBackendStatusChange(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('backend-status-changed', {
        isRunning: this.backendService.isRunning,
        port: this.backendService.port,
      });
    }
  }

  private setupTray(): void {
    // 等待应用准备就绪后再创建托盘
    app.whenReady().then(() => {
      // 创建托盘图标 - 优先使用 PNG，然后是 SVG
      // 在生产模式下，图标文件在源代码的 resources 目录中
      let pngIconPath: string;
      let svgIconPath: string;

      if (this.isDev) {
        // 开发模式：从源代码目录读取
        pngIconPath = join(__dirname, '../../resources/icon.png');
        svgIconPath = join(__dirname, '../../resources/icon.svg');
      } else {
        // 生产模式：从源代码的 resources 目录读取
        const projectRoot = join(__dirname, '../../../../../');
        pngIconPath = join(projectRoot, 'packages/apps/desktop-app/resources/icon.png');
        svgIconPath = join(projectRoot, 'packages/apps/desktop-app/resources/icon.svg');
      }

      console.log('Checking icon paths:');
      console.log('PNG path:', pngIconPath);
      console.log('SVG path:', svgIconPath);
      console.log('PNG exists:', existsSync(pngIconPath));
      console.log('SVG exists:', existsSync(svgIconPath));

      let trayIcon: Electron.NativeImage;

      if (existsSync(pngIconPath)) {
        console.log('Using PNG icon for tray:', pngIconPath);
        trayIcon = nativeImage.createFromPath(pngIconPath);
        // 调整图标大小以适应托盘
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      } else if (existsSync(svgIconPath)) {
        console.log('Using SVG icon for tray:', svgIconPath);
        trayIcon = nativeImage.createFromPath(svgIconPath);
        // 调整图标大小以适应托盘
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      } else {
        console.log('No icon file found, using default');
        // 如果没有图标文件，创建一个简单的图标
        trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }

      this.tray = new Tray(trayIcon);
      this.tray.setToolTip('SightAI Desktop');

      // 创建托盘菜单
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示主窗口',
          click: () => this.showMainWindow(),
        },
        {
          label: '隐藏主窗口',
          click: () => this.hideMainWindow(),
        },
        { type: 'separator' },
        {
          label: '重启后端服务',
          click: () => this.restartBackendService(),
        },
        {
          label: '查看运行状态',
          click: () => this.showStatus(),
        },
        { type: 'separator' },
        {
          label: '退出应用',
          click: () => this.cleanup(),
        },
      ]);

      this.tray.setContextMenu(contextMenu);

      // 点击托盘图标显示/隐藏窗口
      this.tray.on('click', () => {
        if (this.mainWindow) {
          if (this.mainWindow.isVisible()) {
            this.hideMainWindow();
          } else {
            this.showMainWindow();
          }
        }
      });
    });
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  private hideMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  private showStatus(): void {
    const status = this.backendService.isRunning ? '运行中' : '已停止';
    const message = `后端服务状态: ${status}\n端口: ${this.backendService.port}`;

    dialog.showMessageBox({
      type: 'info',
      title: 'SightAI 运行状态',
      message: message,
      buttons: ['确定'],
    });
  }

  private cleanup(): void {
    console.log('Cleaning up...');
    this.isQuiting = true;
    this.stopLibp2pService();
    this.stopBackendService();
    if (this.tray) {
      this.tray.destroy();
    }
    app.quit();
  }
}

// 创建应用实例
new DesktopApp();
