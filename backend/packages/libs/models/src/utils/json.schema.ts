/*
https://github.com/colinhacks/zod#json-type
 */
import { z } from "zod";

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
export type JSONType = Literal | { [key: string]: JSONType } | JSONType[];
export const JSONSchema: z.ZodType<JSONType> = z.lazy(() =>
  z.union([literalSchema, z.array(JSONSchema), z.record(JSONSchema)]),
);
