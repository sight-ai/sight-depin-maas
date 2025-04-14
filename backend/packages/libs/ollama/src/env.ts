import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      OLLAMA_API_URL: z.string().default('http://localhost:11434'),
      OLLAMA_MODEL: z.string().default('deepscaler')
    },
    runtimeEnv: process.env,
  }),
);
