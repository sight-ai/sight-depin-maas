/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { JSONSchema } from '../utils/json.schema';

/*
 https://platform.openai.com/docs/api-reference/chat/create
 POST https://api.openai.com/v1/chat/completions
 */

export const OpenAIModelName = z.enum([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4o-2024-08-06',
  'gpt-4-1106-preview',
  'gpt-4-vision-preview',
  'gpt-4',
  'gpt-4-0314',
  'gpt-4-0613',
  'gpt-4-32k',
  'gpt-4-32k-0314',
  'gpt-4-32k-0613',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-3.5-turbo-0301',
  'gpt-3.5-turbo-0613',
  'gpt-3.5-turbo-16k-0613',
]);

const role = z.enum(['system', 'user', 'assistant', 'function']);

const JSONStringSchema = z.preprocess((arg, ctx) => {
  if (typeof arg !== 'string') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected string, received ${typeof arg}`,
    });
    return z.never();
  }
  try {
    JSON.parse(arg);
    return arg;
  } catch (e) {
    // TODO: do modification
    // const object = JSON.parse(arg);
    // return JSON.stringify(object);
    ctx.addIssue({
      code: 'custom',
      message: `Expected JSON string, received ${arg}`,
    });
    return z.never();
  }
}, z.string()) as z.ZodType<string>;

const StringJSONSchema = z.preprocess((arg, ctx) => {
  if (typeof arg !== 'string') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected string, received ${typeof arg}`,
    });
    return z.never();
  }
  try {
    const obj = JSON.parse(arg);
    return obj;
  } catch (e) {
    ctx.addIssue({
      code: 'custom',
      message: `Expected JSON string, received ${arg}`,
    });
    return z.never();
  }
}, JSONSchema);

const request_function_call = z.object({
  name: z.string(),
  arguments: JSONStringSchema,
});
const request_message = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('system'),
    content: z.string().nullable(),
    name: z.string().optional(),
    function_call: request_function_call.optional(),
  }),
  z.object({
    role: z.literal('user'),
    content: z.string().nullable(),
    name: z.string().optional(),
    function_call: request_function_call.optional(),
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().nullable(),
    name: z.string().optional(),
    function_call: request_function_call.optional(),
  }),
  z.object({
    role: z.literal('function'),
    content: z.string().nullable(),
    name: z.string(),
    function_call: request_function_call.optional(),
  }),
]);

const response_function_call = z.object({
  name: z.string(),
  arguments: StringJSONSchema,
});
const response_message = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('system'),
    content: z.string().nullish(),
    name: z.string().optional(),
    function_call: response_function_call.optional(),
  }),
  z.object({
    role: z.literal('user'),
    content: z.string().nullish(),
    name: z.string().optional(),
    function_call: response_function_call.optional(),
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().nullish(),
    name: z.string().optional(),
    function_call: response_function_call.optional(),
  }),
  z.object({
    role: z.literal('function'),
    content: z.string().nullish(),
    name: z.string(),
    function_call: response_function_call,
  }),
]);

const JSONSchemaPropertySchema = (() => {
  const schema: any = z.object({
    type: z.union([
      z.literal('string'),
      z.literal('number'),
      z.literal('array'),
      z.literal('object'),
    ]),
    description: z.string().optional(),
    enum: z.array(z.string()).optional(),
    items: z
      .union([z.lazy(() => schema), z.array(z.lazy(() => schema))])
      .optional(),
    properties: z.record(z.lazy(() => schema)).optional(),
    additionalProperties: z
      .union([z.boolean(), z.lazy(() => schema)])
      .optional(),
    required: z.array(z.string()).optional(),
  });
  return schema;
})();

const OpenAIParameterJSONSchema = z.object({
  type: z.literal('object'),
  required: z.array(z.string()),
  properties: z.record(JSONSchemaPropertySchema),
});

const $function = z.object({
  name: z.string(),
  description: z.string().optional(),
  parameters: OpenAIParameterJSONSchema,
});

/*
Controls how the model responds to function calls. none means the model does not
call a function, and responds to the end-user. auto means the model can pick
between an end-user or calling a function. Specifying a particular function
via {"name": "my_function"} forces the model to call that function.
none is the default when no functions are present.
auto is the default if functions are present.
 */
const $function_call = z.union([
  z.enum(['auto', 'none']),
  z.object({ name: z.string() }),
]);

/*
https://platform.openai.com/docs/api-reference/chat/create
 */
const chat_completion_request = z.object({
  model: OpenAIModelName,
  messages: z.array(request_message),
  functions: z.array($function),
  function_call: $function_call.optional(),
  temperature: z.number().nullish(),
  top_p: z.number().nullish(),
  n: z.number().nullish(),
  stream: z.boolean().nullish(),
  stop: z.string().nullish(),
  max_tokens: z.number().optional(),
  presence_penalty: z.number().min(-2).max(2).nullish(),
  frequency_penalty: z.number().min(-2).max(2).nullish(),
  logit_bias: z.any(),
  user: z.string().optional(),

  openpipe: z
    .object({
      tags: z.object({
        prompt_id: z.string(),
      }),
      logRequest: z.boolean().default(true), // Defaults to true if unspecified
    })
    .optional(),
});

const usage = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

const choice = z.object({
  index: z.number(),
  message: response_message,
  finish_reason: z.enum(['stop', 'function_call']),
});

const chat_completion_response = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: OpenAIModelName,
  choices: z.array(choice),
  usage,
});

export const OpenAIAPISchema = {
  chat: {
    completion: {
      request: chat_completion_request,
      response: chat_completion_response,
    },
  },
};

export const OpenAIModel = {
  model: OpenAIModelName,
  request_message,
  request_function_call,
  response_message,
  response_function_call,
  $function_call,
  $function,
  Enums: {
    model: OpenAIModelName,
    role,
  },
  usage,
  choice,
  role,
  OpenAIAPISchema,
  chat_completion_request,
  chat_completion_response,
  JSONStringSchema,
};

export type ModelOfOpenAI<T extends keyof typeof OpenAIModel> =
  (typeof OpenAIModel)[T] extends z.ZodType<infer O> ? O : never;
