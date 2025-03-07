import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      ETH_RPC_URL: z.string(),
    },
    runtimeEnv: process.env,
  }),
);
