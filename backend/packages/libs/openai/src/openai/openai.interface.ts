// import OpenAI from 'ollama';
import OpenAI from 'openpipe/openai';
import { completions } from './components/completions';

export abstract class OpenaiService {
  abstract get api(): OpenAI;
  abstract get completions(): ReturnType<typeof completions>;
  abstract translate(url: string): Promise<string>;
}
