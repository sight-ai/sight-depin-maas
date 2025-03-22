import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';
import { Response } from 'express';
import { OllamaRepository } from './ollama.repository';
import { DatabaseTransactionConnection } from "slonik";
import crypto from 'crypto'
import path from 'path';
export class DefaultOllamaService implements OllamaService {

  private readonly baseUrl = env().OLLAMA_API_URL;
  private readonly logger = new Logger(DefaultOllamaService.name);

  constructor(
    @Inject(OllamaRepository)
    private readonly OllamaRepository: OllamaRepository,
    @Inject(MinerService)
    private readonly minerService: MinerService,
  ) {


  }

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
    
    try {
      if (args.stream) {
        let msg = '';
        const stream = got.stream(`${env().OLLAMA_API_URL}api/generate`, {
          method: 'POST',
          json: args,
        });

        stream.on('data', async (chunk) => {
          const part = JSON.parse(chunk.toString());
          console.log(part);
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
              aiResponse: msg + part.response,
              status: 'active',
              task_id: task.id.toString()
            });
          }
        });

        stream.on('end', async () => {
          res.write('event: end\n\n');
          res.end();
        });

        stream.on('error', async (error) => {
          await this.minerService.updateTask(task.id, { status: 'failed' });
          res.status(500).send('Error while processing stream');
          res.end();
        });
      } else {
        // Handle non-streaming response
        const response: {
          total_duration: number,
          load_duration: number,
          prompt_eval_count: number,
          prompt_eval_duration: number,
          eval_count: number,
          eval_duration: number,
          response: string
        } = await got.post(`${env().OLLAMA_API_URL}api/generate`, {
          json: { ...args, stream: false },
        }).json();
        
        await this.minerService.updateTask(task.id, {
          status: 'succeed',
          total_duration: response.total_duration || 0,
          load_duration: response.load_duration || 0,
          prompt_eval_count: response.prompt_eval_count || 0,
          prompt_eval_duration: response.prompt_eval_duration || 0,
          eval_count: response.eval_count || 0,
          eval_duration: response.eval_duration || 0
        });
        
        await this.createChatRecord({
          chatId: chatId,
          userId: '2',
          userInput: args.prompt,
          aiResponse: response.response,
          status: 'active',
          task_id: task.id.toString()
        });
        
        res.json(response);
      }
    } catch (error) {
      await this.minerService.updateTask(task.id, {
        status: 'failed'
      });
      throw error;
    }
  }

  async chat(args: ModelOfOllama<'chat_request'>, res: Response) {
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
      updated_at: new Date().toISOString(),
    });

    const chatId = crypto.randomUUID();

    if (args.messages instanceof Array) {
      await this.createChatRecord({
        chatId,
        userId: '2',
        userInput: JSON.stringify(args.messages),
        aiResponse: '',
        status: 'active',
        task_id: task.id,
      });
    } else {
      await this.createChatRecord({
        chatId,
        userId: '2',
        userInput: args.messages || '',
        aiResponse: '',
        status: 'active',
        task_id: task.id,
      });
    }
    try {
      if (args.stream) {
        let msg = {
          role: '',
          content: ''
        };
        
        const stream = got.stream(`${env().OLLAMA_API_URL}api/chat`, {
          method: 'POST',
          json: {
            model: args.model,
            messages: args.messages,
            stream: true,
          },
        });

        stream.on('data', async (chunk) => {
          try {
            const part = JSON.parse(chunk.toString());
            console.log(part);
            msg.role = part.message.role;
            if (part.message) msg.content += part.message.content;

            res.write(`${JSON.stringify({ ...part, message: msg })}\n\n`);

            if (part.done) {
              await this.minerService.updateTask(task.id, {
                status: 'succeed',
                total_duration: part.total_duration,
                load_duration: part.load_duration,
                prompt_eval_count: part.prompt_eval_count,
                prompt_eval_duration: part.prompt_eval_duration,
                eval_count: part.eval_count,
                eval_duration: part.eval_duration,
              });
              
              if (args.messages instanceof Array) {
                args.messages.push(msg);
              }
              
              await this.createChatRecord({
                chatId,
                userId: '2',
                userInput: JSON.stringify(args.messages),
                aiResponse: JSON.stringify(args.messages),
                status: 'archived',
                task_id: task.id.toString(),
              });

              res.end();
            }
          } catch (err) {
            console.error('JSON parsing error:', err);
            res.end();
          }
        });

        stream.on('error', async (error) => {
          console.error('Stream error:', error);
          await this.minerService.updateTask(task.id, { status: 'failed' });
          res.status(500).json({ error: 'Error while processing stream' });
        });
      } else {
        const response: {
          total_duration: number,
          load_duration: number,
          prompt_eval_count: number,
          prompt_eval_duration: number,
          eval_count: number,
          eval_duration: number,
          message: {
            role: string,
            content: string
          }
        }= await got.post(`${env().OLLAMA_API_URL}api/chat`, {
          json: {
            model: args.model,
            messages: args.messages,
            stream: false,
          },
        }).json();
        
        await this.minerService.updateTask(task.id, {
          status: 'succeed',
          total_duration: response.total_duration || 0,
          load_duration: response.load_duration || 0,
          prompt_eval_count: response.prompt_eval_count || 0,
          prompt_eval_duration: response.prompt_eval_duration || 0,
          eval_count: response.eval_count || 0,
          eval_duration: response.eval_duration || 0
        });
        
        if (args.messages instanceof Array) {
          args.messages.push(response.message);
        }
        
        await this.createChatRecord({
          chatId,
          userId: '2',
          userInput: JSON.stringify(args.messages),
          aiResponse: JSON.stringify(args.messages),
          status: 'archived',
          task_id: task.id.toString(),
        });
        
        res.json(response);
      }
    } catch (error) {
      console.error('Request error:', error);
      await this.minerService.updateTask(task.id, { status: 'failed' });
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
      const response = await got.post(`${env().OLLAMA_API_URL}api/generate`, {
        timeout: {
          request: 20000,
          connect: 2000,
          response: 18000,
        },
        json: { "model": env().OLLAMA_MODEL }
      }).json();
      console.log(response)
      console.log(true)
      return !!response;
    } catch {
      console.log(false)
      return false;
    }
  }

  async listModel(): Promise<ModelOfOllama<'list_model_response'>> {
    const response = await got.get(
      path.join(this.baseUrl, 'api/tags')).json();
    const parseResult =  m.ollama('list_model_response').safeParse(response);
    if (parseResult.success) {
      return parseResult.data;
    } else {
      this.logger.error(`failed to parse list model response: ${parseResult.error}`);
      return {models: []}
    }
  }
}

const OllamaServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OllamaServiceProvider;
