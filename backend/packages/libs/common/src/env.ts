import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';
import { LogLevelSchema } from './logging';

export const env = memoizee(() =>
  createEnv({
    server: {
      LOG_LEVEL: LogLevelSchema.default('debug'),
      NODE_ENV: z.string().default('development'),
    },
    runtimeEnv: process.env,
  }),
);
