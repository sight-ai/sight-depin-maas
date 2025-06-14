import memoizee from 'memoizee';

export type SaitoRuntime = {
};
export const createLocalRuntime = memoizee(() => {
  const runtime: SaitoRuntime = {
  };

  return runtime;
});
