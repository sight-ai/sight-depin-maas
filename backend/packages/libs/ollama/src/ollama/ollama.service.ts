import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { Inject, Injectable, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { OllamaRepository } from './ollama.repository';
import { DeviceStatusService } from '@saito/device-status';
import { z } from 'zod';
import * as R from 'ramda';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseModelService } from '@saito/models';
import { MODEL_EVENTS } from '@saito/tunnel';
import {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OllamaModelList,
  OllamaModelInfo,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaRunningModels,
  Task
} from '@saito/models';

// Default timeout values
const DEFAULT_REQUEST_TIMEOUT = 60000; // 60 seconds
const STATUS_CHECK_TIMEOUT = 2000; // 2 seconds
const MAX_RETRIES = 3;

@Injectable()
export class DefaultOllamaService extends BaseModelService implements OllamaService {
  private readonly baseUrl = env().OLLAMA_API_URL;

  constructor(
    @Inject(MinerService)
    private readonly minerService: MinerService,
    @Inject('DEVICE_STATUS_SERVICE')
    private readonly deviceStatusService: DeviceStatusService,
    eventEmitter: EventEmitter2
  ) {
    super(eventEmitter, 'ollama', DefaultOllamaService.name);
    this.logger.log(`Initialized OllamaService with baseUrl: ${this.baseUrl}`);
  }

  protected override async handleChatRequest(data: { taskId: string, data: any }): Promise<void> {
    await this.chat(data.data, this.createResponseHandler(data.taskId));
  }

  protected override async handleCompletionRequest(data: { taskId: string, data: any }): Promise<void> {
    await this.complete(data.data, this.createResponseHandler(data.taskId));
  }

  protected override async handleEmbeddingRequest(data: { taskId: string, data: any }): Promise<void> {
    const response = await this.generateEmbeddings(data.data);
    this.eventEmitter.emit(MODEL_EVENTS.EMBEDDING_RESPONSE, {
      taskId: data.taskId,
      content: response
    });
  }

  protected override createResponseHandler(taskId: string): Response {
    const response = {
      write: (chunk: any) => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: chunk
        });
      },
      end: () => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: JSON.stringify({ done: true })
        });
      },
      status: (code: number) => response,
      json: (data: any) => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: JSON.stringify(data)
        });
        return response;
      },
      setHeader: () => response,
      headersSent: false,
      writableEnded: false,
      // 添加必要的属性
      sendStatus: () => response,
      links: () => response,
      send: () => response,
      jsonp: () => response,
      // 添加其他必要的属性
      ...Object.fromEntries(
        Array.from({ length: 87 }, (_, i) => [`prop${i}`, () => response])
      )
    } as unknown as Response;

    return response;
  }

  private async createTask(model: string, task_id?: string, device_id?: string) {
    this.logger.log(`Creating task for model: ${model}, taskId: ${task_id || 'new'}`);
    try {
      const deviceId = device_id || await this.deviceStatusService.getDeviceId();
      const task = await this.minerService.createTask({
        model: model,
        device_id: deviceId
      });
      
      this.logger.log(`Created task with ID: ${task.id} for model: ${model}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task for model: ${model}`, error);
      throw error;
    }
  }

  private async updateTask(taskId: string, taskData: Partial<z.infer<typeof Task>>) {
    this.logger.debug(`Updating task ${taskId} with status: ${taskData.status}`);
    try {
      await this.minerService.updateTask(taskId, {
        status: taskData.status,
        total_duration: taskData.total_duration ?? null,
        load_duration: taskData.load_duration ?? null,
        prompt_eval_count: taskData.prompt_eval_count ?? null,
        prompt_eval_duration: taskData.prompt_eval_duration ?? null,
        eval_count: taskData.eval_count ?? null,
        eval_duration: taskData.eval_duration ?? null
      });
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId}`, error);
    }
  }

  private async handleStream(stream: any, res: Response, taskId: string, isChat: boolean) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.flushHeaders();

    let hasReceivedData = false;

    const streamErrorTimeout = setTimeout(() => {
      if (!hasReceivedData) {
        this.logger.warn(`No data received for task ${taskId} after 10 seconds, closing stream`);
        stream.destroy(new Error('Stream timeout: No data received'));
      }
    }, 10000);

    stream.on('data', async (chunk: any) => {
      try {
        hasReceivedData = true;
        const part = JSON.parse(chunk.toString());
        if (part instanceof Object) {
          res.write(chunk);
        }

        if (part.done) {
          clearTimeout(streamErrorTimeout);
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
        }
      } catch (err) {
        this.logger.warn(`Error processing stream chunk for task ${taskId}:`, err);
      }
    });

    stream.on('error', async (error: any) => {
      clearTimeout(streamErrorTimeout);
      this.logger.error(`Stream error for task ${taskId}:`, error);
      await this.updateTask(taskId, { status: 'failed' });
      
      if (!res.headersSent) {
        res.status(400).json({ 
          error: error.message || 'Stream error occurred',
          model: isChat ? 'unknown' : 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }
      
      if (!res.writableEnded) {
        res.end();
      }
    });

    stream.on('end', () => {
      clearTimeout(streamErrorTimeout);
      this.logger.debug(`Stream ended for task ${taskId}`);
      
      if (!res.writableEnded) {
        res.end();
      }
    });
  }

  private async createEarnings(taskId: string, responseData: any, device_id?: string) {
    try {
      const blockRewards = Math.floor(Math.random() * 100) + 1;
      const jobRewards = R.sum([
        R.propOr(0, 'prompt_eval_count', responseData),
        R.propOr(0, 'eval_count', responseData)
      ]);
      const deviceId = device_id || await this.deviceStatusService.getDeviceId();
      
      await this.minerService.createEarnings(blockRewards, jobRewards, taskId, deviceId);
      this.logger.log(`Created earnings: block=${blockRewards}, job=${jobRewards} for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to create earnings for task ${taskId}:`, error);
      // Don't rethrow to prevent breaking the process
    }
  }

  private async handleNonStream(args: any, res: Response, taskId: string, endpoint: string) {
    let retries = 0;
    
    const attemptRequest = async (): Promise<void> => {
      try {
        const url = new URL(`api/${endpoint}`, this.baseUrl);
        
        this.logger.debug(`Making non-stream request to ${url.toString()} for task ${taskId}`);
        const ollResponse = await got.post(url.toString(), {
          json: { ...args },
          responseType: 'json' as const,
          timeout: {
            request: DEFAULT_REQUEST_TIMEOUT
          },
          retry: {
            limit: 0
          }
        });
        
        const responseBody = ollResponse.body as any;

        await this.updateTask(taskId, {
          status: 'completed',
          total_duration: responseBody.total_duration ?? null,
          load_duration: responseBody.load_duration ?? null,
          prompt_eval_count: responseBody.prompt_eval_count ?? null,
          prompt_eval_duration: responseBody.prompt_eval_duration ?? null,
          eval_count: responseBody.eval_count ?? null,
          eval_duration: responseBody.eval_duration ?? null
        });
        await this.createEarnings(taskId, responseBody, args.device_id);
        
        if (!res.headersSent) {
          res.status(200).json(responseBody);
        }
      } catch (error: any) {
        if (retries < MAX_RETRIES && this.isRetryableError(error)) {
          retries++;
          const backoffTime = Math.pow(2, retries) * 1000;
          this.logger.warn(`Retrying request for task ${taskId} (attempt ${retries}/${MAX_RETRIES}) after ${backoffTime}ms`);
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return attemptRequest();
        }
        
        await this.updateTask(taskId, { status: 'failed' });
        
        if (!res.headersSent) {
          const errorBody = error.response?.body || { error: error.message || 'Unknown error' };
          res.status(400).json({
            ...errorBody,
            model: args?.model || 'unknown',
            created_at: new Date().toISOString(),
            done: true
          });
        }
      }
    };
    
    await attemptRequest();
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeout errors, and 5xx server errors are retryable
    if (!error.response) return true; // Network error
    if (error.code === 'ETIMEDOUT') return true; // Timeout error
    if (error.response.statusCode >= 500) return true; // Server error
    
    return false;
  }

  async complete(args: z.infer<typeof OllamaGenerateRequest>, res: Response): Promise<void> {
    const processedArgs = R.mergeRight({ stream: true }, args);
    
    try {
      const isAvailable = await this.checkStatus();
      if (!isAvailable) {
        if (!res.headersSent) {
          this.logger.warn('Ollama service is not available for complete request');
          res.status(400).json({
            error: 'Ollama service is not available',
            model: processedArgs.model,
            created_at: new Date().toISOString(),
            done: true
          });
        }
        return;
      }

      const task = await this.createTask(processedArgs.model, processedArgs.task_id, processedArgs.device_id);
      const taskId = task.id;
      this.updateTask(taskId, { status: 'running' });
      try {
        if (processedArgs.stream) {
          const url = new URL(`api/generate`, this.baseUrl);
          res.status(200);
          
          const stream = got.stream(url.toString(), {
            method: 'POST',
            json: processedArgs,
            timeout: {
              request: DEFAULT_REQUEST_TIMEOUT
            }
          });
          await this.handleStream(stream, res, taskId, false);
        } else {
          await this.handleNonStream(processedArgs, res, taskId, 'generate');
        }
      } catch (error: any) {
        this.logger.error(`Error in complete request for task ${taskId}:`, error);
        await this.updateTask(taskId, { status: 'failed' });
        
        if (!res.headersSent) {
          const errorBody = error.response?.body || { error: error.message || 'Unknown error' };
          res.status(400).json({
            ...errorBody,
            model: processedArgs.model,
            created_at: new Date().toISOString(),
            done: true
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to create task for complete request:', error);
      if (!res.headersSent) {
        res.status(400).json({
          error: error.message || 'Failed to create task',
          model: processedArgs.model,
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  async chat(args: z.infer<typeof OllamaChatRequest>, res: Response): Promise<void> {
    const processedArgs = R.mergeRight({ stream: true }, args);
    
    try {
      const isAvailable = await this.checkStatus();
      if (!isAvailable) {
        if (!res.headersSent) {
          this.logger.warn('Ollama service is not available for chat request');
          res.status(400).json({
            error: 'Ollama service is not available',
            model: processedArgs.model,
            created_at: new Date().toISOString(),
            done: true
          });
        }
        return;
      }

      const task = await this.createTask(processedArgs.model, processedArgs.task_id, processedArgs.device_id);
      const taskId = task.id;

      try {
        if (processedArgs.stream) {
          const url = new URL(`api/chat`, this.baseUrl);
          res.status(200);
          
          const stream = got.stream(url.toString(), {
            method: 'POST',
            json: processedArgs,
            timeout: {
              request: DEFAULT_REQUEST_TIMEOUT
            }
          });
          await this.handleStream(stream, res, taskId, true);
        } else {
          await this.handleNonStream(processedArgs, res, taskId, 'chat');
        }
      } catch (error: any) {
        this.logger.error(`Error in chat request for task ${taskId}:`, error);
        await this.updateTask(taskId, { status: 'failed' });
        
        if (!res.headersSent) {
          const errorBody = error.response?.body || { error: error.message || 'Unknown error' };
          res.status(400).json({
            ...errorBody,
            model: processedArgs.model,
            created_at: new Date().toISOString(),
            done: true
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to create task for chat request:', error);
      if (!res.headersSent) {
        res.status(400).json({
          error: error.message || 'Failed to create task',
          model: processedArgs.model,
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  private isModelUnloadRequest(args: z.infer<typeof OllamaChatRequest>): boolean {
    return args.messages.length === 1 && args.messages[0].content === 'unload';
  }

  private async handleModelUnload(args: z.infer<typeof OllamaChatRequest>, res: Response, taskId: string): Promise<void> {
    try {
      const url = new URL(`api/chat`, this.baseUrl);
      this.logger.log(`Handling model unload request for model: ${args.model}, task: ${taskId}`);
      
      const ollResponse = await got.post(url.toString(), {
        json: { ...args },
        responseType: 'json',
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: 0
        }
      });
      
      const responseBody = ollResponse.body as any;
      
      await this.updateTask(taskId, {
        status: 'completed',
        total_duration: responseBody.total_duration ?? null,
        load_duration: responseBody.load_duration ?? null,
        prompt_eval_count: responseBody.prompt_eval_count ?? null,
        prompt_eval_duration: responseBody.prompt_eval_duration ?? null,
        eval_count: responseBody.eval_count ?? null,
        eval_duration: responseBody.eval_duration ?? null
      });
      await this.createEarnings(taskId, responseBody, args.device_id);
      
      this.logger.log('Model unload response:', responseBody);
      if (!res.headersSent) {
        res.status(200).json({
          ...responseBody,
          done: true,
          model: args.model,
          created_at: responseBody.created_at || new Date().toISOString(),
          done_reason: responseBody.done_reason || 'unload'
        });
      }
    } catch (error) {
      this.logger.error('Error during unload model request:', error);
      
      await this.updateTask(taskId, { status: 'failed' });
      
      if (!res.headersSent) {
        res.status(400).json({
          error: 'Failed to unload model',
          model: args.model,
          created_at: new Date().toISOString(),
          done: true,
          done_reason: 'error'
        });
      }
    }
  }

  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL(`api/version`, this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: STATUS_CHECK_TIMEOUT,
        },
        retry: {
          limit: 0
        }
      });
      
      return response.statusCode === 200;
    } catch (error: any) {
      this.logger.warn(`Ollama service unavailable: ${error.message}`);
      return false;
    }
  }

  async listModelTags(): Promise<z.infer<typeof OllamaModelList>> {
    try {
      const url = new URL(`api/tags`, this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
      const parseResult = OllamaModelList.safeParse(response);
      return parseResult.success 
        ? parseResult.data 
        : this.handleParseError('list model response', parseResult.error, { models: [] });
    } catch (error) {
      this.logger.error(`Failed to list model tags: ${error}`);
      return { models: [] };
    }
  }

  private handleParseError(context: string, error: any, defaultValue: any): any {
    this.logger.error(`Failed to parse ${context}: ${error}`);
    return defaultValue;
  }

  async showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>> {
    try {
      const url = new URL(`api/show`, this.baseUrl);
      return await got.post(url.toString(), {
        json: args,
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
    } catch (error) {
      this.logger.error(`Failed to show model information: ${error}`);
      return {
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
        capabilities: []
      };
    }
  }

  async showModelVersion(): Promise<any> {
    try {
      const url = new URL(`api/version`, this.baseUrl);
      return await got.get(url.toString(), {
        timeout: {
          request: STATUS_CHECK_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
    } catch (error) {
      this.logger.error(`Failed to show model version: ${error}`);
      return { version: 'unknown' };
    }
  }

  async listModels(): Promise<z.infer<typeof OllamaModelList>> {
    try {
      const url = new URL(`api/tags`, this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
      
      const parseResult = OllamaModelList.safeParse(response);
      
      return parseResult.success 
        ? parseResult.data 
        : this.handleParseError('list models response', parseResult.error, { models: [] });
    } catch (error) {
      this.logger.error(`Failed to list models: ${error}`);
      return { models: [] };
    }
  }

  async generateEmbeddings(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>> {
    try {
      const url = new URL(`api/embed`, this.baseUrl);
      const response = await got.post(url.toString(), { 
        json: args,
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
      
      const parseResult = OllamaEmbeddingsResponse.safeParse(response);
      
      return parseResult.success 
        ? parseResult.data 
        : this.handleParseError('embeddings response', parseResult.error, { 
            model: args.model, 
            embeddings: [] 
          });
    } catch (error) {
      this.logger.error(`Failed to generate embeddings: ${error}`);
      return { model: args.model, embeddings: [] };
    }
  }

  async listRunningModels(): Promise<z.infer<typeof OllamaRunningModels>> {
    try {
      const url = new URL(`api/ps`, this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
      
      const parseResult = OllamaRunningModels.safeParse(response);
      
      return parseResult.success 
        ? parseResult.data 
        : this.handleParseError('running models response', parseResult.error, { models: [] });
    } catch (error) {
      this.logger.error(`Failed to list running models: ${error}`);
      return { models: [] };
    }
  }
}

const OllamaServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OllamaServiceProvider;
export { OllamaService };
