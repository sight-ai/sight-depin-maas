import { z } from 'zod';
import { OpenAI } from '@saito/models';
import { DeepSeek } from '@saito/models';

export class ModelAdapter {
  /**
   * 将OpenAI聊天参数转换为Ollama聊天参数
   */
  static fromOpenAIChatParams(params: z.infer<typeof OpenAI.OpenAIChatParams>): z.infer<typeof OpenAI.OllamaChatParams> {
    const { 
      model, 
      messages, 
      temperature, 
      top_p, 
      max_tokens, 
      stop, 
      stream,
      presence_penalty,
      frequency_penalty,
      logit_bias,
      user,
      response_format,
      tools,
      tool_choice
    } = params;
    
    const options: z.infer<typeof OpenAI.OllamaOptions> = {};
    
    // 基本参数映射
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    
    // OpenAI特有参数的处理
    // 注意：presence_penalty, frequency_penalty, logit_bias 在Ollama中没有直接对应
    // tools 和 tool_choice 在Ollama中不支持
    
    return {
      model,
      messages,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined
    };
  }

  /**
   * 将OpenAI补全参数转换为Ollama补全参数
   */
  static fromOpenAICompletionParams(params: z.infer<typeof OpenAI.OpenAICompletionParams>): z.infer<typeof OpenAI.OllamaCompletionParams> {
    const { 
      model, 
      prompt, 
      temperature, 
      top_p, 
      max_tokens, 
      stop, 
      stream,
      suffix,
      n,
      logprobs,
      echo,
      presence_penalty,
      frequency_penalty,
      best_of,
      logit_bias,
      user
    } = params;
    
    const options: z.infer<typeof OpenAI.OllamaOptions> = {};
    
    // 基本参数映射
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    
    // OpenAI特有参数的处理
    // 注意：n, logprobs, echo, presence_penalty, frequency_penalty, best_of, logit_bias 在Ollama中没有直接对应
    
    return {
      model,
      prompt,
      suffix,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined
    };
  }

  /**
   * 将OpenAI嵌入参数转换为Ollama嵌入参数
   */
  static fromOpenAIEmbeddingParams(params: z.infer<typeof OpenAI.OpenAIEmbeddingParams>): z.infer<typeof OpenAI.OllamaEmbeddingParams> {
    const { model, input, encoding_format, user } = params;
    
    return {
      model,
      input,
      options: {
        truncate: true
      }
    };
  }

  /**
   * 将Ollama聊天响应转换为OpenAI聊天响应
   */
  static toOpenAIChatResponse(ollamaResponse: any): z.infer<typeof OpenAI.OpenAIChatResponse> {
    return {
      id: '', // Ollama不提供ID
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      system_fingerprint: null,
      service_tier: "default",
      model: ollamaResponse.model,
      choices: [{
        delta: {
          role: 'assistant',
          content: ollamaResponse.message.content || '',
          refusal: null
        },
        logprobs: null,
        finish_reason: null
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count,
        completion_tokens: ollamaResponse.eval_count,
        total_tokens: ollamaResponse.prompt_eval_count + ollamaResponse.eval_count
      }
    };
  }

  /**
   * 将Ollama补全响应转换为OpenAI补全响应
   */
  static toOpenAICompletionResponse(ollamaResponse: any): z.infer<typeof OpenAI.OpenAICompletionResponse> {
    return {
      id: '', // Ollama不提供ID
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: ollamaResponse.model,
      choices: [{
        text: ollamaResponse.response || '',
        index: 0,
        logprobs: null,
        finish_reason: ollamaResponse.done ? 'stop' : 'length'
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count,
        completion_tokens: ollamaResponse.eval_count,
        total_tokens: ollamaResponse.prompt_eval_count + ollamaResponse.eval_count
      }
    };
  }

  /**
   * 将Ollama嵌入响应转换为OpenAI嵌入响应
   */
  static toOpenAIEmbeddingResponse(ollamaResponse: z.infer<typeof OpenAI.OllamaEmbeddingResponse>, model: string): z.infer<typeof OpenAI.OpenAIEmbeddingResponse> {
    return {
      object: 'list',
      data: ollamaResponse.embeddings.map((embedding: number[], index: number) => ({
        object: 'embedding',
        embedding,
        index
      })),
      model,
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count ?? 0,
        total_tokens: ollamaResponse.prompt_eval_count ?? 0
      }
    };
  }

  /**
   * 将通用聊天参数转换为Ollama聊天参数
   */
  static toOllamaChatParams(params: z.infer<typeof OpenAI.ChatParams>): z.infer<typeof OpenAI.OllamaChatParams> {
    const { model, temperature, top_p, max_tokens, stop, stream, messages } = params;
    
    const options: z.infer<typeof OpenAI.OllamaOptions> = {};
    
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    
    return {
      model,
      messages,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined
    };
  }

  /**
   * 将通用补全参数转换为Ollama补全参数
   */
  static toOllamaCompletionParams(params: z.infer<typeof OpenAI.CompletionParams>): z.infer<typeof OpenAI.OllamaCompletionParams> {
    const { model, temperature, top_p, max_tokens, stop, stream, prompt, suffix } = params;
    
    const options: z.infer<typeof OpenAI.OllamaOptions> = {};
    
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    
    return {
      model,
      prompt,
      suffix,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined
    };
  }

  /**
   * 将通用嵌入参数转换为Ollama嵌入参数
   */
  static toOllamaEmbeddingParams(params: z.infer<typeof OpenAI.EmbeddingParams>): z.infer<typeof OpenAI.OllamaEmbeddingParams> {
    const { model, input } = params;
    
    return {
      model,
      input,
      options: {
        truncate: true
      }
    };
  }

  /**
   * 将DeepSeek聊天参数转换为Ollama聊天参数
   */
  static fromDeepSeekChatParams(params: z.infer<typeof DeepSeek.DeepSeekChatParams>): z.infer<typeof DeepSeek.OllamaChatParams> {
    const { 
      model, 
      messages, 
      temperature, 
      top_p, 
      max_tokens, 
      stop, 
      stream,
      presence_penalty,
      frequency_penalty,
      logit_bias,
      user,
      response_format,
      tools,
      tool_choice
    } = params;
    
    const options: z.infer<typeof DeepSeek.OllamaOptions> = {};
    
    // 基本参数映射
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    
    // DeepSeek特有参数的处理
    // 注意：presence_penalty, frequency_penalty, logit_bias 在Ollama中没有直接对应
    // tools 和 tool_choice 在Ollama中不支持
    
    return {
      model,
      messages,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined
    };
  }

  /**
   * 将DeepSeek补全参数转换为Ollama补全参数
   */
  static fromDeepSeekCompletionParams(params: z.infer<typeof DeepSeek.DeepSeekCompletionParams>): z.infer<typeof DeepSeek.OllamaCompletionParams> {
    const { 
      model, 
      prompt, 
      temperature, 
      top_p, 
      max_tokens, 
      stop, 
      stream,
      suffix,
      n,
      logprobs,
      echo,
      presence_penalty,
      frequency_penalty,
      best_of,
      logit_bias,
      user
    } = params;
    
    const options: z.infer<typeof DeepSeek.OllamaOptions> = {};
    
    // 基本参数映射
    if (temperature !== undefined) options.temperature = temperature;
    if (top_p !== undefined) options.top_p = top_p;
    if (max_tokens !== undefined) options.num_predict = max_tokens;
    if (stop !== undefined) options.stop = stop;
    
    // DeepSeek特有参数的处理
    // 注意：n, logprobs, echo, presence_penalty, frequency_penalty, best_of, logit_bias 在Ollama中没有直接对应
    
    return {
      model,
      prompt,
      suffix,
      stream,
      options: Object.keys(options).length > 0 ? options : undefined
    };
  }

  /**
   * 将DeepSeek嵌入参数转换为Ollama嵌入参数
   */
  static fromDeepSeekEmbeddingParams(params: z.infer<typeof DeepSeek.DeepSeekEmbeddingParams>): z.infer<typeof DeepSeek.OllamaEmbeddingParams> {
    const { model, input, encoding_format, user } = params;
    
    return {
      model,
      input,
      options: {
        truncate: true
      }
    };
  }

  /**
   * 将Ollama聊天响应转换为DeepSeek聊天响应
   */
  static toDeepSeekChatResponse(ollamaResponse: any): z.infer<typeof DeepSeek.DeepSeekChatResponse> {
    return {
      id: '', // Ollama不提供ID
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: ollamaResponse.model,
      choices: [{
        message: {
          role: 'assistant',
          content: ollamaResponse.response || ''
        },
        index: 0,
        finish_reason: ollamaResponse.done ? 'stop' : 'length'
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count,
        completion_tokens: ollamaResponse.eval_count,
        total_tokens: ollamaResponse.prompt_eval_count + ollamaResponse.eval_count
      }
    };
  }

  /**
   * 将Ollama补全响应转换为DeepSeek补全响应
   */
  static toDeepSeekCompletionResponse(ollamaResponse: any): z.infer<typeof DeepSeek.DeepSeekCompletionResponse> {
    return {
      id: '', // Ollama不提供ID
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: ollamaResponse.model,
      choices: [{
        text: ollamaResponse.response || '',
        index: 0,
        logprobs: null,
        finish_reason: ollamaResponse.done ? 'stop' : 'length'
      }],
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count,
        completion_tokens: ollamaResponse.eval_count,
        total_tokens: ollamaResponse.prompt_eval_count + ollamaResponse.eval_count
      }
    };
  }

  /**
   * 将Ollama嵌入响应转换为DeepSeek嵌入响应
   */
  static toDeepSeekEmbeddingResponse(ollamaResponse: z.infer<typeof DeepSeek.OllamaEmbeddingResponse>, model: string): z.infer<typeof DeepSeek.DeepSeekEmbeddingResponse> {
    return {
      object: 'list',
      data: ollamaResponse.embeddings.map((embedding: number[], index: number) => ({
        object: 'embedding',
        embedding,
        index
      })),
      model,
      usage: {
        prompt_tokens: ollamaResponse.prompt_eval_count ?? 0,
        total_tokens: ollamaResponse.prompt_eval_count ?? 0
      }
    };
  }
} 