import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      ETH_RPC_URL: z.string().min(1),
      ETHSTORAGE_RPC_URL: z.string(),
      PRIVATE_KEY: z.string(),
      FLAT_DIR_ADDRESS: z.string()
    },
    runtimeEnv: process.env,
  }),
);
