import memoizee from 'memoizee';
import { env } from '../env';

export type SaitoRuntime = {
};
export const createLocalRuntime = memoizee(() => {
  const runtime: SaitoRuntime = {
  };

  return runtime;
});
