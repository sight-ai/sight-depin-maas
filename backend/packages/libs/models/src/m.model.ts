/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { MinerModel } from './saito-miner';
import { OllamaModelSchema } from './ollama/ollama';
const Models = {
  miner: MinerModel,
  ollama: OllamaModelSchema,
} as const;


export type ModelOfMiner<T extends keyof typeof Models.miner> =
  (typeof Models.miner)[T] extends z.ZodType<infer O> ? O : never;

export type ModelOfOllama<T extends keyof typeof Models.ollama> =
  (typeof Models.ollama)[T] extends z.ZodType<infer O> ? O : never;

export const m = {
  miner: Models.miner,
  ollama: Models.ollama,
};

export const kModel = m;
