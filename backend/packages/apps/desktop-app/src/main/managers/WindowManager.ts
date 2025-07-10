import { BrowserWindow, shell, Menu, MenuItemConstructorOptions } from 'electron';
import { join } from 'path';
import { LogManager } from './LogManager';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private isDev: boolean;
  private logger: LogManager;

  constructor(logger: LogManager, isDev: boolean = false) {
    this.logger = logger;
    this.isDev = isDev;
  }

  public createWindow(): BrowserWindow {
    this.logger.log('Creating main window...');
    const preloadPath = join(__dirname, 'preload.js');
    this.logger.log(`Preload script path: ${preloadPath}`);

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        enableBlinkFeatures: 'ClipboardAPI',
        webSecurity: true,
        spellcheck: true,
        allowRunningInsecureContent: false,
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      titleBarOverlay: process.platform !== 'darwin' ? {
        color: '#ffffff',
        symbolColor: '#000000',
        height: 32
      } : undefined,
      backgroundColor: '#ffffff',
      show: false, // 先不显示，等加载完成后再显示
      // 添加窗口拖动支持
      frame: process.platform === 'darwin', // macOS 保持框架，Windows/Linux 使用无框架
      movable: true, // 允许窗口移动
      resizable: true, // 允许窗口调整大小
    });

    this.logger.log('BrowserWindow created');

    // 加载应用
    if (this.isDev) {
      this.logger.log('Loading development URL...');
      // 添加错误处理和重试逻辑
      this.mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
        this.logger.log(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
        if (validatedURL.includes('localhost:4200') && this.mainWindow) {
          this.logger.log('Retrying in 2 seconds...');
          setTimeout(() => {
            if (this.mainWindow) {
              this.mainWindow.loadURL('http://localhost:4200');
            }
          }, 2000);
        }
      });

      this.mainWindow.loadURL('http://localhost:4200');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.logger.log('Loading production HTML file...');
      this.mainWindow.loadFile(join(__dirname, '../index.html'));
    }

    // 窗口加载完成后显示
    this.mainWindow.once('ready-to-show', () => {
      this.logger.log('Window is ready to show');
      this.mainWindow?.show();
    });

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.setupMenu();
    return this.mainWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public showMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  public hideMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  public isWindowVisible(): boolean {
    return this.mainWindow ? this.mainWindow.isVisible() : false;
  }

  public isWindowFocused(): boolean {
    return this.mainWindow ? this.mainWindow.isFocused() : false;
  }

  public setCloseToTray(callback: () => void): void {
    if (this.mainWindow) {
      this.mainWindow.on('close', (event) => {
        event.preventDefault();
        callback();
      });
    }
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
            click: () => {
              // 这里需要通过回调通知主应用退出
              if (this.mainWindow) {
                this.mainWindow.webContents.send('app-quit-requested');
              }
            },
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

  private showLogs(): void {
    // 打开日志文件所在的目录
    const logFile = this.logger.getLogFile();
    const logDir = join(logFile, '..');
    shell.openPath(logDir).catch((error) => {
      this.logger.log(`Failed to open log directory: ${error}`, 'ERROR');
    });
  }
}
