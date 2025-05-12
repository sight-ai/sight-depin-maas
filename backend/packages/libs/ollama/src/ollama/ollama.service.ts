import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { Inject, Injectable } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { DeviceStatusService } from '@saito/device-status';
import { z } from 'zod';
import { BaseModelService } from './base-model.service';
import {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OllamaModelList,
  OllamaModelInfo,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaRunningModels,
  OllamaVersionResponse,
  OpenAICompletionRequest,
  OpenAIChatCompletionRequest
} from '@saito/models';

// Default timeout values
const DEFAULT_REQUEST_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;

@Injectable()
export class DefaultOllamaService extends BaseModelService implements OllamaService {
  private readonly baseUrl = env().OLLAMA_API_URL;

  constructor(
    @Inject(MinerService)
    protected override readonly minerService: MinerService,
    @Inject(DeviceStatusService)
    protected override readonly deviceStatusService: DeviceStatusService
  ) {
    super('ollama', DefaultOllamaService.name, minerService, deviceStatusService);
    this.logger.log(`Initialized OllamaService with baseUrl: ${this.baseUrl}`);
  }

  /**
   * 处理流式响应
   */
  private async handleStream(stream: any, res: Response, taskId: string, endpoint: string = '') {
    let hasReceivedData = false;
    const streamTimeout = setTimeout(() => {
      if (!hasReceivedData) {
        stream.destroy(new Error('Stream timeout: No data received'));
      }
    }, 10000);

    // Check if this is an OpenAI format request
    const isOpenAIFormat = endpoint.includes('openai') || endpoint.includes('v1');

    stream.on('data', async (chunk: any) => {
      try {
        hasReceivedData = true;
        const chunkStr = chunk.toString();
        this.logger.debug(`Received stream data: ${chunkStr}`);

        // For OpenAI format, we need to handle the SSE format differently
        if (isOpenAIFormat) {
          // If it's already in SSE format (starts with "data: "), pass it through
          if (chunkStr.startsWith('data: ')) {
            res.write(chunkStr);
            return;
          }

          // Otherwise, try to parse and convert to OpenAI format
          try {
            const part = JSON.parse(chunkStr);

            // If this is the final chunk (done=true), add token usage information
            if (part.done) {
              // Create a final message with token usage information
              const finalMessage = {
                id: part.id || `chatcmpl-${Date.now()}`,
                object: part.object || "chat.completion.chunk",
                created: part.created || Math.floor(Date.now() / 1000),
                model: part.model || "unknown",
                system_fingerprint: part.system_fingerprint || "fp_ollama",
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: "stop"
                  }
                ],
                usage: {
                  prompt_tokens: part.prompt_eval_count || 0,
                  completion_tokens: part.eval_count || 0,
                  total_tokens: (part.prompt_eval_count || 0) + (part.eval_count || 0)
                }
              };

              // Write the final message with usage information
              res.write(`data: ${JSON.stringify(finalMessage)}\n\n`);
              // Write the [DONE] marker
              res.write('data: [DONE]\n\n');
              res.end();
            } else {
              // For non-final chunks, just pass through
              res.write(`data: ${JSON.stringify(part)}\n\n`);
            }
          } catch (parseError) {
            this.logger.warn(`Failed to parse OpenAI format chunk: ${parseError}`);
            // If parsing fails, just pass through the chunk
            res.write(chunkStr);
          }
        } else {
          // Regular Ollama format
          try {
            const part = JSON.parse(chunkStr);
            res.write(chunk);

            if (part.done) {
              clearTimeout(streamTimeout);
              await this.updateTask(taskId, {
                status: 'completed',
                total_duration: part.total_duration ?? null,
                load_duration: part.load_duration ?? null,
                prompt_eval_count: part.prompt_eval_count ?? null,
                prompt_eval_duration: part.prompt_eval_duration ?? null,
                eval_count: part.eval_count ?? null,
                eval_duration: part.eval_duration ?? null
              });
              await this.createEarnings(taskId, part, part.device_id);
              res.end()
            }
          } catch (parseError) {
            this.logger.warn(`Failed to parse Ollama format chunk: ${parseError}`);
            // For Ollama format, we still need to write the chunk even if parsing fails
            res.write(chunk);
          }
        }
      } catch (err) {
        this.logger.warn(`Error processing stream chunk: ${err}`);
      }
    });

    stream.on('error', async (error: any) => {
      clearTimeout(streamTimeout);
      await this.updateTask(taskId, { status: 'failed' });

      if (!res.headersSent) {
        res.status(400).json({
          error: error.message || 'Stream error occurred',
          model: 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }

      if (!res.writableEnded) res.end();
    });

    stream.on('end', () => {
      clearTimeout(streamTimeout);
      if (!res.writableEnded) res.end();
    });
  }

  /**
   * 处理非流式响应
   */
  private async handleNonStream(args: any, res: Response, taskId: string, endpoint: string) {
    let retries = 0;

    const attemptRequest = async (): Promise<void> => {
      try {
        const url = new URL(`api/${endpoint}`, this.baseUrl);
        const response = await got.post(url.toString(), {
          json: { ...args },
          responseType: 'json',
          timeout: { request: DEFAULT_REQUEST_TIMEOUT },
          retry: { limit: 0 }
        });

        const responseBody = response.body as any;

        await this.updateTask(taskId, {
          status: 'completed',
          total_duration: responseBody.total_duration ?? null,
          load_duration: responseBody.load_duration ?? null,
          prompt_eval_count: responseBody.prompt_eval_count ?? null,
          prompt_eval_duration: responseBody.prompt_eval_duration ?? null,
          eval_count: responseBody.eval_count ?? null,
          eval_duration: responseBody.eval_duration ?? null
        });

        await this.createEarnings(taskId, responseBody);

        if (!res.headersSent) {
          // Check if this is an OpenAI format request
          const isOpenAIFormat = endpoint.includes('openai') || endpoint.includes('v1');

          if (isOpenAIFormat) {
            // For OpenAI format, ensure we include token usage information
            const openAIResponse = {
              id: responseBody.id || `chatcmpl-${Date.now()}`,
              object: responseBody.object || (endpoint.includes('chat') ? 'chat.completion' : 'text_completion'),
              created: responseBody.created || Math.floor(Date.now() / 1000),
              model: responseBody.model || args.model || 'unknown',
              system_fingerprint: responseBody.system_fingerprint || "fp_ollama",
              choices: responseBody.choices || [
                {
                  index: 0,
                  message: {
                    role: responseBody.message?.role || 'assistant',
                    content: responseBody.message?.content || responseBody.response || '',
                  },
                  finish_reason: 'stop',
                }
              ],
              usage: {
                prompt_tokens: responseBody.prompt_eval_count || 0,
                completion_tokens: responseBody.eval_count || 0,
                total_tokens: (responseBody.prompt_eval_count || 0) + (responseBody.eval_count || 0)
              }
            };

            res.status(200).json(openAIResponse);
          } else {
            // For Ollama format, return the original response
            res.status(200).json(responseBody);
          }
        }
      } catch (error: any) {
        if (retries < MAX_RETRIES && this.isRetryableError(error)) {
          retries++;
          const backoffTime = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return attemptRequest();
        }

        await this.updateTask(taskId, { status: 'failed' });
        this.handleErrorResponse(error, res, args?.model);
      }
    };

    await attemptRequest();
  }

  /**
   * 处理模型请求的通用方法
   */
  private async handleModelRequest(args: any, res: Response, endpoint: string): Promise<void> {
    const processedArgs = { ...args, stream: args.stream !== false };

    try {
      // 检查服务是否可用
      if (!await this.checkStatus()) {
        if (!res.headersSent) {
          res.status(400).json({
            error: 'Ollama service is not available',
            model: processedArgs.model,
            created_at: new Date().toISOString(),
            done: true
          });
        }
        return;
      }

      // 创建任务
      const task = await this.createTask(processedArgs.model, processedArgs.task_id, processedArgs.device_id);
      await this.updateTask(task.id, { status: 'running' });
      this.logger.log(`Created task with ID: ${task.id} for model: ${processedArgs.model} stream: ${processedArgs.stream}`);
      // 处理请求
      if (processedArgs.stream) {
        // Ensure we have the correct URL format
        const url = new URL(endpoint, this.baseUrl);

        this.logger.debug(`Streaming request to ${url.toString()} with endpoint ${endpoint}`);
        res.status(200);

        const stream = got.stream(url.toString(), {
          method: 'POST',
          json: processedArgs,
          timeout: { request: DEFAULT_REQUEST_TIMEOUT }
        });

        await this.handleStream(stream, res, task.id, endpoint);
      } else {
        await this.handleNonStream(processedArgs, res, task.id, endpoint);
      }
    } catch (error: any) {
      this.logger.error(`Error in ${endpoint} request:`, error);
      this.handleErrorResponse(error, res, args.model);
    }
  }

  /**
   * 文本生成请求
   */
  async complete(args: z.infer<typeof OllamaGenerateRequest | typeof OpenAICompletionRequest>, res: Response, pathname = 'api/generate'): Promise<void> {
    // Process OpenAI-specific parameters if needed
    const processedArgs = { ...args };

    // Log the request type
    this.logger.debug(`Complete request with pathname: ${pathname}`);

    await this.handleModelRequest(processedArgs, res, pathname);
  }

  /**
   * 聊天请求
   */
  async chat(args: z.infer<typeof OllamaChatRequest | typeof OpenAIChatCompletionRequest>, res: Response, pathname = 'api/chat'): Promise<void> {
    // Process OpenAI-specific parameters if needed
    const processedArgs = { ...args };

    // Log the request type
    this.logger.debug(`Chat request with pathname: ${pathname}`);

    await this.handleModelRequest(processedArgs, res, pathname);
  }

  /**
   * 检查服务状态
   */
  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL('api/version', this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: { request: 5000 },
        retry: { limit: 0 }
      });
      return response.statusCode === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取API响应的通用方法
   */
  private async getApiResponse<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any, defaultValue?: T): Promise<T> {
    try {
      const url = new URL(`api/${endpoint}`, this.baseUrl);
      const options = {
        timeout: { request: DEFAULT_REQUEST_TIMEOUT },
        retry: { limit: MAX_RETRIES }
      };

      if (method === 'GET') {
        return await got.get(url.toString(), options).json();
      } else {
        return await got.post(url.toString(), {
          ...options,
          json: data
        }).json();
      }
    } catch (error) {
      this.logger.error(`Failed to get ${endpoint}:`, error);
      return defaultValue as T;
    }
  }

  /**
   * 获取模型标签
   */
  async listModelTags(): Promise<z.infer<typeof OllamaModelList>> {
    return this.getApiResponse<z.infer<typeof OllamaModelList>>('tags', 'GET', null, { models: [] });
  }

  /**
   * 获取模型信息
   */
  async showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>> {
    return this.getApiResponse<z.infer<typeof OllamaModelInfo>>('show', 'POST', args, {
      template: '',
      parameters: '',
      modelfile: '',
      details: {
        format: '',
        parent_model: '',
        family: '',
        families: [],
        parameter_size: '',
        quantization_level: ''
      },
      model_info: {},
    });
  }

  /**
   * 获取模型版本
   */
  async showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>> {
    return this.getApiResponse<z.infer<typeof OllamaVersionResponse>>('version', 'GET', null, { version: 'unknown' });
  }

  /**
   * 获取模型列表
   */
  async listModels(): Promise<z.infer<typeof OllamaModelList>> {
    return this.listModelTags();
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbeddings(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>> {
    const response = await this.getApiResponse<z.infer<typeof OllamaEmbeddingsResponse>>('embeddings', 'POST', args);
    if (!response) {
      throw new Error('Failed to generate embeddings');
    }
    return response;
  }

  /**
   * 获取运行中的模型列表
   */
  async listRunningModels(): Promise<z.infer<typeof OllamaRunningModels>> {
    return this.getApiResponse<z.infer<typeof OllamaRunningModels>>('running', 'GET', null, { models: [] });
  }
}

const OllamaServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OllamaServiceProvider;
export { OllamaService };
