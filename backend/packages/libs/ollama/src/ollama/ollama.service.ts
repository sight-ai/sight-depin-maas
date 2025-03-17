import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { OllamaRepository } from './ollama.repository'; // 引入刚刚创建的 Repository
import { DatabaseTransactionConnection } from "slonik";
import { z } from 'zod';
import crypto from 'crypto'
export class DefaultOllamaService implements OllamaService {

  constructor(
    @Inject(OllamaRepository)
    private readonly OllamaRepository: OllamaRepository,
    @Inject(MinerService)
    private readonly minerService: MinerService,
  ) { }

  async complete(args: ModelOfOllama<'generate_request'>, res: Response) {
    const task = await this.minerService.createTask({
      model: args.model,
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
    let chatId = crypto.randomUUID()
    await this.createChatRecord({
      chatId: chatId,
      userId: '2',
      userInput: args.prompt,
      aiResponse: '',
      status: 'active',
      task_id: task.id
    })
    let msg = ''
    try {
      const stream = got.stream(`${process.env['OLLAMA_API_URL']}api/generate`, {
        method: 'POST',
        json: args,
      });

      stream.on('data', async (chunk) => {
        const part = JSON.parse(chunk.toString());
        console.log(part)
        if (!part.done) {
          msg += part.response;
        }

        res.write(`${JSON.stringify({ ...part, response: part.done ? msg + part.response : msg })}\n\n`);

        if (part.done) {
          await this.minerService.updateTask(task.id, {
            status: 'succeed',
            total_duration: part.total_duration,
            load_duration: part.load_duration,
            prompt_eval_count: part.prompt_eval_count,
            prompt_eval_duration: part.prompt_eval_duration,
            eval_count: part.eval_count,
            eval_duration: part.eval_duration
          });
          await this.createChatRecord({
            chatId: chatId,
            userId: '2',
            userInput: args.prompt,
            aiResponse:  msg + part.response,
            status: 'active',
            task_id: task.id.toString()
          })
        }
      });

      stream.on('end', async (data: any) => {
        res.write('event: end\n\n');
        res.end();
      });

      stream.on('error', async (error) => {
        await this.minerService.updateTask(task.id, { status: 'failed' });
        res.status(500).send('Error while processing stream');
        res.end();
      });
    } catch (error) {
      await this.minerService.updateTask(task.id, {
        status: 'failed'
      });
      throw error;
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
    return this.OllamaRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.OllamaRepository.updateChatRecord(conn, chatId, userId, userInput, aiResponse, status, task_id);
    });
  }
  async findChatRecord(chatId: string): Promise<{
    userId: string,
    userInput: string,
    aiResponse: string,
    status: "active" | "archived",
  } | null> {
    return this.OllamaRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.OllamaRepository.findChatRecord(conn, chatId);
    });
  }


  async checkStatus(): Promise<boolean> {
    try {
      const response = await got.post(`${process.env['OLLAMA_API_URL']}api/generate`, {
        timeout: {
          request: 20000,
          connect: 2000,
          response: 18000,
        },
        json: { "model": process.env['OLLAMA_MODEL'] }
      }).json();
      console.log(response)
      console.log(true)
      return !!response;
    } catch {
      console.log(false)
      return false;
    }
  }
}

const OpenaiServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OpenaiServiceProvider;
