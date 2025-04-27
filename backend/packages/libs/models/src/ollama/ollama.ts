import { z } from 'zod';

// Base model format
export const OllamaModel = z.object({
  name: z.string(),
  modified_at: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).nullable(),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
});

// List models response
export const OllamaModelList = z.object({
  models: z.array(OllamaModel),
});

// Show model info response
export const OllamaModelInfo = z.object({
  modelfile: z.string(),
  parameters: z.string(),
  template: z.string(),
  details: z.object({
    parent_model: z.string(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
  model_info: z.record(z.any()),
});

// Copy model request
export const OllamaModelCopyRequest = z.object({
  source: z.string(),
  destination: z.string(),
});

// Delete model request
export const OllamaModelDeleteRequest = z.object({
  name: z.string(),
});

// Pull model request
export const OllamaModelPullRequest = z.object({
  model: z.string(),
  insecure: z.boolean().optional(),
  stream: z.boolean().optional(),
});

// Pull model response
export const OllamaModelPullResponse = z.object({
  status: z.string(),
  digest: z.string().optional(),
  total: z.number().optional(),
  completed: z.number().optional(),
});

// Push model request
export const OllamaModelPushRequest = z.object({
  model: z.string(),
  insecure: z.boolean().optional(),
  stream: z.boolean().optional(),
});

// Push model response
export const OllamaModelPushResponse = z.object({
  status: z.string(),
  digest: z.string().optional(),
  total: z.number().optional(),
  completed: z.number().optional(),
});

// Create model request
export const OllamaModelCreateRequest = z.object({
  model: z.string(),
  from: z.string().optional(),
  files: z.record(z.string()).optional(),
  adapters: z.record(z.string()).optional(),
  template: z.string().optional(),
  license: z.union([z.string(), z.array(z.string())]).optional(),
  system: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  messages: z.array(z.any()).optional(),
  stream: z.boolean().optional(),
  quantize: z.string().optional(),
});

// Create model response
export const OllamaModelCreateResponse = z.object({
  status: z.string(),
});

// Chat message format
export const ChatMessage = z.object({
  role: z.string(),
  content: z.string(),
});

// Tool function format
export const ToolFunction = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.object({
      type: z.string(),
      properties: z.record(z.any()),
      required: z.array(z.string()).optional(),
    }),
  }),
});

// Chat request format
export const OllamaChatRequest = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  keep_alive: z.number().optional(),
  stream: z.boolean().optional(),
  //custom
  task_id: z.string().optional(),
  device_id: z.string().optional(),
});

// Chat response format
export const OllamaChatResponse = z.object({
  model: z.string(),
  created_at: z.string(),
  message: ChatMessage,
  done_reason: z.string(),
  done: z.boolean(),
});

// Generation request format
export const OllamaGenerateRequest = z.object({
  model: z.string(),
  prompt: z.string(),
  keep_alive: z.number().optional(),
  stream: z.boolean().optional(),
  //custom
  task_id: z.string().optional(),
  device_id: z.string().optional(),
});

// Generation response format
export const OllamaGenerateResponse = z.object({
  model: z.string(),
  created_at: z.string(),
  response: z.string(),
  done: z.boolean(),
  done_reason: z.string().optional(),
});

// Embeddings request format (multiple inputs)
export const OllamaEmbeddingsRequest = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
});

// Embeddings response format
export const OllamaEmbeddingsResponse = z.object({
  model: z.string(),
  embeddings: z.array(z.array(z.number())),
});

// Running models response format
export const OllamaRunningModels = z.object({
  models: z.array(z.object({
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
      quantization_level: z.string(),
    }),
    expires_at: z.string(),
    size_vram: z.number(),
  })),
});

// Version response format
export const OllamaVersionResponse = z.object({
  version: z.string(),
});

export const OllamaModelSchema = {
  OllamaModel,
  OllamaModelList,
  OllamaModelInfo,
  OllamaModelCopyRequest,
  OllamaModelDeleteRequest,
  OllamaModelPullRequest,
  OllamaModelPullResponse,
  OllamaModelPushRequest,
  OllamaModelPushResponse,
  OllamaModelCreateRequest,
  OllamaModelCreateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaRunningModels,
  OllamaVersionResponse,
  ChatMessage,
  ToolFunction,
}