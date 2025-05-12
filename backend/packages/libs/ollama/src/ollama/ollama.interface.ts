import {
  OllamaGenerateRequest,
  OllamaChatRequest,
  OllamaModelList,
  OllamaModelInfo,
  OllamaVersionResponse,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaRunningModels,
  OpenAICompletionRequest,
  OpenAIChatCompletionRequest
} from "@saito/models";
import { Response } from 'express';
import { z } from 'zod';
import { BaseModelService } from "./base-model.service";

export abstract class OllamaService extends BaseModelService {
  abstract complete(args: z.infer<typeof OllamaGenerateRequest | typeof OpenAICompletionRequest>, res: Response, pathname?: string): Promise<void>;
  abstract chat(args: z.infer<typeof OllamaChatRequest |typeof OpenAIChatCompletionRequest>, res: Response, pathname?: string): Promise<void>;
  abstract checkStatus(): Promise<boolean>;
  abstract listModelTags(): Promise<z.infer<typeof OllamaModelList>>;
  abstract showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>>;
  abstract showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>>;
  abstract listModels(): Promise<z.infer<typeof OllamaModelList>>;
  abstract generateEmbeddings(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>>;
  abstract listRunningModels(): Promise<z.infer<typeof OllamaRunningModels>>;
}
