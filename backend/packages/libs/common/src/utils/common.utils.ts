


export function filterNotEmpty<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return value !== null && value !== undefined;
}

export async function sleep(timeout: number) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

