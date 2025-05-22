import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  data?: any;
}

export class LogManager {
  private logDir: string;
  private maxLogFiles = 10;
  private maxLogSize = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.logDir = path.join(os.homedir(), '.sightai', 'logs');
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // 获取日志文件路径
  private getLogFilePath(type: 'cli' | 'backend' | 'system'): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${type}-${date}.log`);
  }

  // 写入日志
  public writeLog(type: 'cli' | 'backend' | 'system', level: LogEntry['level'], message: string, source?: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      data
    };

    const logLine = this.formatLogEntry(logEntry);
    const logFile = this.getLogFilePath(type);

    try {
      fs.appendFileSync(logFile, logLine + '\n');
      this.rotateLogIfNeeded(logFile);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // 格式化日志条目
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const source = entry.source ? `[${entry.source}]` : '';
    const data = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';

    return `${timestamp} ${level} ${source} ${entry.message}${data}`;
  }

  // 读取日志文件
  public readLogs(type: 'cli' | 'backend' | 'system', lines: number = 100): LogEntry[] {
    const logFile = this.getLogFilePath(type);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const logLines = content.trim().split('\n').filter(line => line.trim());

      // 获取最后 N 行
      const recentLines = logLines.slice(-lines);

      return recentLines.map(line => this.parseLogEntry(line)).filter(entry => entry !== null) as LogEntry[];
    } catch (error) {
      console.error('Failed to read log:', error);
      return [];
    }
  }

  // 解析日志条目
  private parseLogEntry(line: string): LogEntry | null {
    try {
      const regex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(\w+)\s*(\[.*?\])?\s*(.*?)(\s*\|\s*\{.*\})?$/;
      const match = line.match(regex);

      if (!match) return null;

      const [, timestamp, level, source, message, dataStr] = match;

      return {
        timestamp,
        level: level.toLowerCase() as LogEntry['level'],
        message: message.trim(),
        source: source ? source.slice(1, -1) : undefined,
        data: dataStr ? JSON.parse(dataStr.substring(3)) : undefined
      };
    } catch (error) {
      return null;
    }
  }

  // 获取所有日志文件
  public getLogFiles(): { type: string; files: string[] } {
    const files = fs.readdirSync(this.logDir);
    const logFiles = files.filter(file => file.endsWith('.log'));

    const grouped = {
      cli: logFiles.filter(f => f.startsWith('cli-')),
      backend: logFiles.filter(f => f.startsWith('backend-')),
      system: logFiles.filter(f => f.startsWith('system-'))
    };

    return {
      type: 'all',
      files: Object.entries(grouped).map(([type, files]) => `${type}: ${files.length} files`)
    };
  }

  // 清理旧日志
  public cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));

      // 按修改时间排序
      const sortedFiles = logFiles.map(file => ({
        name: file,
        path: path.join(this.logDir, file),
        mtime: fs.statSync(path.join(this.logDir, file)).mtime
      })).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 删除超过限制的文件
      if (sortedFiles.length > this.maxLogFiles) {
        const filesToDelete = sortedFiles.slice(this.maxLogFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }

  // 日志轮转
  private rotateLogIfNeeded(logFile: string): void {
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
        fs.renameSync(logFile, rotatedFile);
      }
    } catch (error) {
      // 忽略错误，继续写入
    }
  }

  // 格式化日志显示
  public formatLogForDisplay(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toLocaleString('zh-CN');
    const levelColor = this.getLevelColor(entry.level);
    const level = levelColor(entry.level.toUpperCase().padEnd(5));
    const source = entry.source ? chalk.gray(`[${entry.source}]`) : '';

    return `${chalk.gray(time)} ${level} ${source} ${entry.message}`;
  }

  // 获取日志级别颜色
  private getLevelColor(level: LogEntry['level']): (text: string) => string {
    switch (level) {
      case 'error':
        return chalk.red;
      case 'warn':
        return chalk.yellow;
      case 'info':
        return chalk.blue;
      case 'debug':
        return chalk.gray;
      default:
        return chalk.white;
    }
  }

  // 获取日志统计
  public getLogStats(type: 'cli' | 'backend' | 'system'): { total: number; errors: number; warnings: number; today: number } {
    const logs = this.readLogs(type, 1000);
    const today = new Date().toISOString().split('T')[0];

    return {
      total: logs.length,
      errors: logs.filter(log => log.level === 'error').length,
      warnings: logs.filter(log => log.level === 'warn').length,
      today: logs.filter(log => log.timestamp.startsWith(today)).length
    };
  }

  // 搜索日志
  public searchLogs(type: 'cli' | 'backend' | 'system', query: string, lines: number = 100): LogEntry[] {
    const logs = this.readLogs(type, lines);
    const lowerQuery = query.toLowerCase();

    return logs.filter(log =>
      log.message.toLowerCase().includes(lowerQuery) ||
      (log.source && log.source.toLowerCase().includes(lowerQuery))
    );
  }
}

export const logManager = new LogManager();
