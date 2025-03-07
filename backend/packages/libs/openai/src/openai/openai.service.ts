// import OpenAI from 'ollama';
import OpenAI from 'openpipe/openai';
import { env } from '../env';
import { completions } from './components/completions';
import { OpenaiService } from './openai.interface';
import { translateTelegramVoice } from './translation';

export class DefaultOpenaiService implements OpenaiService {
  public readonly api = new OpenAI({
    apiKey: env().OPENAI_API_KEY,
    organization: env().OPENAI_ORGANIZATION,
    openpipe: {
      apiKey: env().OPENPIPE_API_KEY,
    },
  });

  constructor() {}

  get completions() {
    return completions(this.api);
  }

  async translate(url: string) {
    return translateTelegramVoice(this.api, url);
  }
}

const OpenaiServiceProvider = {
  provide: OpenaiService,
  useClass: DefaultOpenaiService,
};

export default OpenaiServiceProvider;
