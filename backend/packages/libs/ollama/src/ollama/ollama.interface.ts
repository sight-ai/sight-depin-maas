import { ModelOfOllama } from "@saito/models";

export abstract class OllamaService {
  abstract complete(args: ModelOfOllama<'generate_request'>): Promise<ModelOfOllama<'generate_response'>>;
}
