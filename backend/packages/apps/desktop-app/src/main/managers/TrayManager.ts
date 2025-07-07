import { Tray, Menu, nativeImage, dialog } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { LogManager } from './LogManager';

export class TrayManager {
  private tray: Tray | null = null;
  private isDev: boolean;
  private logger: LogManager;

  constructor(logger: LogManager, isDev: boolean = false) {
    this.logger = logger;
    this.isDev = isDev;
  }

  public createTray(
    onShowWindow: () => void,
    onHideWindow: () => void,
    onShowStatus: () => void,
    onExit: () => void
  ): void {
    // 创建托盘图标 - 优先使用 PNG
    let iconPath: string;

    if (this.isDev) {
      // 开发模式：从源代码目录读取
      iconPath = join(__dirname, '../../resources/icon.png');
    } else {
      // 生产模式：从应用资源目录读取
      iconPath = join(process.resourcesPath, 'icon.png');
    }

    this.logger.log(`Tray icon path: ${iconPath}`);
    this.logger.log(`Icon exists: ${existsSync(iconPath)}`);

    let trayIcon: Electron.NativeImage;

    if (existsSync(iconPath)) {
      this.logger.log(`Using icon for tray: ${iconPath}`);
      trayIcon = nativeImage.createFromPath(iconPath);
      
      // 确保图标不为空且有效
      if (trayIcon.isEmpty()) {
        this.logger.log('Icon is empty, creating fallback');
        trayIcon = this.createFallbackIcon();
      } else {
        // 调整图标大小以适应托盘 (macOS 推荐 16x16)
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      }
    } else {
      this.logger.log('No icon file found, using fallback');
      trayIcon = this.createFallbackIcon();
    }

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('SightAI Desktop');

    // Create tray menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Main Window',
        click: onShowWindow,
      },
      {
        label: 'Hide Main Window',
        click: onHideWindow,
      },
      { type: 'separator' },
      {
        label: 'View Status',
        click: onShowStatus,
      },
      { type: 'separator' },
      {
        label: 'Exit Application',
        click: onExit,
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  public showStatus(backendStatus: { isRunning: boolean; port: number }): void {
    const status = backendStatus.isRunning ? 'Running' : 'Stopped';
    const message = `Backend Service Status: ${status}\nPort: ${backendStatus.port}`;

    dialog.showMessageBox({
      type: 'info',
      title: 'SightAI Status',
      message: message,
      buttons: ['OK'],
    });
  }

  private createFallbackIcon(): Electron.NativeImage {
    try {
      // 创建一个简单的彩色图标作为后备
      const canvas = require('canvas');
      const canvasInstance = canvas.createCanvas(16, 16);
      const ctx = canvasInstance.getContext('2d');

      // 绘制一个简单的蓝色圆形图标
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, 2 * Math.PI);
      ctx.fill();

      return nativeImage.createFromDataURL(canvasInstance.toDataURL());
    } catch (error) {
      this.logger.log(`Failed to create fallback icon: ${error}`, 'ERROR');
      // 如果canvas也失败了，返回空图标
      return nativeImage.createEmpty();
    }
  }
}
