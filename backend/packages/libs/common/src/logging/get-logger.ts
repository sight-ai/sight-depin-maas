import { Logger, LogLevel } from '@nestjs/common';
import memoizee from 'memoizee';
import { ZLogLevel } from './log.model';

export const getLogger = memoizee((name = 'saito') => {
  return new Logger(name, { timestamp: true });
});

export function expandLogLevel(level?: ZLogLevel): LogLevel[] {
  if (level === 'error') return ['error', 'fatal'];
  if (level === 'warn') return ['warn', 'error', 'fatal'];
  if (level === 'info') return ['log', 'warn', 'error', 'fatal'];
  if (level === 'debug') return ['debug', 'log', 'warn', 'error', 'fatal'];
  if (level === 'trace')
    return ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
  return ['debug', 'log', 'warn', 'error', 'fatal'];
}

export function setLogLevelFromEnv() {
  const logLevel = process.env['LOG_LEVEL'] as ZLogLevel;
  
  Logger.overrideLogger(expandLogLevel(logLevel));
}
