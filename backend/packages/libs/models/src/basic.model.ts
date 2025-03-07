import { z } from 'zod';

export const BufferSchema = z.preprocess((val, ctx) => {
  if (typeof val === 'string') {
    return Buffer.from(
      val.length >= 2 && val[1] === 'x' ? val.slice(2) : val,
      'hex',
    );
  }
  if (val instanceof Buffer) {
    return val;
  }
  ctx.addIssue({
    message: `val is not a buffer: ${val}`,
    code: 'custom',
  });
  return z.NEVER;
}, z.instanceof(Buffer)) as z.ZodType<Buffer, z.ZodTypeDef, Buffer>;
export const BigIntSchema = z.preprocess((val, ctx) => {
  if (typeof val === 'bigint') {
    return val;
  }
  if (typeof val === 'string') {
    if (val.endsWith('n')) {
      return BigInt(val.slice(0, -1));
    }
    return BigInt(val);
  }
  if (typeof val === 'number') {
    return BigInt(val);
  }
  ctx.addIssue({
    message: `val is not a bigint: ${val}`,
    code: 'custom',
  });
  return z.NEVER;
}, z.bigint()) as z.ZodType<bigint, z.ZodTypeDef, bigint>;
export const BigIntStringSchema = z.preprocess((val, ctx) => {
  if (typeof val === 'bigint') {
    return val.toString();
  }
  if (typeof val === 'string') {
    if (val.endsWith('n')) {
      return val.slice(0, -1);
    }
    return val;
  }
  if (typeof val === 'number') {
    return val.toString(10);
  }
  ctx.addIssue({
    message: `val is not a bigint: ${val}`,
    code: 'custom',
  });
  return z.NEVER;
}, z.string()) as z.ZodType<string, z.ZodTypeDef, string>;

export type BigIntString = z.infer<typeof BigIntStringSchema>;
export const BufferStringSchema = z
  .instanceof(Buffer)
  .transform(arg => arg.toString('hex'));

export const DateSchema = z.preprocess((val, ctx) => {
  if (val instanceof Date) {
    return val;
  }
  if (typeof val === 'string') {
    return new Date(val);
  }
  if (typeof val === 'number') {
    if (val < 1e10) {
      return new Date(val * 1000);
    }
    return new Date(val);
  }
  if (typeof val === 'bigint') {
    if (val < 1e10) {
      return new Date(Number(val) * 1000);
    }
    return new Date(Number(val));
  }
  ctx.addIssue({
    message: `val is not a date: ${val}`,
    code: 'custom',
  });
  return z.never();
}, z.date()) as z.ZodType<Date, z.ZodTypeDef, Date | string | bigint | number>;

export const TemporalWorkflowHandleSchema = z.object({
  workflowId: z.string(),
});
export type TemporalWorkflowHandle = z.infer<
  typeof TemporalWorkflowHandleSchema
>;

export type Hex0xString = `0x${string}`;

export const Hex0xSchema = z.preprocess((val, ctx) => {
  if (typeof val === 'string') {
    if (val.startsWith('0x')) {
      return val;
    } else {
      if (val.startsWith('x')) {
        return `0${val}`;
      }
      if (val.length % 2 === 0) {
        return `0x${val}`;
      }
    }
  }
  if (val instanceof Buffer) {
    return `0x${val.toString('hex')}`;
  }
  ctx.addIssue({
    message: `val is not an 0x prefixed string: ${val}`,
    code: 'custom',
  });
  return z.never();
}, z.string()) as z.ZodType<Hex0xString, z.ZodTypeDef, string | Buffer>;

export const UUIDSchema = z.string().uuid();
