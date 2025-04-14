import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      NODE_CODE: z.string().optional(),
      NODE_ENV: z.enum(['development', 'production']).default('development'),
    },
    runtimeEnv: process.env,
  }),
);
