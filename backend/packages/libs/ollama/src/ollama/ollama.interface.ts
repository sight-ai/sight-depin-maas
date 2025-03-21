import { ModelOfOllama } from "@saito/models";
import { Response } from 'express';


export abstract class OllamaService {
  abstract complete(args: ModelOfOllama<'generate_request'>, res: Response): Promise<void>;
  abstract chat(args: ModelOfOllama<'chat_request'>, res: Response): Promise<void>;
  abstract checkStatus(): Promise<boolean>;
  abstract listModel(): Promise<any>;
}
