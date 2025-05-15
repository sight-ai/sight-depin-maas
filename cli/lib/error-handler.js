/**
 * 错误处理模块 - 处理错误和异常
 */
const fs = require('fs');
const path = require('path');
const { CONFIG, ErrorCodes } = require('./config');
const { logError } = require('./logger');

// 矿工错误类
class MinerError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MinerError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// 处理错误
const handleError = (error) => {
  if (error instanceof MinerError) {
    logError(`[${error.code}] ${error.message}`);
    if (Object.keys(error.details).length > 0) {
      logError('Details:');
      Object.entries(error.details).forEach(([key, value]) => {
        logError(`  ${key}: ${value}`);
      });
    }
  } else {
    logError(`Unexpected error: ${error.message}`);
    if (error.stack) {
      logError('Stack trace:');
      logError(error.stack);
    }
  }

  // 记录到文件
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      details: error.details || {}
    }
  };

  fs.appendFileSync(
    path.join(CONFIG.paths.log, 'error.log'),
    JSON.stringify(errorLog, null, 2) + '\n'
  );

  return false;
};

module.exports = {
  MinerError,
  ErrorCodes,
  handleError
};
