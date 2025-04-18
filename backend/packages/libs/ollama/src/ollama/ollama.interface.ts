import { ModelOfOllama } from "@saito/models";
import { Response } from 'express';


export abstract class OllamaService {
  abstract complete(args: ModelOfOllama<'generate_request'>, res: Response): Promise<void>;
  abstract chat(args: ModelOfOllama<'chat_request'>, res: Response): Promise<void>;
  abstract checkStatus(): Promise<boolean>;
  abstract listModelTags(): Promise<ModelOfOllama<'list_model_response'>>;
  abstract showModelInformation(args: ModelOfOllama<'show_model_request'>): Promise<any>;
  abstract showModelVersion(): Promise<ModelOfOllama<'version_response'>>;
  abstract listModels(): Promise<ModelOfOllama<'list_model_response'>>;
  // New endpoints
  abstract generateEmbeddings(args: ModelOfOllama<'embed_request'>): Promise<ModelOfOllama<'embed_response'>>;
  abstract listRunningModels(): Promise<ModelOfOllama<'list_running_models_response'>>;
}
