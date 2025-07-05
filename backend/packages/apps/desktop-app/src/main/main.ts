import { app, BrowserWindow, ipcMain, shell, Menu, dialog, MenuItemConstructorOptions, Tray, nativeImage } from 'electron';
import { join } from 'path';
import { existsSync, writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';

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
  private logFile: string = '';

  constructor() {
    this.setupLogging();
    this.setupApp();
    this.setupIPC();
    this.setupTray();
  }

  private setupLogging(): void {
    // 创建日志目录
    const logDir = join(app.getPath('userData'), 'logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    // 设置日志文件路径
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    this.logFile = join(logDir, `sightai-${dateStr}.log`);

    this.log('=== SightAI Desktop Application Started ===');
    this.log(`Version: ${app.getVersion()}`);
    this.log(`Platform: ${process.platform} ${process.arch}`);
    this.log(`Node.js: ${process.version}`);
    this.log(`Electron: ${process.versions.electron}`);
    this.log(`Development mode: ${this.isDev}`);
  }

  private log(message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    // 输出到控制台
    console.log(logMessage);

    // 写入日志文件
    try {
      appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private setupApp(): void {
    // 设置应用程序安全策略
    app.whenReady().then(async () => {
      try {
        this.log('App is ready, starting services...');
        // 先启动后端服务，等待完全启动
        await this.startBackendService();
        this.log('Backend service started, now starting libp2p service...');
        // 然后启动libp2p服务
        await this.startLibp2pService();
        this.log('All services startup completed, creating window...');
        this.createWindow();
        this.log('Window created successfully');

        // 通知渲染进程后端服务已就绪
        this.log('Notifying renderer that backend is ready...');
        this.notifyBackendStatusChange();
        this.log('Backend status notification sent');
      } catch (error) {
        this.log(`Error during app initialization: ${error}`, 'ERROR');
        this.showError('Failed to initialize application: ' + (error as Error).message);
      }

      app.on('activate', () => {
        // On macOS, clicking the dock icon should show the window
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        } else if (this.mainWindow) {
          // Show and focus the existing window
          this.showMainWindow();
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
        // 启用剪贴板访问
        enableBlinkFeatures: 'ClipboardAPI',
        // 允许不安全的内联脚本（如果需要）
        webSecurity: true,
        // 启用原生剪贴板功能
        spellcheck: true,
        // 允许剪贴板读写
        allowRunningInsecureContent: false,
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
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
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
      this.log('LibP2P service is already running');
      return;
    }

    try {
      // 使用新的跨平台LibP2P启动器
      const LibP2PService = this.getLibP2PServiceClass();
      this.libp2pService.instance = new LibP2PService();

      this.log('Starting libp2p service with cross-platform launcher...');

      await this.libp2pService.instance.start({
        libp2pPort: this.libp2pService.port.toString(),
        apiPort: this.backendService.port.toString(),
        bootstrapAddrs: "/ip4/34.84.180.62/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X,/ip4/192.168.0.107/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X,/ip4/192.168.1.2/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X,/ip4/34.84.180.62/tcp/15002/p2p/12D3KooWH3uVF6wv47WnArKHk5p6cvgCJEb74UTmxztmQDc298L3,/ip4/192.168.0.107/tcp/15002/p2p/12D3KooWH3uVF6wv47WnArKHk5p6cvgCJEb74UTmxztmQDc298L3,/ip4/192.168.1.2/tcp/15002/p2p/12D3KooWH3uVF6wv47WnArKHk5p6cvgCJEb74UTmxztmQDc298L3,/ip4/34.84.180.62/tcp/15003/p2p/12D3KooWQYhTNQdmr3ArTeUHRYzFg94BKyTkoWBDWez9kSCVe2Xo,/ip4/192.168.0.107/tcp/15003/p2p/12D3KooWQYhTNQdmr3ArTeUHRYzFg94BKyTkoWBDWez9kSCVe2Xo,/ip4/192.168.1.2/tcp/15003/p2p/12D3KooWQYhTNQdmr3ArTeUHRYzFg94BKyTkoWBDWez9kSCVe2Xo,/ip4/34.84.180.62/tcp/15004/p2p/12D3KooWLJtG8fd2hkQzTn96MrLvThmnNQjTUFZwGEsLRz5EmSzc,/ip4/192.168.0.107/tcp/15004/p2p/12D3KooWLJtG8fd2hkQzTn96MrLvThmnNQjTUFZwGEsLRz5EmSzc,/ip4/192.168.1.2/tcp/15004/p2p/12D3KooWLJtG8fd2hkQzTn96MrLvThmnNQjTUFZwGEsLRz5EmSzc,/ip4/34.84.180.62/tcp/15005/p2p/12D3KooWSHj3RRbBjD15g6wekV8y3mm57Pobmps2g2WJm6F67Lay,/ip4/192.168.0.107/tcp/15005/p2p/12D3KooWSHj3RRbBjD15g6wekV8y3mm57Pobmps2g2WJm6F67Lay,/ip4/192.168.1.2/tcp/15005/p2p/12D3KooWSHj3RRbBjD15g6wekV8y3mm57Pobmps2g2WJm6F67Lay,/ip4/34.84.180.62/tcp/15006/p2p/12D3KooWDMCQbZZvLgHiHntG1KwcHoqHPAxL37KvhgibWqFtpqUY,/ip4/192.168.0.107/tcp/15006/p2p/12D3KooWDMCQbZZvLgHiHntG1KwcHoqHPAxL37KvhgibWqFtpqUY,/ip4/192.168.1.2/tcp/15006/p2p/12D3KooWDMCQbZZvLgHiHntG1KwcHoqHPAxL37KvhgibWqFtpqUY,/ip4/34.84.180.62/tcp/15007/p2p/12D3KooWLnZUpcaBwbz9uD1XsyyHnbXUrJRmxnsMiRnuCmvPix67,/ip4/192.168.0.107/tcp/15007/p2p/12D3KooWLnZUpcaBwbz9uD1XsyyHnbXUrJRmxnsMiRnuCmvPix67,/ip4/192.168.1.2/tcp/15007/p2p/12D3KooWLnZUpcaBwbz9uD1XsyyHnbXUrJRmxnsMiRnuCmvPix67,/ip4/34.84.180.62/tcp/15008/p2p/12D3KooWQ8vrERR8bnPByEjjtqV6hTWehaf8TmK7qR1cUsyrPpfZ,/ip4/192.168.0.107/tcp/15008/p2p/12D3KooWQ8vrERR8bnPByEjjtqV6hTWehaf8TmK7qR1cUsyrPpfZ,/ip4/192.168.1.2/tcp/15008/p2p/12D3KooWQ8vrERR8bnPByEjjtqV6hTWehaf8TmK7qR1cUsyrPpfZ",
      });

      this.libp2pService.isRunning = true;
      this.log('LibP2P service started successfully');

    } catch (error) {
      this.log(`Failed to start libp2p service: ${error}`, 'ERROR');
      this.showError('Failed to start libp2p service: ' + (error as Error).message);
      this.libp2pService.isRunning = false;
      this.libp2pService.instance = null;
    }
  }

  private async startBackendService(): Promise<void> {
    if (this.backendService.isRunning) {
      this.log('Backend service is already running');
      return;
    }

    try {
      const backendPath = this.getBackendPath();
      if (!existsSync(backendPath)) {
        this.log(`Backend service not found: ${backendPath}`, 'ERROR');
        this.showError('Backend service not found. Please ensure the application is properly built.');
        return;
      }

      this.log(`Starting backend service: ${backendPath}`);
      if (!this.isDev) {
        this.log('Running in production mode');
      }

      // 设置环境变量
      process.env['PORT'] = this.backendService.port.toString();

      // 使用 eval 来避免 webpack 的静态分析
      this.backendService.instance = eval('require')(backendPath);

      // 等待后端服务完全启动
      await this.waitForBackendReady();

      this.backendService.isRunning = true;
      this.log('Backend service started successfully and is ready');

      // 通知渲染进程后端服务状态变化
      this.notifyBackendStatusChange();

    } catch (error) {
      this.log(`Failed to start backend service: ${error}`, 'ERROR');
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

  private getLibP2PServiceClass(): any {
    // 直接使用内嵌的跨平台启动器
    return this.createLibP2PServiceClass();
  }

  private createLibP2PServiceClass(): any {
    const os = require('os');
    const path = require('path');
    const { spawn } = require('child_process');
    const { existsSync } = require('fs');
    const { app } = require('electron');

    // 捕获外部作用域的变量
    const isDev = this.isDev;
    const getResourcesPath = () => {
      if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app');
      } else {
        const projectRoot = path.join(__dirname, '../../../../..');
        return path.join(projectRoot, 'packages/apps/desktop-app/resources');
      }
    };

    class LibP2PService {
      private process: any = null;
      private isRunning = false;

      getBinaryPath(): string {
        const platform = os.platform();
        const arch = os.arch();

        // Architecture mapping
        const archMap: { [key: string]: string } = {
          'x64': 'amd64',
          'arm64': 'arm64',
          'ia32': '386'
        };

        // Platform mapping
        const platformMap: { [key: string]: string } = {
          'darwin': 'darwin',
          'linux': 'linux',
          'win32': 'windows'
        };

        const goPlatform = platformMap[platform] || platform;
        const goArch = archMap[arch] || arch;
        const ext = platform === 'win32' ? '.exe' : '';
        const binaryName = `sight-libp2p-node-${goPlatform}-${goArch}${ext}`;

        if (isDev) {
          return path.join(process.cwd(), 'packages/apps/desktop-app/resources/libp2p-binaries', binaryName);
        } else {
          const resourcesPath = getResourcesPath();
          return path.join(resourcesPath, 'libp2p-binaries', binaryName);
        }
      }

      async start(config: any): Promise<void> {
        if (this.isRunning) {
          console.log('LibP2P service is already running');
          return;
        }

        const binaryPath = this.getBinaryPath();
        console.log('Starting LibP2P service with binary:', binaryPath);

        if (!existsSync(binaryPath)) {
          throw new Error(`LibP2P binary not found at: ${binaryPath}`);
        }

        const args = [
          '-libp2p-port', config.libp2pPort,
          '-api-port', config.apiPort,
          '-node-port', '15050',
          '-is-gateway', '0',
          '-bootstrap-addrs', config.bootstrapAddrs,
        ];

        console.log('LibP2P service args:', args);

        this.process = spawn(binaryPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          detached: false
        });

        this.process.stdout?.on('data', (data: Buffer) => {
          console.log(`[LibP2P] ${data.toString().trim()}`);
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          console.error(`[LibP2P Error] ${data.toString().trim()}`);
        });

        this.process.on('close', (code: number) => {
          console.log(`LibP2P service exited with code ${code}`);
          this.isRunning = false;
          this.process = null;
        });

        this.process.on('error', (error: Error) => {
          console.error('LibP2P service error:', error);
          this.isRunning = false;
          this.process = null;
        });

        this.isRunning = true;
        console.log('LibP2P service started successfully');
      }

      async stop(): Promise<void> {
        if (!this.isRunning || !this.process) {
          console.log('LibP2P service is not running');
          return;
        }

        console.log('Stopping LibP2P service...');
        this.process.kill('SIGTERM');

        // 等待进程结束
        await new Promise<void>((resolve) => {
          if (!this.process) {
            resolve();
            return;
          }

          const timeout = setTimeout(() => {
            if (this.process) {
              console.log('Force killing LibP2P service...');
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);

          this.process.on('close', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        this.isRunning = false;
        this.process = null;
        console.log('LibP2P service stopped');
      }

      isServiceRunning(): boolean {
        return this.isRunning;
      }
    }

    return LibP2PService;
  }

  private getDataDir(): string {
    const { app } = require('electron');
    return join(app.getPath('userData'), 'sightai-data');
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

  private async stopLibp2pService(): Promise<void> {
    if (this.libp2pService.instance && this.libp2pService.isRunning) {
      console.log('Stopping libp2p service...');

      try {
        await this.libp2pService.instance.stop();
      } catch (error) {
        console.error('Error stopping libp2p service:', error);
      }

      this.libp2pService.isRunning = false;
      this.libp2pService.instance = null;
    }
  }

  private async restartBackendService(): Promise<void> {
    console.log('Restarting all services...');
    await this.stopLibp2pService();
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
    // 打开日志文件所在的目录
    const logDir = join(app.getPath('userData'), 'logs');
    shell.openPath(logDir).catch((error) => {
      this.log(`Failed to open log directory: ${error}`, 'ERROR');
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Logs',
        message: `Log files are located at: ${logDir}`,
      });
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
        console.error('Failed to read device config:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
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
      // 创建托盘图标 - 优先使用 PNG
      let iconPath: string;

      if (this.isDev) {
        // 开发模式：从源代码目录读取
        iconPath = join(__dirname, '../../resources/icon.png');
      } else {
        // 生产模式：从应用资源目录读取
        iconPath = join(process.resourcesPath, 'icon.png');
      }

      console.log('Tray icon path:', iconPath);
      console.log('Icon exists:', existsSync(iconPath));

      let trayIcon: Electron.NativeImage;

      if (existsSync(iconPath)) {
        console.log('Using icon for tray:', iconPath);
        trayIcon = nativeImage.createFromPath(iconPath);
        // 确保图标不为空且有效
        if (trayIcon.isEmpty()) {
          console.log('Icon is empty, creating fallback');
          // 创建一个简单的彩色图标作为后备
          const canvas = require('canvas');
          const canvasInstance = canvas.createCanvas(16, 16);
          const ctx = canvasInstance.getContext('2d');

          // 绘制一个简单的蓝色圆形图标
          ctx.fillStyle = '#3B82F6';
          ctx.beginPath();
          ctx.arc(8, 8, 6, 0, 2 * Math.PI);
          ctx.fill();

          trayIcon = nativeImage.createFromDataURL(canvasInstance.toDataURL());
        } else {
          // 调整图标大小以适应托盘 (macOS 推荐 16x16)
          trayIcon = trayIcon.resize({ width: 16, height: 16 });
        }
      } else {
        console.log('No icon file found, using fallback');
        // 创建一个简单的彩色图标作为后备
        const canvas = require('canvas');
        const canvasInstance = canvas.createCanvas(16, 16);
        const ctx = canvasInstance.getContext('2d');

        // 绘制一个简单的蓝色圆形图标
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(8, 8, 6, 0, 2 * Math.PI);
        ctx.fill();

        trayIcon = nativeImage.createFromDataURL(canvasInstance.toDataURL());
      }

      this.tray = new Tray(trayIcon);
      this.tray.setToolTip('SightAI Desktop');

      // Create tray menu
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Main Window',
          click: () => this.showMainWindow(),
        },
        {
          label: 'Hide Main Window',
          click: () => this.hideMainWindow(),
        },
        { type: 'separator' },
        {
          label: 'View Status',
          click: () => this.showStatus(),
        },
        { type: 'separator' },
        {
          label: 'Exit Application',
          click: () => this.cleanup(),
        },
      ]);

      this.tray.setContextMenu(contextMenu);

      // Click tray icon to show/hide window - add debounce handling
      // let clickTimeout: NodeJS.Timeout | null = null;
      // this.tray.on('click', () => {
      //   // Clear previous click event
      //   if (clickTimeout) {
      //     clearTimeout(clickTimeout);
      //   }

      //   // Delayed execution to avoid repeated triggers
      //   clickTimeout = setTimeout(() => {
      //     if (this.mainWindow) {
      //       if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
      //         this.hideMainWindow();
      //       } else {
      //         this.showMainWindow();
      //       }
      //     }
      //     clickTimeout = null;
      //   }, 100);
      // });
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
    const status = this.backendService.isRunning ? 'Running' : 'Stopped';
    const message = `Backend Service Status: ${status}\nPort: ${this.backendService.port}`;

    dialog.showMessageBox({
      type: 'info',
      title: 'SightAI Status',
      message: message,
      buttons: ['OK'],
    });
  }

  private async cleanup(): Promise<void> {
    console.log('Cleaning up...');
    this.isQuiting = true;
    await this.stopLibp2pService();
    this.stopBackendService();
    if (this.tray) {
      this.tray.destroy();
    }
    app.quit();
  }
}

// Create application instance
new DesktopApp();
