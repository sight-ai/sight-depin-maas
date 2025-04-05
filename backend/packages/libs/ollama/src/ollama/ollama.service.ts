import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { OllamaRepository } from './ollama.repository';
import { DatabaseTransactionConnection } from "slonik";
import path from 'path';
import * as R from 'ramda';
import { SQL } from "@saito/common";
import { z } from "zod";

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
  ) { }

  private async createTask(model: string) {
    return this.minerService.createTask({
      model: model,
      status: 'in-progress',
      total_duration: 0,
      load_duration: 0,
      prompt_eval_count: 0,
      prompt_eval_duration: 0,
      eval_count: 0,
      eval_duration: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  private async updateTask(taskId: string, taskData: Partial<TaskData> & { status: 'succeed' | 'failed' }) {
    const { status, ...rest } = taskData;
    const taskDataWithDefaults = R.map(x => x || 0, rest);
    await this.minerService.updateTask(
      taskId,
      R.mergeRight({ status: status }, taskDataWithDefaults)
    );
  }

  private async handleStream(stream: any, res: Response, taskId: string, isChat: boolean) {
    let msg: any = isChat ? { role: '', content: '' } : '';

    stream.on('data', async (chunk: any) => {
      try {
        try {
          console.log(chunk.toString())
          const part = JSON.parse(chunk.toString());
          if (isChat) {
            if (part instanceof Object) {
              res.write(`${JSON.stringify({ ...part })}\n\n`);
            }
          } else {
            if (!part.done) {
              msg += part.response;
            }
            if (part instanceof Object) {
              res.write(`${JSON.stringify({ ...part })}\n\n`);
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
            await this.updateTask(taskId, { ...taskData, status: 'succeed' as 'succeed' });

            // 创建 earnings 记录
            const blockRewards = Math.floor(Math.random() * 100) + 1;
            const jobRewards = (part.prompt_eval_count || 0) + (part.eval_count || 0);
            await this.minerService.createEarnings(blockRewards, jobRewards);

            res.end();
          }
        } catch (error) {
          console.error(error)
        }
      } catch (err) {
        console.error('JSON parsing error:', err);
        res.end();
      }
    });

    stream.on('error', async (error: any) => {
      await this.updateTask(taskId, { status: 'failed' });
      if (!res.headersSent) {
        res.status(500).json({ error: error });
      }
      res.end();
    });
  }

  private async handleNonStream(args: any, res: Response, taskId: string, endpoint: string) {
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
    await this.minerService.createEarnings(blockRewards, jobRewards);
    res.status(200).json(response);
  }

  async complete(args: ModelOfOllama<'generate_request'>, res: Response) {
    if (args.stream === undefined || args.stream === null) {
      args.stream = true
    }
    const taskId = (await this.createTask(args.model)).id;

    try {
      if (args.stream) {
        const url = new URL(`api/generate`, this.baseUrl);
        const stream = got.stream(url.toString(), {
          method: 'POST',
          json: args,
        });
        if (args.stream) {
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.flushHeaders();
        }
        await this.handleStream(stream, res, taskId, false);
      } else {
        await this.handleNonStream(args, res, taskId, 'generate');
      }
    } catch (error) {
      await this.updateTask(taskId, { status: 'failed' });
      res.status(500).json({ error: error });
    }
  }

  async chat(args: ModelOfOllama<'chat_request'>, res: Response) {
    if (args.stream === undefined || args.stream === null) {
      args.stream = true
    }
    const taskId = (await this.createTask(args.model)).id;

    try {
      if (args.stream) {
        const url = new URL(`api/chat`, this.baseUrl);
        const stream = got.stream(url.toString(), {
          method: 'POST',
          json: {
            ...args,
          },
        });
        if (args.stream) {
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.flushHeaders();
        }

        stream.on('data', (chunk) => {
          res.write(chunk);
        });

        stream.on('end', async () => {
          await this.updateTask(taskId, { status: 'succeed' });
          res.end();
        });

        stream.on('error', async (err) => {
          await this.updateTask(taskId, { status: 'failed' });
          // optionally log `err` or do more error handling
          res.end();
        });

        // await this.handleStream(stream, res, taskId, true);
      } else {
        await this.handleNonStream(args, res, taskId, 'chat');
      }
    } catch (error) {
      await this.updateTask(taskId, { status: 'failed' });
      res.status(500).json({ error: error });
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
      console.log(response);
      console.log(true);
      return !!response;
    } catch {
      console.log(false);
      return false;
    }
  }

  async listModel(): Promise<ModelOfOllama<'list_model_response'>> {
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
}

const OllamaServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OllamaServiceProvider;
