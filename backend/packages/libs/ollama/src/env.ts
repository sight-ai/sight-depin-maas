import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      OPENAI_API_KEY: z.string(),
      OPENAI_ORGANIZATION: z.string().optional(),
      OPENPIPE_API_KEY: z.string()
    },
    runtimeEnv: process.env,
  }),
);
