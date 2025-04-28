import { z } from 'zod';
import { OpenAI } from '@saito/models';

export class OpenAIOllamaAdapter {
  /**
   * Convert OpenAI chat parameters to Ollama chat parameters
   */
  static toOllamaChatParams(params: z.infer<typeof OpenAI.ChatParams>): any {
    const { 
      model, 
      messages, 
      temperature, 
      top_p, 
      max_tokens, 
      stop, 
      stream,
      presence_penalty,
      frequency_penalty
    } = params;
    
    const options: any = {};
    
    // Map basic parameters according to API specs
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    if (presence_penalty !== undefined) options.presence_penalty = presence_penalty;
    if (frequency_penalty !== undefined) options.frequency_penalty = frequency_penalty;
    
    return {
      model,
      messages,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined,
      keep_alive: 60 // Default keep_alive value in seconds
    };
  }

  /**
   * Convert OpenAI completion parameters to Ollama completion parameters
   */
  static toOllamaCompletionParams(params: z.infer<typeof OpenAI.CompletionParams>): any {
    const { 
      model, 
      prompt, 
      temperature, 
      top_p, 
      max_tokens, 
      stop, 
      stream,
      presence_penalty,
      frequency_penalty,
      echo,
      suffix
    } = params;
    
    const options: any = {};
    
    // Map basic parameters according to API specs
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    if (presence_penalty !== undefined) options.presence_penalty = presence_penalty;
    if (frequency_penalty !== undefined) options.frequency_penalty = frequency_penalty;
    if (echo !== undefined) options.echo = echo;
    
    return {
      model,
      prompt,
      stream,
      suffix,
      options: Object.keys(options).length > 0 ? options : undefined,
      keep_alive: 60 // Default keep_alive value in seconds
    };
  }

  /**
   * Convert OpenAI embedding parameters to Ollama embedding parameters
   */
  static toOllamaEmbeddingParams(params: z.infer<typeof OpenAI.EmbeddingParams>): any {
    const { model, input } = params;
    
    // Handle both single string and array inputs
    const isArray = Array.isArray(input);
    
    if (isArray) {
      return {
        model,
        input,
        options: {
          truncate: true
        }
      };
    }
    
    return {
      model,
      prompt: input as string,
      options: {
        truncate: true
      }
    };
  }

  /**
   * Convert Ollama chat response to OpenAI chat response format
   */
  static toOpenAIChatResponse(ollamaResponse: any, stream: boolean = false): z.infer<typeof OpenAI.OpenAIChatResponse> {
    return {
      id: 'chat-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      done: ollamaResponse.done,
      choices: [{
        message: {
          role: 'assistant',
          content: ollamaResponse.message?.content || ollamaResponse.response || ''
        },
        finish_reason: ollamaResponse.done_reason || 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count || 0,
        completion_tokens: ollamaResponse.eval_count || 0,
        total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
      }
    };
  }

  /**
   * Convert Ollama completion response to OpenAI completion response format
   */
  static toOpenAICompletionResponse(ollamaResponse: any): z.infer<typeof OpenAI.OpenAICompletionResponse> {
    return {
      id: 'cmpl-' + Date.now(),
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: ollamaResponse.model || 'unknown',
      system_fingerprint: 'fp_' + Date.now(),
      done: ollamaResponse.done,
      choices: [{
        text: ollamaResponse.response || '',
        index: 0,
        logprobs: null,
        finish_reason: ollamaResponse.done_reason || 'stop'
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count || 0,
        completion_tokens: ollamaResponse.eval_count || 0,
        total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
      }
    };
  }

  /**
   * Convert Ollama embedding response to OpenAI embedding response format
   */
  static toOpenAIEmbeddingResponse(ollamaResponse: any, model: string): z.infer<typeof OpenAI.OpenAIEmbeddingResponse> {
    // Handle both single and multiple embeddings
    const embeddings = Array.isArray(ollamaResponse.embeddings) 
      ? ollamaResponse.embeddings 
      : [ollamaResponse.embedding];

    return {
      object: 'list',
      data: embeddings.map((embedding: number[], index: number) => ({
        object: 'embedding',
        embedding,
        index
      })),
      model,
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count || 0,
        total_tokens: ollamaResponse.prompt_eval_count || 0
      }
    };
  }

  /**
   * Convert Ollama model list to OpenAI model list format
   */
  static toOpenAIModelList(ollamaModels: any): z.infer<typeof OpenAI.OpenAIListModelsResponse> {
    return {
      object: 'list',
      data: ollamaModels.models.map((model: any) => ({
        id: model.name,
        object: 'model',
        created: Math.floor(new Date(model.modified_at).getTime() / 1000),
        owned_by: 'ollama'
      }))
    };
  }

  /**
   * Convert streaming response format
   */
  static toOpenAIStreamingResponse(ollamaResponse: any, type: 'chat' | 'completion'): any {
    if (type === 'chat') {
      return {
        id: 'chat-' + Date.now(),
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: ollamaResponse.model,
        done: ollamaResponse.done,
        choices: [{
          delta: {
            role: 'assistant',
            content: ollamaResponse.message?.content || ollamaResponse.response || ''
          },
          index: 0,
          finish_reason: ollamaResponse.done ? 'stop' : null
        }]
      };
    } else {
      return {
        id: 'cmpl-' + Date.now(),
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: ollamaResponse.model,
        done: ollamaResponse.done,
        choices: [{
          text: ollamaResponse.response || '',
          index: 0,
          logprobs: null,
          finish_reason: ollamaResponse.done ? 'stop' : null
        }]
      };
    }
  }
} 