import { env } from '../env';
import { OllamaService } from './ollama.interface';
import { ModelOfOllama, m } from "@saito/models";
import { Inject, Logger } from "@nestjs/common";
import got from 'got-cjs';
import { MinerService } from '@saito/miner';

export class DefaultOllamaService implements OllamaService {

  private readonly logger = new Logger(OllamaService.name);

  // TODO: make it load from env
  private readonly apiUrl = 'http://localhost:11434/api/generate';

  constructor(
    @Inject(MinerService)
    private readonly minerService: MinerService,
  ) {}

  async complete(args: ModelOfOllama<'generate_request'>): Promise<ModelOfOllama<'generate_response'>> {
    // 创建任务记录
    const task = await this.minerService.createTask({
      model: args.model
    });

    try {
      const response = await got.post(this.apiUrl, {
        json: args,
      }).json();

      const data = m.ollama('generate_response').parse(response);
      
      // 更新任务状态和统计信息
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
      // 更新任务失败状态
      await this.minerService.updateTask(task.id, {
        status: 'failed'
      });
      throw error;
    }
  }
}

const OpenaiServiceProvider = {
  provide: OllamaService,
  useClass: DefaultOllamaService,
};

export default OpenaiServiceProvider;
