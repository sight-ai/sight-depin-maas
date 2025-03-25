import { createEnv } from '@t3-oss/env-core';
import memoizee from 'memoizee';
import { z } from 'zod';

export const env = memoizee(() =>
  createEnv({
    server: {
      GATEWAY_API_URL: z.string(),
      GATEWAY_API_KEY: z.string().optional(),
      NODE_CODE: z.string(),
      OLLAMA_DEVICE_ID: z.string(),
      OLLAMA_DEVICE_NAME: z.string(),
      GPU_BRAND: z.string(),
      DEVICE_TYPE: z.string(),
      GPU_MODEL: z.string()
    },
    runtimeEnv: process.env,
  }),
);
