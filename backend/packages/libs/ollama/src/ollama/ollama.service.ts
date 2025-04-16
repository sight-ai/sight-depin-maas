import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { OllamaRepository } from './ollama.repository';
import { DatabaseTransactionConnection } from "slonik";
import * as R from 'ramda';
import { v4 as uuid } from 'uuid';
import { DeviceStatusService } from '@saito/device-status';

interface TaskData {
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export class DefaultOllamaService implements OllamaService {

  private readonly baseUrl = env().OLLAMA_API_URL;
  private readonly logger = new Logger(DefaultOllamaService.name);

  constructor(
    @Inject(OllamaRepository)
    private readonly OllamaRepository: OllamaRepository,
    @Inject(MinerService)
    private readonly minerService: MinerService,
    @Inject('DEVICE_STATUS_SERVICE')
    private readonly deviceStatusService: DeviceStatusService,
  ) { }

  private async createTask(model: string, taskId?: string) {
    this.logger.log('createTask', model, taskId);
    const deviceId = await this.deviceStatusService.getDeviceId();
    return this.minerService.createTask({
      id: taskId || uuid(),
      model: model,
      status: 'in-progress',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      device_id: deviceId
    });
  }

  private async updateTask(taskId: string, taskData: Partial<TaskData> & { status: 'succeed' | 'failed' }) {
    this.logger.log('updateTask', taskId, taskData);
    const { status, ...rest } = taskData;
    const taskDataWithDefaults = R.map(x => x || 0, rest);
    await this.minerService.updateTask(
      taskId,
      R.mergeRight({ status: status }, taskDataWithDefaults)
    );
  }

  private async handleStream(stream: any, res: Response, taskId: string, isChat: boolean) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.flushHeaders();

    stream.on('data', async (chunk: any) => {
      try {
        const part = JSON.parse(chunk.toString());
        if (isChat) {
          if (part instanceof Object) {
            res.write(chunk);
          }
        } else {
          if (part instanceof Object) {
            res.write(chunk);
          }
        }

        if (part.done) {
          const taskData = R.pick([
            'total_duration',
            'load_duration',
            'prompt_eval_count',
            'prompt_eval_duration',
            'eval_count',
            'eval_duration',
          ], part);
          await this.updateTask(taskId, { ...taskData, status: 'succeed' });

          // 创建 earnings 记录
          const blockRewards = Math.floor(Math.random() * 100) + 1;
          const jobRewards = (part.prompt_eval_count || 0) + (part.eval_count || 0);
          const deviceId = await this.deviceStatusService.getDeviceId();
          await this.minerService.createEarnings(blockRewards, jobRewards, deviceId);
        }
      } catch (err) {
        // console.error('JSON parsing error:', err);
        res.end();
      }
    });

    stream.on('error', async (error: any) => {
      await this.updateTask(taskId, { status: 'failed' });
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Unknown error' });
      }
      res.end();
    });

    stream.on('end', () => {
      res.end();
    });
  }

  private async handleNonStream(args: any, res: Response, taskId: string, endpoint: string) {
    try {
      const url = new URL(`api/${endpoint}`, this.baseUrl);
      const response: any = await got
        .post(url.toString(), {
          json: { ...args },
        })
        .json();

      const taskData = R.pick([
        'total_duration',
        'load_duration',
        'prompt_eval_count',
        'prompt_eval_duration',
        'eval_count',
        'eval_duration',
      ], response);

      await this.updateTask(taskId, { ...taskData, status: 'succeed' });
      // 创建 earnings 记录
      const blockRewards = Math.floor(Math.random() * 100) + 1;
      const jobRewards = (response.prompt_eval_count || 0) + (response.eval_count || 0);
      const deviceId = await this.deviceStatusService.getDeviceId();
      await this.minerService.createEarnings(blockRewards, jobRewards, deviceId);
      
      // Make sure we're setting the correct status code
      res.status(200).json(response);
    } catch (error: any) {
      await this.updateTask(taskId, { status: 'failed' });
      if (!res.headersSent) {
        res.status(error.response?.statusCode || 500).json(error.response?.body || { error: error.message || 'Unknown error' });
      }
    }
  }

  async complete(args: ModelOfOllama<'generate_request'>, res: Response) {
    if (args.stream === undefined || args.stream === null) {
      args.stream = true;
    }
    const taskId = (await this.createTask(args.model, args.taskId)).id;

    try {
      if (args.stream) {
        const url = new URL(`api/generate`, this.baseUrl);
        const stream = got.stream(url.toString(), {
          method: 'POST',
          json: args,
        });
        await this.handleStream(stream, res, taskId, false);
      } else {
        await this.handleNonStream(args, res, taskId, 'generate');
      }
    } catch (error: any) {
      await this.updateTask(taskId, { status: 'failed' });
      if (!res.headersSent) {
        res.status(error.response?.statusCode || 500).json(error.response?.body || { error: error.message || 'Unknown error' });
      }
    }
  }

  async chat(args: ModelOfOllama<'chat_request'>, res: Response) {
    if (args.stream === undefined || args.stream === null) {
      args.stream = true;
    }
    const taskId = (await this.createTask(args.model, args.taskId)).id;

    try {
      if (args.stream) {
        const url = new URL(`api/chat`, this.baseUrl);
        const stream = got.stream(url.toString(), {
          method: 'POST',
          json: {
            ...args,
          },
        });
        await this.handleStream(stream, res, taskId, true);
      } else {
        // Special case for unload model (empty messages with keep_alive=0)
        if (Array.isArray(args.messages) && args.messages.length === 0 && 
            args.keep_alive !== undefined && Number(args.keep_alive) === 0) {
          try {
            const url = new URL(`api/chat`, this.baseUrl);
            const response: any = await got
              .post(url.toString(), {
                json: { ...args },
              })
              .json();
            
            // Ensure done_reason is included in the response
            const modifiedResponse = {
              ...response,
              done: true,
              model: args.model,
              created_at: response.created_at || new Date().toISOString(),
              done_reason: response.done_reason || 'unload'
            };
            
            const taskData = R.pick([
              'total_duration',
              'load_duration',
              'prompt_eval_count',
              'prompt_eval_duration',
              'eval_count',
              'eval_duration',
            ], modifiedResponse);

            await this.updateTask(taskId, { ...taskData, status: 'succeed' });
            // 创建 earnings 记录
            const blockRewards = Math.floor(Math.random() * 100) + 1;
            const jobRewards = (response.prompt_eval_count || 0) + (response.eval_count || 0);
            const deviceId = await this.deviceStatusService.getDeviceId();
            await this.minerService.createEarnings(blockRewards, jobRewards, deviceId);
            
            this.logger.log('Unload model response:', modifiedResponse);
            res.status(200).json(modifiedResponse);
            return;
          } catch (error) {
            this.logger.error('Error during unload model request:', error);
            
            // If there's an error, return a fallback response
            const fallbackResponse = {
              model: args.model,
              created_at: new Date().toISOString(),
              response: '',
              done: true,
              done_reason: 'unload'
            };
            
            await this.updateTask(taskId, { status: 'succeed' });
            this.logger.log('Using fallback unload response:', fallbackResponse);
            res.status(200).json(fallbackResponse);
            return;
          }
        } else {
          await this.handleNonStream(args, res, taskId, 'chat');
        }
      }
    } catch (error: any) {
      await this.updateTask(taskId, { status: 'failed' });
      if (!res.headersSent) {
        res.status(error.response?.statusCode || 500).json(error.response?.body || { error: error.message || 'Unknown error' });
      }
    }
  }

  async createChatRecord(
    {
      chatId,
      userId,
      userInput,
      aiResponse,
      status,
      task_id
    }: {
      chatId: string,
      userId: string,
      userInput: string,
      aiResponse: string,
      status: "active" | "archived",
      task_id: string
    }
  ) {
    const updateChatRecord = async (conn: DatabaseTransactionConnection) => {
      return this.OllamaRepository.updateChatRecord(conn, chatId, userId, userInput, aiResponse, status, task_id);
    };

    return this.OllamaRepository.transaction(updateChatRecord);
  }

  async findChatRecord(chatId: string): Promise<{
    userId: string,
    userInput: string,
    aiResponse: string,
    status: "active" | "archived",
  } | null> {
    const findChatRecord = async (conn: DatabaseTransactionConnection) => {
      return this.OllamaRepository.findChatRecord(conn, chatId);
    };

    return this.OllamaRepository.transaction(findChatRecord);
  }

  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL(`api/generate`, this.baseUrl);
      const response = await got
        .post(url.toString(), {
          timeout: {
            request: 20000,
            connect: 2000,
            response: 18000,
          },
          json: { model: env().OLLAMA_MODEL },
        })
        .json();
      
      return !!response;
    } catch (error) {
      return false;
    }
  }

  async listModelTags(): Promise<ModelOfOllama<'list_model_response'>> {
    const url = new URL(`api/tags`, this.baseUrl);
    const response = await got
      .get(url.toString())
      .json();
    const parseResult = m.ollama('list_model_response').safeParse(response);
    if (parseResult.success) {
      return parseResult.data;
    } else {
      this.logger.error(
        `failed to parse list model response: ${parseResult.error}`
      );
      return { models: [] };
    }
  }

  async showModelInformation(args: ModelOfOllama<'show_model_request'>): Promise<any> {
    const url = new URL(`api/show`, this.baseUrl);
    const response = await got
      .post(url.toString(), {
        timeout: {
          request: 20000,
          connect: 2000,
          response: 18000,
        },
        json: args,
      })
      .json();
    return response;
  }

  async showModelVersion(): Promise<any> {
    const url = new URL(`api/version`, this.baseUrl);
    const response = await got
      .get(url.toString())
      .json();
    return response;
  }

  async listModels(): Promise<ModelOfOllama<'list_model_response'>> {
    const url = new URL(`api/models`, this.baseUrl);
    const response = await got
      .get(url.toString())
      .json();
    const parseResult = m.ollama('list_model_response').safeParse(response);
    if (parseResult.success) {
      return parseResult.data;
    } else {
      this.logger.error(
        `failed to parse list models response: ${parseResult.error}`
      );
      return { models: [] };
    }
  }

  async createModel(args: ModelOfOllama<'create_request'>): Promise<ModelOfOllama<'create_response'>> {
    const url = new URL(`api/create`, this.baseUrl);
    const response = await got
      .post(url.toString(), {
        json: args
      })
      .json();
    const parseResult = m.ollama('create_response').safeParse(response);
    if (parseResult.success) {
      return parseResult.data;
    } else {
      this.logger.error(
        `failed to parse create model response: ${parseResult.error}`
      );
      return { status: 'error' };
    }
  }

  async copyModel(args: ModelOfOllama<'copy_request'>): Promise<void> {
    const url = new URL(`api/copy`, this.baseUrl);
    await got
      .post(url.toString(), {
        json: args
      });
  }

  async deleteModel(args: ModelOfOllama<'delete_request'>): Promise<void> {
    const url = new URL(`api/delete`, this.baseUrl);
    await got
      .delete(url.toString(), {
        json: args
      });
  }

  async pullModel(args: ModelOfOllama<'pull_request'>, res: Response): Promise<void> {
    const url = new URL(`api/pull`, this.baseUrl);
    const stream = got.stream(url.toString(), {
      method: 'POST',
      json: args
    });

    stream.on('data', (chunk) => {
      res.write(chunk);
    });

    stream.on('end', () => {
      res.end();
    });

    stream.on('error', (err) => {
      res.status(500).json({ error: err });
      res.end();
    });
  }

  async pushModel(args: ModelOfOllama<'push_request'>, res: Response): Promise<void> {
    const url = new URL(`api/push`, this.baseUrl);
    const stream = got.stream(url.toString(), {
      method: 'POST',
      json: args
    });

    stream.on('data', (chunk) => {
      res.write(chunk);
    });

    stream.on('end', () => {
      res.end();
    });

    stream.on('error', (err) => {
      res.status(500).json({ error: err });
      res.end();
    });
  }

  async generateEmbeddings(args: ModelOfOllama<'embed_request'>): Promise<ModelOfOllama<'embed_response'>> {
    const url = new URL(`api/embed`, this.baseUrl);
    const response = await got
      .post(url.toString(), {
        json: args
      })
      .json();
    const parseResult = m.ollama('embed_response').safeParse(response);
    if (parseResult.success) {
      return parseResult.data;
    } else {
      this.logger.error(
        `failed to parse embeddings response: ${parseResult.error}`
      );
      return { model: args.model, embeddings: [] };
    }
  }

  async listRunningModels(): Promise<ModelOfOllama<'list_running_models_response'>> {
    const url = new URL(`api/ps`, this.baseUrl);
    const response = await got
      .get(url.toString())
      .json();
    const parseResult = m.ollama('list_running_models_response').safeParse(response);
    if (parseResult.success) {
      return parseResult.data;
    } else {
      this.logger.error(
        `failed to parse running models response: ${parseResult.error}`
      );
      return { models: [] };
    }
  }
}

const OllamaServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OllamaServiceProvider;
