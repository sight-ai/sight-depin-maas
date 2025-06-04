import { Response } from 'express';
import { z } from 'zod';
import {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OllamaModelList,
  OllamaModelInfo,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaRunningModels,
  OllamaVersionResponse,
  OpenAICompletionRequest,
  OpenAIChatCompletionRequest
} from '@saito/models';
import { BaseModelService } from './base-model.service';

/**
 * Interface for Ollama service
 */
export abstract class OllamaService extends BaseModelService {
  abstract complete(args: z.infer<typeof OllamaGenerateRequest | typeof OpenAICompletionRequest>, res: Response, pathname?: string): Promise<void>;
  abstract chat(args: z.infer<typeof OllamaChatRequest | typeof OpenAIChatCompletionRequest>, res: Response, pathname?: string): Promise<void>;
  abstract checkStatus(): Promise<boolean>;
  abstract listModelTags(): Promise<z.infer<typeof OllamaModelList>>;
  abstract showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>>;
  abstract showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>>;
  abstract listModels(): Promise<z.infer<typeof OllamaModelList>>;
  abstract generateEmbeddings(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>>;
  abstract listRunningModels(): Promise<z.infer<typeof OllamaRunningModels>>;
  abstract listModelOpenai(): Promise<z.infer<typeof OllamaModelList>>;
  abstract showModelVersionOpenai(): Promise<z.infer<typeof OllamaVersionResponse>>;
  abstract showModelInformationOpenai(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>>;
  abstract generateEmbeddingsOpenai(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>>;
}
