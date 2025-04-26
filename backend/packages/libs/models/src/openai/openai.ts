import { z } from 'zod';

// Base model format
export const OllamaModel = z.object({
  name: z.string(),
  modified_at: z.string(),
  model: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    parent_model: z.string().optional(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).nullable(),
    parameter_size: z.string(),
    quantization_level: z.string().optional(),
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
  capabilities: z.array(z.string()),
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
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  images: z.array(z.string()).optional(),
  tool_calls: z.array(z.object({
    function: z.object({
      name: z.string(),
      arguments: z.record(z.any()),
    }),
  })).optional(),
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

// Base model params
export const BaseModelParams = z.object({
  model: z.string(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
});

// Chat params
export const ChatParams = BaseModelParams.extend({
  messages: z.array(ChatMessage),
});

// Completion params
export const CompletionParams = BaseModelParams.extend({
  prompt: z.string(),
  suffix: z.string().optional(),
});

// Embedding params
export const EmbeddingParams = BaseModelParams.extend({
  input: z.union([z.string(), z.array(z.string())]),
});

// Ollama options
export const OllamaOptions = z.object({
  temperature: z.number().optional(),
  top_k: z.number().optional(),
  top_p: z.number().optional(),
  repeat_penalty: z.number().optional(),
  stop: z.array(z.string()).optional(),
  seed: z.number().optional(),
  num_ctx: z.number().optional(),
  num_gpu: z.number().optional(),
  num_thread: z.number().optional(),
  repeat_last_n: z.number().optional(),
  tfs_z: z.number().optional(),
  typical_p: z.number().optional(),
  mirostat: z.number().optional(),
  mirostat_eta: z.number().optional(),
  mirostat_tau: z.number().optional(),
  penalize_newline: z.boolean().optional(),
  num_predict: z.number().optional(),
});

// Ollama params
export const OllamaParams = z.object({
  model: z.string(),
  options: OllamaOptions.optional(),
  stream: z.boolean().optional(),
});

// Ollama chat params
export const OllamaChatParams = OllamaParams.extend({
  messages: z.array(ChatMessage),
});

// Ollama completion params
export const OllamaCompletionParams = OllamaParams.extend({
  prompt: z.string(),
  suffix: z.string().optional(),
});

// Ollama embedding params
export const OllamaEmbeddingParams = OllamaParams.extend({
  input: z.union([z.string(), z.array(z.string())]),
  options: OllamaOptions.extend({
    truncate: z.boolean().optional(),
    keep_alive: z.string().optional(),
  }).optional(),
});

// OpenAI chat params
export const OpenAIChatParams = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
  response_format: z.object({
    type: z.enum(['text', 'json_object']),
  }).optional(),
  tools: z.array(ToolFunction).optional(),
  tool_choice: z.union([
    z.literal('auto'),
    z.literal('none'),
    z.object({
      type: z.literal('function'),
      function: z.object({
        name: z.string(),
      }),
    }),
  ]).optional(),
});

// OpenAI completion params
export const OpenAICompletionParams = z.object({
  model: z.string(),
  prompt: z.string(),
  suffix: z.string().optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  n: z.number().optional(),
  stream: z.boolean().optional(),
  logprobs: z.number().optional(),
  echo: z.boolean().optional(),
  stop: z.array(z.string()).optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  best_of: z.number().optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
});

// OpenAI embedding params
export const OpenAIEmbeddingParams = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
  encoding_format: z.enum(['float', 'base64']).optional(),
  user: z.string().optional(),
});

// OpenAI response
export const OpenAIResponse = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    message: ChatMessage.optional(),
    text: z.string().optional(),
    index: z.number(),
    logprobs: z.any().optional(),
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// OpenAI chat response
export const OpenAIChatResponse = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    message: ChatMessage,
    index: z.number(),
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// OpenAI completion response
export const OpenAICompletionResponse = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    text: z.string(),
    index: z.number(),
    logprobs: z.any(),
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// OpenAI embedding response
export const OpenAIEmbeddingResponse = z.object({
  object: z.string(),
  data: z.array(z.object({
    object: z.string(),
    embedding: z.array(z.number()),
    index: z.number(),
  })),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// Ollama embedding response
export const OllamaEmbeddingResponse = z.object({
  model: z.string(),
  embeddings: z.array(z.array(z.number())),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
});

// Running models response
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

// Version response
export const OllamaVersionResponse = z.object({
  version: z.string(),
});

// Export all schemas
export const OpenAI = {
  ChatMessage,
  ToolFunction,
  BaseModelParams,
  ChatParams,
  CompletionParams,
  EmbeddingParams,
  OllamaOptions,
  OllamaParams,
  OllamaChatParams,
  OllamaCompletionParams,
  OllamaEmbeddingParams,
  OpenAIChatParams,
  OpenAICompletionParams,
  OpenAIEmbeddingParams,
  OpenAIResponse,
  OpenAIChatResponse,
  OpenAICompletionResponse,
  OpenAIEmbeddingResponse,
  OllamaEmbeddingResponse,
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
  OllamaRunningModels,
  OllamaVersionResponse,
};