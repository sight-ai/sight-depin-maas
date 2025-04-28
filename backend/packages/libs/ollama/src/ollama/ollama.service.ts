import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { Inject, Injectable } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { DeviceStatusService } from '@saito/device-status';
import { z } from 'zod';
import * as R from 'ramda';
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
    protected override readonly minerService: MinerService,
    @Inject(DeviceStatusService)
    protected override readonly deviceStatusService: DeviceStatusService
  ) {
    super('ollama', DefaultOllamaService.name, minerService, deviceStatusService);
    this.logger.log(`Initialized OllamaService with baseUrl: ${this.baseUrl}`);
  }

  protected async handleStream(stream: any, res: Response, taskId: string, isChat: boolean) {
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

  protected async handleNonStream(args: any, res: Response, taskId: string, endpoint: string) {
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
        
        const responseBody = ollResponse.body as {
          total_duration?: number;
          load_duration?: number;
          prompt_eval_count?: number;
          prompt_eval_duration?: number;
          eval_count?: number;
          eval_duration?: number;
        };
        
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
        this.handleErrorResponse(error, res, args?.model);
      }
    };
    
    await attemptRequest();
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
      await this.updateTask(taskId, { status: 'running' });
      
      try {
        if (processedArgs.stream) {
          const url = new URL('api/generate', this.baseUrl);
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
        this.handleErrorResponse(error, res, processedArgs.model);
      }
    } catch (error: any) {
      this.logger.error('Error in complete request:', error);
      this.handleErrorResponse(error, res, args.model);
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
      await this.updateTask(taskId, { status: 'running' });
      
      try {
        if (processedArgs.stream) {
          const url = new URL('api/chat', this.baseUrl);
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
        this.handleErrorResponse(error, res, processedArgs.model);
      }
    } catch (error: any) {
      this.logger.error('Error in chat request:', error);
      this.handleErrorResponse(error, res, args.model);
    }
  }

  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL('api/version', this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: 0
        }
      });
      
      return response.statusCode === 200;
    } catch (error) {
      this.logger.error('Failed to check Ollama status:', error);
      return false;
    }
  }

  async listModelTags(): Promise<z.infer<typeof OllamaModelList>> {
    try {
      const url = new URL('api/tags', this.baseUrl);
      return await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
    } catch (error) {
      this.logger.error('Failed to list model tags:', error);
      return { models: [] };
    }
  }

  async showModelInformation(args: { name: string }): Promise<z.infer<typeof OllamaModelInfo>> {
    try {
      const url = new URL('api/show', this.baseUrl);
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
      this.logger.error('Failed to show model information:', error);
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
      };
    }
  }

  async showModelVersion(): Promise<z.infer<typeof OllamaVersionResponse>> {
    try {
      const url = new URL('api/version', this.baseUrl);
      return await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
    } catch (error) {
      this.logger.error('Failed to show model version:', error);
      return { version: 'unknown' };
    }
  }

  async listModels(): Promise<z.infer<typeof OllamaModelList>> {
    return this.listModelTags();
  }

  async generateEmbeddings(args: z.infer<typeof OllamaEmbeddingsRequest>): Promise<z.infer<typeof OllamaEmbeddingsResponse>> {
    try {
      const url = new URL('api/embeddings', this.baseUrl);
      const response = await got.post(url.toString(), {
        json: args,
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json<z.infer<typeof OllamaEmbeddingsResponse>>();

      return {
        model: response.model,
        embeddings: response.embeddings,
      };
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async listRunningModels(): Promise<z.infer<typeof OllamaRunningModels>> {
    try {
      const url = new URL('api/running', this.baseUrl);
      return await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
    } catch (error) {
      this.logger.error('Failed to list running models:', error);
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
