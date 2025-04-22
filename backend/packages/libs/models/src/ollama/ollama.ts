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

// Chat request format
export const OllamaChatRequest = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  tools: z.array(ToolFunction).optional(),
  format: z.union([z.literal('json'), z.record(z.any())]).optional(),
  options: z.object({
    temperature: z.number().optional(),
    num_predict: z.number().optional(),
    top_k: z.number().optional(),
    top_p: z.number().optional(),
    tfs_z: z.number().optional(),
    typical_p: z.number().optional(),
    repeat_last_n: z.number().optional(),
    repeat_penalty: z.number().optional(),
    presence_penalty: z.number().optional(),
    frequency_penalty: z.number().optional(),
    mirostat: z.number().optional(),
    mirostat_tau: z.number().optional(),
    mirostat_eta: z.number().optional(),
    penalize_newline: z.boolean().optional(),
    stop: z.array(z.string()).optional(),
    numa: z.boolean().optional(),
    num_ctx: z.number().optional(),
    num_batch: z.number().optional(),
    num_gqa: z.number().optional(),
    num_gpu: z.number().optional(),
    main_gpu: z.number().optional(),
    low_vram: z.boolean().optional(),
    f16_kv: z.boolean().optional(),
    logits_all: z.boolean().optional(),
    vocab_only: z.boolean().optional(),
    use_mmap: z.boolean().optional(),
    use_mlock: z.boolean().optional(),
    embedding_only: z.boolean().optional(),
    rope_frequency_base: z.number().optional(),
    rope_frequency_scale: z.number().optional(),
    num_thread: z.number().optional(),
  }).optional(),
  stream: z.boolean().optional(),
  keep_alive: z.union([z.string(), z.number()]).optional(),
  task_id: z.string().optional(),
  device_id: z.string().optional()
});

// Chat response format
export const OllamaChatResponse = z.object({
  model: z.string(),
  created_at: z.string(),
  message: ChatMessage,
  done: z.boolean(),
  done_reason: z.string().optional(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
});

// Generation request format
export const OllamaGenerateRequest = z.object({
  model: z.string(),
  prompt: z.string(),
  images: z.array(z.string()).optional(),
  format: z.union([z.literal('json'), z.record(z.any())]).optional(),
  options: z.object({
    temperature: z.number().optional(),
    num_predict: z.number().optional(),
    top_k: z.number().optional(),
    top_p: z.number().optional(),
    tfs_z: z.number().optional(),
    typical_p: z.number().optional(),
    repeat_last_n: z.number().optional(),
    repeat_penalty: z.number().optional(),
    presence_penalty: z.number().optional(),
    frequency_penalty: z.number().optional(),
    mirostat: z.number().optional(),
    mirostat_tau: z.number().optional(),
    mirostat_eta: z.number().optional(),
    penalize_newline: z.boolean().optional(),
    stop: z.array(z.string()).optional(),
    numa: z.boolean().optional(),
    num_ctx: z.number().optional(),
    num_batch: z.number().optional(),
    num_gqa: z.number().optional(),
    num_gpu: z.number().optional(),
    main_gpu: z.number().optional(),
    low_vram: z.boolean().optional(),
    f16_kv: z.boolean().optional(),
    logits_all: z.boolean().optional(),
    vocab_only: z.boolean().optional(),
    use_mmap: z.boolean().optional(),
    use_mlock: z.boolean().optional(),
    embedding_only: z.boolean().optional(),
    rope_frequency_base: z.number().optional(),
    rope_frequency_scale: z.number().optional(),
    num_thread: z.number().optional(),
  }).optional(),
  template: z.string().optional(),
  context: z.array(z.number()).optional(),
  stream: z.boolean().optional(),
  raw: z.boolean().optional(),
  keep_alive: z.union([z.string(), z.number()]).optional(),
  task_id: z.string().optional(),
  device_id: z.string().optional()
});

// Generation response format
export const OllamaGenerateResponse = z.object({
  model: z.string(),
  created_at: z.string(),
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

// Embeddings request format
export const OllamaEmbeddingsRequest = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
  truncate: z.boolean().optional(),
  options: z.object({
    temperature: z.number().optional(),
    num_ctx: z.number().optional(),
    num_batch: z.number().optional(),
    num_gpu: z.number().optional(),
    main_gpu: z.number().optional(),
    low_vram: z.boolean().optional(),
    f16_kv: z.boolean().optional(),
    logits_all: z.boolean().optional(),
    vocab_only: z.boolean().optional(),
    use_mmap: z.boolean().optional(),
    use_mlock: z.boolean().optional(),
    embedding_only: z.boolean().optional(),
    rope_frequency_base: z.number().optional(),
    rope_frequency_scale: z.number().optional(),
    num_thread: z.number().optional(),
  }).optional(),
  keep_alive: z.union([z.string(), z.number()]).optional(),
});

// Embeddings response format
export const OllamaEmbeddingsResponse = z.object({
  model: z.string(),
  embeddings: z.array(z.array(z.number())),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
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


