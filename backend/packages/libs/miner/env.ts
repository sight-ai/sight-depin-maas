import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      OPENAI_API_KEY: z.string(),
      OPENAI_ORGANIZATION: z.string().optional(),
      OPENPIPE_API_KEY: z.string(),

      ETH_RPC_URL:z.string(),
      PRIVATE_KEY: z.string(),
      CHAIN_ID: z.string(),
      VERIFICATION_CONTRACT_ADDRESS: z.string(),
      WALLET_ADDRESS: z.string(),
      REQUESTER_ADDRESS: z.string()
    },
    runtimeEnv: process.env,
  }),
);
