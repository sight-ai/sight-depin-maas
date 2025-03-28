import memoizee from 'memoizee';
import OpenAI from "openpipe/openai";
import { env } from '../env';

export type SaitoRuntime = {
};
export const createLocalRuntime = memoizee(() => {
  const runtime: SaitoRuntime = {
  };

  return runtime;
});
