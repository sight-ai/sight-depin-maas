import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      GATEWAY_API_URL: z.string(),
      GATEWAY_API_KEY: z.string().optional(),
      NODE_CODE: z.string(),
      NODE_ENV: z.enum(['development', 'production']).default('development'),
    },
    runtimeEnv: process.env,
  }),
);
