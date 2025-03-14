import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';

export class DefaultOllamaService implements OllamaService {

  private readonly logger = new Logger(OllamaService.name);


  constructor(
    @Inject(MinerService)
    private readonly minerService: MinerService,
  ) {}

  async complete(args: ModelOfOllama<'generate_request'>): Promise<ModelOfOllama<'generate_response'>> {
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

    try {
      const response = await got.post(`${process.env['OLLAMA_API_URL']}api/generate`, {
        json: args,
      }).json();

      const data = m.ollama('generate_response').parse(response);
      
      await this.minerService.updateTask(task.id, {
        status: 'succeed',
        total_duration: data.total_duration,
        load_duration: data.load_duration,
        prompt_eval_count: data.prompt_eval_count,
        prompt_eval_duration: data.prompt_eval_duration,
        eval_count: data.eval_count,
        eval_duration: data.eval_duration
      });

      return data;
    } catch (error) {
      await this.minerService.updateTask(task.id, {
        status: 'failed'
      });
      throw error;
    }
  }

  
  async checkStatus(): Promise<boolean> {
    try {
      const response = await got.post(`${process.env['OLLAMA_API_URL']}api/generate`, {
        timeout: {
          request: 10000,
          connect: 2000, 
          response: 8000,
        },
        json: {"model": process.env['OLLAMA_MODEL']}
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
