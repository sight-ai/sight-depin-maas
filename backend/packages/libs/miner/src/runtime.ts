import memoizee from 'memoizee';
import OpenAI from "openpipe/openai";
import { env } from '../env';

export type SaitoRuntime = {
  client: OpenAI;
};
export const createLocalRuntime = memoizee(() => {
  const runtime: SaitoRuntime = {
    client: new OpenAI({
      apiKey: env().OPENAI_API_KEY,
      organization: env().OPENAI_ORGANIZATION,
      openpipe: {
        apiKey: env().OPENPIPE_API_KEY
      }
    }),
  };

  return runtime;
});
