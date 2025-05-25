import { Injectable, LoggerService, ConsoleLogger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class FileLoggerService extends ConsoleLogger implements LoggerService {
  private logDir: string;
  private logFile: string;

  constructor() {
    super('SightAI');

    // 在 Docker 环境中，优先使用 SIGHTAI_DATA_DIR 环境变量
    const dataDir = process.env['SIGHTAI_DATA_DIR'];

    if (dataDir) {
      // Docker 环境：使用数据卷目录
      this.logDir = path.join(dataDir, 'logs');
    } else {
      // 本地环境：使用用户主目录
      this.logDir = path.join(os.homedir(), '.sightai', 'logs');
    }

    this.ensureLogDir();
    this.logFile = this.getLogFilePath();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `backend-${date}.log`);
  }

  private writeToFile(level: string, message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const logLine = `${timestamp} ${level.toUpperCase().padEnd(5)} ${contextStr} ${message}`;

    try {
      fs.appendFileSync(this.logFile, logLine + '\n');
    } catch (error) {
      // 如果写入失败，至少在控制台显示
      console.error('Failed to write to log file:', error);
    }
  }

  log(message: any, context?: string): void {
    super.log(message, context);
    this.writeToFile('info', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    super.error(message, trace, context);
    const errorMessage = trace ? `${message}\n${trace}` : message;
    this.writeToFile('error', errorMessage, context);
  }

  warn(message: any, context?: string): void {
    super.warn(message, context);
    this.writeToFile('warn', message, context);
  }

  debug(message: any, context?: string): void {
    super.debug(message, context);
    this.writeToFile('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    super.verbose(message, context);
    this.writeToFile('verbose', message, context);
  }
}
