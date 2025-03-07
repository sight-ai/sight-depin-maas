import { Logger, LogLevel } from '@nestjs/common';
import memoizee from 'memoizee';
import { env } from '../env';
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
  const logLevel = env().LOG_LEVEL;
  Logger.overrideLogger(expandLogLevel(logLevel));
}
