import { app } from 'electron';
import { join } from 'path';
import { existsSync, appendFileSync, mkdirSync } from 'fs';

export class LogManager {
  private logFile: string = '';

  constructor() {
    this.setupLogging();
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
  }

  public log(message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' = 'INFO'): void {
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

  public getLogFile(): string {
    return this.logFile;
  }
}
