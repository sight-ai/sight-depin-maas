import { z } from 'zod';
import { OllamaModelSchema } from '../ollama/ollama';

// Chat message format
export const OpenAIChatMessage = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
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
  messages: z.array(OpenAIChatMessage),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
  response_format: z.object({
    type: z.enum(['text', 'json_object']),
  }).optional(),
  tools: z.array(z.object({
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
  })).optional(),
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

// Completion params
export const CompletionParams = BaseModelParams.extend({
  prompt: z.string(),
  suffix: z.string().optional(),
  best_of: z.number().optional(),
  echo: z.boolean().optional(),
  logprobs: z.number().optional(),
  n: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
});

// Embedding params
export const EmbeddingParams = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
});

// OpenAI chat response
export const OpenAIChatResponse = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  choices: z.array(z.object({
    message: z.object({
      role: z.string(),
      content: z.string(),
    }),
    finish_reason: z.string(),
    index: z.number(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  //custom
  done: z.boolean(),
});

// OpenAI completion response
export const OpenAICompletionResponse = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.string(),
  choices: z.array(z.object({
    text: z.string(),
    index: z.number(),
    logprobs: z.null(),
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  //custom
  done: z.boolean(),
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

// OpenAI list models response
export const OpenAIListModelsResponse = z.object({
  object: z.string(),
  data: z.array(z.object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    owned_by: z.string(),
  })),
});

// Export all schemas
export const OpenAI = {
  OpenAIChatMessage,
  BaseModelParams,
  ChatParams,
  CompletionParams,
  EmbeddingParams,
  OpenAIChatResponse,
  OpenAICompletionResponse,
  OpenAIEmbeddingResponse,
  OpenAIListModelsResponse,
  ...OllamaModelSchema,
};