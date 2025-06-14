import { z } from 'zod';
import { ChatMessage } from '../ollama/ollama';

// OpenAI Chat Completion Request
export const OpenAIChatCompletionRequest = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  n: z.number().optional(),
  stream: z.boolean().optional(),
  max_tokens: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  // Custom fields
  task_id: z.string().optional(),
  device_id: z.string().optional(),
});

// OpenAI Chat Completion Response
export const OpenAIChatCompletionResponse = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: ChatMessage,
    finish_reason: z.string().nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// OpenAI Chat Completion Chunk (for streaming)
export const OpenAIChatCompletionChunk = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    delta: z.object({
      content: z.string().optional(),
      role: z.string().optional(),
    }).optional(),
    finish_reason: z.string().nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

// OpenAI Completion Request (text completion)
export const OpenAICompletionRequest = z.object({
  model: z.string(),
  prompt: z.string(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  n: z.number().optional(),
  stream: z.boolean().optional(),
  max_tokens: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  // Custom fields
  task_id: z.string().optional(),
  device_id: z.string().optional(),
});

// OpenAI Completion Response
export const OpenAICompletionResponse = z.object({
  id: z.string(),
  object: z.literal('text_completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    text: z.string(),
    index: z.number(),
    finish_reason: z.string().nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// OpenAI Completion Chunk (for streaming)
export const OpenAICompletionChunk = z.object({
  id: z.string(),
  object: z.literal('text_completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    text: z.string(),
    index: z.number(),
    finish_reason: z.string().nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  })
});

// OpenAI Embeddings Request
export const OpenAIEmbeddingsRequest = z.object({
  model: z.string(),
  input: z.union([z.string(), z.array(z.string())]),
  encoding_format: z.enum(['float', 'base64']).optional(),
  // Custom fields
  task_id: z.string().optional(),
  device_id: z.string().optional(),
});

// OpenAI Embeddings Response
export const OpenAIEmbeddingsResponse = z.object({
  object: z.literal('list'),
  data: z.array(z.object({
    object: z.literal('embedding'),
    embedding: z.array(z.number()),
    index: z.number(),
  })),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// OpenAI Model Object
export const OpenAIModel = z.object({
  id: z.string(),
  object: z.literal('model'),
  created: z.number(),
  owned_by: z.string(),
});

// OpenAI Models List Response
export const OpenAIModelsList = z.object({
  object: z.literal('list'),
  data: z.array(OpenAIModel),
});

// Export all schemas
export const OpenAIModelSchema = {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionChunk,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  OpenAICompletionChunk,
  OpenAIEmbeddingsRequest,
  OpenAIEmbeddingsResponse,
  OpenAIModel,
  OpenAIModelsList,
};
