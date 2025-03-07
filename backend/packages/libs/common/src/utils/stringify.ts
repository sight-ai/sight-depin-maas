/* eslint-disable @typescript-eslint/no-explicit-any */
import safeJsonStringify from 'safe-json-stringify';

export type ReplacerFn = (key: any, value: any) => any;

export function bigintReplacer(replacer?: ReplacerFn | null): ReplacerFn {
  return (key, value) => {
    //if it's a BigInt, return the string value instead
    if (typeof value === 'bigint') return value.toString();
    if (replacer != null) return replacer(key, value);
    return value;
  };
}

export function stringify(
  obj: any,
  replacer?: ReplacerFn | null,
  indent?: number,
) {
  return safeJsonStringify(obj, bigintReplacer(replacer), indent);
}
