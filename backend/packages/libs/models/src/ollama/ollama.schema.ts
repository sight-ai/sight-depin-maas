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

/**
 * The complete Ollama API schema.
 */
export const OllamaAPISchema = {
  generate: {
    request: OllamaGenerateRequest,
    response: OllamaGenerateResponse,
  },
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
  UpdateChatRecordSchema
};

/**
 * Utility type to extract the inferred type from the model.
 */
export type ModelOfOllama<T extends keyof typeof OllamaModel> =
  (typeof OllamaModel)[T] extends z.ZodType<infer O> ? O : never;
