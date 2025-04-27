import { z } from 'zod';
import { OpenAI } from '@saito/models';

// Export types from Zod schemas
export type BaseModelParams = z.infer<typeof OpenAI.BaseModelParams>;
export type ChatParams = z.infer<typeof OpenAI.ChatParams>;
export type CompletionParams = z.infer<typeof OpenAI.CompletionParams>;
export type EmbeddingParams = z.infer<typeof OpenAI.EmbeddingParams>;
export type OpenAIChatResponse = z.infer<typeof OpenAI.OpenAIChatResponse>;
export type OpenAICompletionResponse = z.infer<typeof OpenAI.OpenAICompletionResponse>;
export type OpenAIEmbeddingResponse = z.infer<typeof OpenAI.OpenAIEmbeddingResponse>;