import { z } from 'zod';

export const LogLevelSchema = z.preprocess(text => {
  if (text == null) return 'debug';
  if (text === 'verbose') return 'trace';
  if (text === 'log') return 'info';
  return text;
}, z.enum(['info', 'warn', 'error', 'debug', 'trace']));
export type ZLogLevel = z.infer<typeof LogLevelSchema>;
