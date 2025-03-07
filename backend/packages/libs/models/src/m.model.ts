/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { AppSchema } from './app';

import { OpenAIModel } from './openai/openai.schema';
import { SaitoMemorySchema } from "./db/saito_memory.model";
import { OllamaModel } from "./ollama/ollama.schema";
export { ModelOfOpenAI } from './openai/openai.schema';

const Models = {
  database: {
    saito_memory: SaitoMemorySchema,
  },
  app: AppSchema,
  memory: SaitoMemorySchema
} as const;

export type ModelOfDatabase<
  S extends keyof typeof Models.database,
  T extends keyof (typeof Models.database)[S],
> = (typeof Models.database)[S][T] extends z.ZodType<infer O> ? O : never;


export type ModelOfApp<T extends keyof typeof Models.app> =
  (typeof Models.app)[T] extends z.ZodType<infer O> ? O : never;

export const m = {
  database<
    S extends keyof typeof Models.database,
    T extends keyof (typeof Models.database)[S],
  >(schema: S, table: T) {
    return Models.database[schema][table];
  },
  ollama<T extends keyof typeof OllamaModel>(type: T) {
    return OllamaModel[type]
  },
  openai<T extends keyof typeof OpenAIModel>(type: T) {
    return OpenAIModel[type];
  },
  app<T extends keyof typeof Models.app>(type: T) {
    return Models.app[type];
  },
  memory<T extends keyof typeof Models.memory>(type: T) {
    return Models.memory[type];
  }
};

export const kModel = m;
