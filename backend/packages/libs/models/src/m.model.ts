/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { MinerModel } from './saito-miner';
import { OllamaModelSchema } from './ollama/ollama';
import { OpenAIModelSchema } from './openai/openai';
const Models = {
  miner: MinerModel,
  ollama: OllamaModelSchema,
  openai: OpenAIModelSchema,
} as const;


export type ModelOfMiner<T extends keyof typeof Models.miner> =
  (typeof Models.miner)[T] extends z.ZodType<infer O> ? O : never;

export type ModelOfOllama<T extends keyof typeof Models.ollama> =
  (typeof Models.ollama)[T] extends z.ZodType<infer O> ? O : never;

export type ModelOfOpenAI<T extends keyof typeof Models.openai> =
  (typeof Models.openai)[T] extends z.ZodType<infer O> ? O : never;

export const m = {
  miner: Models.miner,
  ollama: Models.ollama,
  openai: Models.openai,
};

export const kModel = m;
