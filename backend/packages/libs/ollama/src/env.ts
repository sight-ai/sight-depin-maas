import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      OPENAI_API_KEY: z.string(),
      OPENAI_ORGANIZATION: z.string().optional(),
      OPENPIPE_API_KEY: z.string(),
      OLLAMA_API_URL: z.string(),
      OLLAMA_MODEL: z.string()
    },
    runtimeEnv: process.env,
  }),
);
