
export class Nothing {
  // This lets us do `Exclude<T, Nothing>`
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private _!: unique symbol;
}
export type ValidRecipeReturnType<State> =
  | State
  | void
  | undefined
  | (State extends undefined ? Nothing : never);

export function filterNotEmpty<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return value !== null && value !== undefined;
}

export async function sleep(timeout: number) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

