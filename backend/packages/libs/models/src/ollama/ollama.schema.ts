/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { JSONSchema } from '../utils/json.schema';

/**
 * Utility: JSON string validator similar to the OpenAI version.
 */
export const JSONStringSchema = z.preprocess((arg, ctx) => {
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
    ctx.addIssue({
      code: 'custom',
      message: `Expected JSON string, received ${arg}`,
    });
    return z.never();
  }
}, z.string());

/**
 * Role Enum for Ollama.
 * For Ollama we assume only "user" and "assistant" roles.
 */
export const ollamaRole = z.enum(['user', 'assistant']);

/**
 * Request message.
 * For Ollama, we assume the request always comes from the "user".
 */
export const ollamaRequestMessage = z.object({
  role: z.literal('user'),
  content: z.string(),
  name: z.string().optional(),
});

/**
 * Request function call.
 * (Ollama currently does not support function calling;
 *  this is provided for compatibility.)
 */
export const ollamaRequestFunctionCall = z.object({
  name: z.string(),
  arguments: JSONStringSchema,
});

/**
 * Response message.
 * For Ollama, the response is produced by the "assistant".
 */
export const ollamaResponseMessage = z.object({
  role: z.literal('assistant'),
  content: z.string().nullable(),
  name: z.string().optional(),
});

/**
 * Response function call.
 * (Again, provided for compatibility even if not used.)
 */
export const ollamaResponseFunctionCall = z.object({
  name: z.string(),
  arguments: JSONStringSchema,
});

/**
 * $function_call and $function definitions.
 * They are included for API consistency with the OpenAI definitions.
 */
export const $ollamaFunctionCall = z.union([
  z.literal('auto'),
  z.literal('none'),
  z.object({ name: z.string() }),
]);

export const $ollamaFunction = z.object({
  name: z.string(),
  description: z.string().optional(),
  parameters: JSONSchema,
});

/**
 * Generate request schema for Ollama.
 *
 * Fields:
 * - model: (required) the model name.
 * - prompt: the text prompt.
 * - suffix: text appended after the model response.
 * - images: a list of base64-encoded images (for multimodal models).
 *
 * Advanced parameters include:
 * - format: either "json" or a JSON schema for structured outputs.
 * - options: additional model parameters.
 * - system: a system message override.
 * - template: a prompt template override.
 * - stream: controls whether to stream responses.
 * - raw: if true, no templating is applied.
 * - keep_alive: how long the model should remain loaded (default "5m").
 * - context: (deprecated) conversation context.
 */
export const OllamaGenerateRequest = z.object({
  model: z.string(),
  prompt: z.string(),
  suffix: z.string().optional(),
  images: z.array(z.string()).optional(),
  format: z.union([z.literal('json'), JSONSchema]).optional(),
  options: z.record(z.any()).optional(),
  system: z.string().optional(),
  template: z.string().optional(),
  stream: z.boolean().optional(),
  raw: z.boolean().optional(),
  keep_alive: z.string().optional(),
  context: z.array(z.number()).optional(),
});

/**
 * Generate response schema for Ollama.
 *
 * In streaming mode, multiple response objects are sent.
 * The final response includes additional statistics.
 */
export const OllamaGenerateResponse = z.object({
  model: z.string(),
  created_at: z.string(), // ISO 8601 timestamp
  response: z.string(),
  done: z.boolean(),
  done_reason: z.string().optional(),
  context: z.array(z.number()).optional(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
});

/**
 * Usage schema.
 * (Optional: to capture token/timing information.)
 */
export const ollamaUsage = z.object({
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
});

/**
 * Choice schema.
 * (For compatibility; Ollama's API returns a single message rather than an array of choices.)
 */
export const ollamaChoice = z.object({
  index: z.number().optional(),
  message: ollamaResponseMessage,
  finish_reason: z.string().optional(),
});

export const OllamaChatRequest = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  suffix: z.string().optional(),
  images: z.array(z.string()).optional(),
  format: z.union([z.literal('json'), JSONSchema]).optional(),
  options: z.record(z.any()).optional(),
  system: z.string().optional(),
  template: z.string().optional(),
  stream: z.boolean().optional(),
  raw: z.boolean().optional(),
  keep_alive: z.string().optional(),
  context: z.array(z.number()).optional(),
});

export const OllamaShowModelRequest = z.object({
  model: z.string()
});

export const ollamaModelTag = z.object({
  name: z.string(),
  modified_at: z.coerce.date(),
  model: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).nullable(), // null or array of strings
    parameter_size: z.string(),
    quantization_level: z.string(),
  })
});

export const ollamaListModelsResponse = z.object({
  models: z.array(ollamaModelTag)
});

export const OllamaCreateRequest = z.object({
  model: z.string(),
  from: z.string().optional(),
  files: z.record(z.string()).optional(),
  adapters: z.record(z.string()).optional(),
  template: z.string().optional(),
  license: z.union([z.string(), z.array(z.string())]).optional(),
  system: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional(),
  stream: z.boolean().optional(),
  quantize: z.string().optional()
});

export const OllamaCreateResponse = z.object({
  status: z.string()
});

export const OllamaCopyRequest = z.object({
  source: z.string(),
  destination: z.string()
});

export const OllamaDeleteRequest = z.object({
  model: z.string()
});

export const OllamaPullRequest = z.object({
  model: z.string(),
  insecure: z.boolean().optional(),
  stream: z.boolean().optional()
});

export const OllamaPullResponse = z.object({
  status: z.string(),
  digest: z.string().optional(),
  total: z.number().optional(),
  completed: z.number().optional()
});

export const OllamaPushRequest = z.object({
  model: z.string(),
  insecure: z.boolean().optional(),
  stream: z.boolean().optional()
});

export const OllamaPushResponse = z.object({
  status: z.string(),
  digest: z.string().optional(),
  total: z.number().optional()
});

export const OllamaEmbedRequest = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
  truncate: z.boolean().optional(),
  options: z.record(z.any()).optional(),
  keep_alive: z.string().optional()
});

export const OllamaEmbedResponse = z.object({
  model: z.string(),
  embeddings: z.array(z.array(z.number())),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional()
});

export const OllamaVersionResponse = z.object({
  version: z.string()
});

export const OllamaRunningModel = z.object({
  name: z.string(),
  model: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    parent_model: z.string(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()),
    parameter_size: z.string(),
    quantization_level: z.string()
  }),
  expires_at: z.string(),
  size_vram: z.number()
});

export const OllamaListRunningModelsResponse = z.object({
  models: z.array(OllamaRunningModel)
});

/**
 * The complete Ollama API schema.
 */
export const OllamaAPISchema = {
  generate: {
    request: OllamaGenerateRequest,
    response: OllamaGenerateResponse,
  },
  chat: {
    request: OllamaChatRequest,
    response: OllamaGenerateResponse,
  },
  create: {
    request: OllamaCreateRequest,
    response: OllamaCreateResponse,
  },
  copy: {
    request: OllamaCopyRequest,
    response: z.void(),
  },
  delete: {
    request: OllamaDeleteRequest,
    response: z.void(),
  },
  pull: {
    request: OllamaPullRequest,
    response: OllamaPullResponse,
  },
  push: {
    request: OllamaPushRequest,
    response: OllamaPushResponse,
  },
  embed: {
    request: OllamaEmbedRequest,
    response: OllamaEmbedResponse,
  },
  version: {
    request: z.void(),
    response: OllamaVersionResponse,
  },
  ps: {
    request: z.void(),
    response: OllamaListRunningModelsResponse,
  },
  show: {
    request: OllamaShowModelRequest,
    response: z.any(), // Complex response type that includes model details
  },
  tags: {
    request: z.void(),
    response: ollamaListModelsResponse,
  }
};

export const ChatRecordSchema = z.object({
  chatId: z.string().min(1),
  userId: z.string().min(1),
  userInput: z.string(),
  aiResponse: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  task_id: z.string().optional()
});

export const FindChatRecordSchema = z.object({
  chatId: z.string().min(1),
  userId: z.string().min(1),
  userInput: z.string(),
  aiResponse: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  task_id: z.string().optional()
});

export const UpdateChatRecordSchema = z.object({
  chatId: z.string().min(1),
  userId: z.string().min(1),
  userInput: z.string(),
  aiResponse: z.string(),
  status: z.enum(["active", "archived"]),
  task_id: z.string().optional()
});

/**
 * The final Ollama model definitions.
 * This object mimics the structure of your OpenAIModel, exposing:
 * - model, request_message, request_function_call, response_message, response_function_call,
 *   $function_call, $function, Enums, usage, choice, role, and the API schemas.
 */
export const OllamaModel = {
  model: z.string(), // Model name is a string
  request_message: ollamaRequestMessage,
  request_function_call: ollamaRequestFunctionCall,
  response_message: ollamaResponseMessage,
  response_function_call: ollamaResponseFunctionCall,
  $function_call: $ollamaFunctionCall,
  $function: $ollamaFunction,
  Enums: {
    model: z.string(),
    role: ollamaRole,
  },
  usage: ollamaUsage,
  choice: ollamaChoice,
  role: ollamaRole,
  OllamaAPISchema,
  generate_request: OllamaGenerateRequest,
  generate_response: OllamaGenerateResponse,
  JSONStringSchema,
  ChatRecordSchema,
  FindChatRecordSchema,
  UpdateChatRecordSchema,
  chat_request: OllamaChatRequest,
  show_model_request: OllamaShowModelRequest,
  model_tag: ollamaModelTag,
  list_model_response: ollamaListModelsResponse,
  version_response: OllamaVersionResponse,
  create_request: OllamaCreateRequest,
  create_response: OllamaCreateResponse,
  copy_request: OllamaCopyRequest,
  delete_request: OllamaDeleteRequest,
  pull_request: OllamaPullRequest,
  push_request: OllamaPushRequest,
  embed_request: OllamaEmbedRequest,
  embed_response: OllamaEmbedResponse,
  list_running_models_response: OllamaListRunningModelsResponse
};

/**
 * Utility type to extract the inferred type from the model.
 */
export type ModelOfOllama<T extends keyof typeof OllamaModel> =
  (typeof OllamaModel)[T] extends z.ZodType<infer O> ? O : never;

