import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m, TaskData } from "@saito/models";
import { Inject, Injectable, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { OllamaRepository } from './ollama.repository';
import * as R from 'ramda';
import { DeviceStatusService } from '@saito/device-status';

// Extract common task data fields
const extractTaskData = R.pick([
  'total_duration',
  'load_duration',
  'prompt_eval_count',
  'prompt_eval_duration',
  'eval_count',
  'eval_duration',
]);

// Default timeout values
const DEFAULT_REQUEST_TIMEOUT = 60000; // 60 seconds
const STATUS_CHECK_TIMEOUT = 2000; // 2 seconds
const MAX_RETRIES = 3;

@Injectable()
export class DefaultOllamaService implements OllamaService {
  private readonly baseUrl = env().OLLAMA_API_URL;
  private readonly logger = new Logger(DefaultOllamaService.name);

  constructor(
    @Inject(OllamaRepository)
    private readonly ollamaRepository: OllamaRepository,
    @Inject(MinerService)
    private readonly minerService: MinerService,
    @Inject('DEVICE_STATUS_SERVICE')
    private readonly deviceStatusService: DeviceStatusService,
  ) {
    this.logger.log(`Initialized OllamaService with baseUrl: ${this.baseUrl}`);
  }

  private async createTask(model: string, taskId: string, device_id: string) {
    this.logger.log(`Creating task for model: ${model}, taskId: ${taskId}`);
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

  private async updateTask(taskId: string, taskData: Partial<TaskData> & { status: 'succeed' | 'failed' }) {
    this.logger.debug(`Updating task ${taskId} with status: ${taskData.status}`);
    try {
      const { status, ...rest } = taskData;
      const taskDataWithDefaults = R.map(R.defaultTo(0), rest);
      await this.minerService.updateTask(
        taskId,
        R.mergeRight({ status: status }, taskDataWithDefaults)
      );
    } catch (error) {
      this.logger.error(`Failed to update task ${taskId}`, error);
      // Don't rethrow error to avoid breaking the chain
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
          const taskData = extractTaskData(part);
          await this.updateTask(taskId, { ...taskData, status: 'succeed' });
          await this.createEarnings(taskId, part, part.device_id);
        }
      } catch (err) {
        this.logger.warn(`Error processing stream chunk for task ${taskId}:`, err);
        // Don't end the stream here, just log the error and continue
      }
    });

    stream.on('error', async (error: any) => {
      clearTimeout(streamErrorTimeout);
      this.logger.error(`Stream error for task ${taskId}:`, error);
      await this.updateTask(taskId, { status: 'failed' });
      
      if (!res.headersSent) {
        // Use status code 400 for errors
        res.status(400).json({ 
          error: error.message || 'Stream error occurred',
          model: isChat ? 'unknown' : 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }
      
      // Only end the response if it hasn't been ended already
      if (!res.writableEnded) {
        res.end();
      }
    });

    stream.on('end', () => {
      clearTimeout(streamErrorTimeout);
      this.logger.debug(`Stream ended for task ${taskId}`);
      
      // Only end the response if it hasn't been ended already
      if (!res.writableEnded) {
        res.end();
      }
    });
  }

  private async createEarnings(taskId: string, responseData: any, device_id: string) {
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
            limit: 0 // We'll handle retries ourselves
          }
        });
        
        const responseBody = ollResponse.body as any;
        const taskData = extractTaskData(responseBody);

        await this.updateTask(taskId, { ...taskData, status: 'succeed' });
        await this.createEarnings(taskId, responseBody, args.device_id);
        
        // Return success with 200 status code
        if (!res.headersSent) {
          res.status(200).json(responseBody);
        }
      } catch (error: any) {
        // Handle retry logic
        if (retries < MAX_RETRIES && this.isRetryableError(error)) {
          retries++;
          const backoffTime = Math.pow(2, retries) * 1000; // Exponential backoff
          this.logger.warn(`Retrying request for task ${taskId} (attempt ${retries}/${MAX_RETRIES}) after ${backoffTime}ms`);
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return attemptRequest();
        }
        
        // Max retries reached or non-retryable error
        await this.updateTask(taskId, { status: 'failed' });
        
        // Return error with 400 status code
        if (!res.headersSent) {
          const errorBody = R.pathOr({ error: error.message || 'Unknown error' }, ['response', 'body'], error);
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

  async complete(args: ModelOfOllama<'generate_request'>, res: Response): Promise<void> {
    // Make sure args always has all the required fields
    const processedArgs = R.mergeRight({ stream: true }, args);
    
    try {
      // Check if Ollama service is available
      const isAvailable = await this.checkStatus();
      if (!isAvailable) {
        // Service unavailable returns 400 status code
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

      try {
        if (processedArgs.stream) {
          const url = new URL(`api/generate`, this.baseUrl);
          
          // Start with 200 status code for streaming
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
        
        // Return error with 400 status code
        if (!res.headersSent) {
          const errorBody = R.pathOr({ error: error.message || 'Unknown error' }, ['response', 'body'], error);
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
      // Task creation failed returns 400 status code
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

  async chat(args: ModelOfOllama<'chat_request'>, res: Response): Promise<void> {
    // Make sure args always has all the required fields
    const processedArgs = R.mergeRight({ stream: true }, args);
    
    try {
      // Check if Ollama service is available
      const isAvailable = await this.checkStatus();
      if (!isAvailable) {
        // Service unavailable returns 400 status code
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
        const isUnloadRequest = this.isModelUnloadRequest(processedArgs);
        
        if (isUnloadRequest) {
          await this.handleModelUnload(processedArgs, res, taskId);
        } else if (processedArgs.stream && !isUnloadRequest) {
          const url = new URL(`api/chat`, this.baseUrl);
          
          // Start with 200 status code for streaming
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
        
        // Return error with 400 status code
        if (!res.headersSent) {
          const errorBody = R.pathOr({ error: error.message || 'Unknown error' }, ['response', 'body'], error);
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
      // Task creation failed returns 400 status code
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

  private isModelUnloadRequest(args: ModelOfOllama<'chat_request'>): boolean {
    return R.both(
      R.pathSatisfies(arr => Array.isArray(arr) && arr.length === 0, ['messages']),
      R.pathSatisfies(val => val !== undefined && Number(val) === 0, ['keep_alive'])
    )(args);
  }

  private async handleModelUnload(args: ModelOfOllama<'chat_request'>, res: Response, taskId: string): Promise<void> {
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
      
      // Ensure all required fields exist with defaults for task data
      const modifiedResponse = R.mergeDeepRight(responseBody, {
        done: true,
        model: args.model,
        created_at: responseBody.created_at || new Date().toISOString(),
        done_reason: responseBody.done_reason || 'unload',
        total_duration: 0,
        load_duration: 0,
        prompt_eval_count: 0, 
        prompt_eval_duration: 0,
        eval_count: 0,
        eval_duration: 0
      });
      
      const taskData = extractTaskData(modifiedResponse) as TaskData;

      await this.updateTask(taskId, { ...taskData, status: 'succeed' });
      await this.createEarnings(taskId, modifiedResponse, args.device_id);
      
      this.logger.log('Model unload response:', modifiedResponse);
      if (!res.headersSent) {
        res.status(200).json(modifiedResponse);
      }
    } catch (error) {
      this.logger.error('Error during unload model request:', error);
      
      await this.updateTask(taskId, { status: 'failed' });
      
      // Even if unload fails, return a proper error response
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

  async listModelTags(): Promise<ModelOfOllama<'list_model_response'>> {
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
      
      const parseResult = m.ollama('list_model_response').safeParse(response);
      
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

  async showModelInformation(args: ModelOfOllama<'show_model_request'>): Promise<any> {
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
      return { error: 'Failed to retrieve model information' };
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

  async listModels(): Promise<ModelOfOllama<'list_model_response'>> {
    try {
      const url = new URL(`api/models`, this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: {
          request: DEFAULT_REQUEST_TIMEOUT
        },
        retry: {
          limit: MAX_RETRIES
        }
      }).json();
      
      const parseResult = m.ollama('list_model_response').safeParse(response);
      
      return parseResult.success 
        ? parseResult.data 
        : this.handleParseError('list models response', parseResult.error, { models: [] });
    } catch (error) {
      this.logger.error(`Failed to list models: ${error}`);
      return { models: [] };
    }
  }

  async generateEmbeddings(args: ModelOfOllama<'embed_request'>): Promise<ModelOfOllama<'embed_response'>> {
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
      
      const parseResult = m.ollama('embed_response').safeParse(response);
      
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

  async listRunningModels(): Promise<ModelOfOllama<'list_running_models_response'>> {
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
      
      const parseResult = m.ollama('list_running_models_response').safeParse(response);
      
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
