/**
 * 日志模块 - 处理日志记录功能
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { CONFIG } = require('./config');

// 确保所需目录存在
Object.values(CONFIG.paths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 日志文件配置
const LOG_FILE = path.join(CONFIG.paths.log, 'sight-miner.log');

// 日志级别
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

class Logger {
  constructor(options = {}) {
    this.options = {
      logFile: LOG_FILE,
      errorFile: path.join(CONFIG.paths.log, 'error.log'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...options
    };

    this.initializeLogFiles();
  }

  initializeLogFiles() {
    // 确保日志目录存在
    const logDir = path.dirname(this.options.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 如果需要，轮换日志
    this.rotateLogs();
  }

  rotateLogs() {
    const rotateFile = (filePath) => {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size >= this.options.maxFileSize) {
          // 轮换现有文件
          for (let i = this.options.maxFiles - 1; i > 0; i--) {
            const oldFile = `${filePath}.${i}`;
            const newFile = `${filePath}.${i + 1}`;
            if (fs.existsSync(oldFile)) {
              fs.renameSync(oldFile, newFile);
            }
          }
          // 将当前文件移动到 .1
          fs.renameSync(filePath, `${filePath}.1`);
        }
      }
    };

    rotateFile(this.options.logFile);
    rotateFile(this.options.errorFile);
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    return `${timestamp} [${level}] ${message}\n`;
  }

  writeToFile(file, message) {
    try {
      fs.appendFileSync(file, message);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  log(level, message) {
    const formattedMessage = this.formatMessage(level, message);

    // 带颜色的控制台输出
    switch (level) {
      case LogLevel.DEBUG:
        console.log(chalk.gray(formattedMessage));
        break;
      case LogLevel.INFO:
        console.log(chalk.blue(formattedMessage));
        break;
      case LogLevel.SUCCESS:
        console.log(chalk.green(formattedMessage));
        break;
      case LogLevel.WARNING:
        console.log(chalk.yellow(formattedMessage));
        break;
      case LogLevel.ERROR:
        console.error(chalk.red(formattedMessage));
        break;
    }

    // 写入日志文件
    this.writeToFile(this.options.logFile, formattedMessage);

    // 将错误写入单独的错误日志
    if (level === LogLevel.ERROR) {
      this.writeToFile(this.options.errorFile, formattedMessage);
    }
  }

  debug(message) {
    this.log(LogLevel.DEBUG, message);
  }

  info(message) {
    this.log(LogLevel.INFO, message);
  }

  success(message) {
    this.log(LogLevel.SUCCESS, message);
  }

  warning(message) {
    this.log(LogLevel.WARNING, message);
  }

  error(message) {
    this.log(LogLevel.ERROR, message);
    return false;
  }
}

// 创建日志记录器实例
const logger = new Logger();

// 导出日志函数
module.exports = {
  logger,
  logInfo: (message) => logger.info(message),
  logSuccess: (message) => logger.success(message),
  logWarning: (message) => logger.warning(message),
  logError: (message) => logger.error(message),
  LogLevel
};
