import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      GPU_BRAND: z.string().default('unknown'),
      DEVICE_TYPE: z.string().default('unknown'),
      GPU_MODEL: z.string().default('unknown'),
      REWARD_ADDRESS: z.string().default('unknown')
    },
    runtimeEnv: process.env,
  }),
);
