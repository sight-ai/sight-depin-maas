import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      PRIVATE_KEY: z.string(),
      WALLET_ADDRESS: z.string(),
    },
    runtimeEnv: process.env,
  }),
);
