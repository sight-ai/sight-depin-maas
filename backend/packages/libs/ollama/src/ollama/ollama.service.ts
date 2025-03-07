import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';

export class DefaultOllamaService implements OllamaService {

  private readonly logger = new Logger(OllamaService.name);

  // TODO: make it load from env
  private readonly apiUrl = 'http://localhost:11434/api/generate';

  constructor() {}

  async complete(args: ModelOfOllama<'generate_request'>): Promise<ModelOfOllama<'generate_response'>> {
    const response = await got.post(this.apiUrl, {
      json: args,
    }).json();

    const data = m.ollama('generate_response').parse(response)
    return data;
  }
}

const OpenaiServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OpenaiServiceProvider;
