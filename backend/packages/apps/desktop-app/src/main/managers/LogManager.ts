import { app } from 'electron';
import { join } from 'path';
import { existsSync, appendFileSync, mkdirSync, readFileSync } from 'fs';
import { homedir } from 'os';

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

  public async getLogs(options?: {
    lines?: number;
    level?: 'error' | 'warn' | 'info' | 'debug';
    service?: 'backend' | 'libp2p' | 'all';
  }): Promise<string[]> {
    const logs: string[] = [];
    const maxLines = options?.lines || 100;
    const levelFilter = options?.level?.toUpperCase();
    const serviceFilter = options?.service || 'all';

    try {
      // 读取应用日志
      if (serviceFilter === 'all' || serviceFilter === 'backend') {
        if (existsSync(this.logFile)) {
          const content = readFileSync(this.logFile, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());

          let filteredLines = lines;
          if (levelFilter) {
            filteredLines = lines.filter(line => line.includes(`[${levelFilter}]`));
          }

          logs.push(...filteredLines.slice(-maxLines));
        }
      }

      // 读取backend服务日志
      if (serviceFilter === 'all' || serviceFilter === 'backend') {
        const backendLogPath = join(homedir(), '.sightai', 'logs', 'backend.log');
        if (existsSync(backendLogPath)) {
          const content = readFileSync(backendLogPath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());

          let filteredLines = lines;
          if (levelFilter) {
            filteredLines = lines.filter(line => line.toLowerCase().includes(levelFilter.toLowerCase()));
          }

          logs.push(...filteredLines.slice(-maxLines));
        }
      }

      // 读取libp2p服务日志
      if (serviceFilter === 'all' || serviceFilter === 'libp2p') {
        const libp2pLogPath = join(homedir(), '.sightai', 'logs', 'libp2p.log');
        if (existsSync(libp2pLogPath)) {
          const content = readFileSync(libp2pLogPath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());

          let filteredLines = lines;
          if (levelFilter) {
            filteredLines = lines.filter(line => line.toLowerCase().includes(levelFilter.toLowerCase()));
          }

          logs.push(...filteredLines.slice(-maxLines));
        }
      }

      return logs.slice(-maxLines);
    } catch (error) {
      this.log(`Failed to read logs: ${error}`, 'ERROR');
      return [`Error reading logs: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  }
}
