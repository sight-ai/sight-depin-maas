import { ModelOfOllama } from "@saito/models";
import { z } from "zod";

export abstract class OllamaService {
  abstract complete(args: ModelOfOllama<'generate_request'>): Promise<ModelOfOllama<'generate_response'>>;
  abstract checkStatus(): Promise<boolean>;
}
