import { ZodType } from 'zod';
import { ZodTypeDef } from 'zod';

/**
 * @description parse input with zod parser
 * @param parser
 * @param func
 */
export function withInputParser<I, Y, T extends ZodType<I, ZodTypeDef, Y>, O>(
  parser: T,
  func: (i: I) => Promise<O>,
) {
  return async (i: Y) => {
    const value = parser.parse(i);
    return await func(value);
  };
}
