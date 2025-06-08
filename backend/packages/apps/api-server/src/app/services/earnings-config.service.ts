import { Injectable, Logger } from '@nestjs/common';

/**
 * 收益配置服务
 * 
 * 管理不同框架和任务类型的收益费率配置
 */
@Injectable()
export class EarningsConfigService {
  private readonly logger = new Logger(EarningsConfigService.name);

  /**
   * 收益费率配置
   * 按框架和任务类型分类
   */
  private readonly earningsRates = {
    // Ollama 框架费率
    ollama: {
      // Ollama 原生风格
      chat: { input: 0.001, output: 0.002, base: 0.01 },
      generate: { input: 0.001, output: 0.002, base: 0.01 },
      embeddings: { input: 0.0005, output: 0, base: 0.005 },
      
      // OpenAI 兼容风格（通过 Ollama）
      'chat/completions': { input: 0.001, output: 0.002, base: 0.01 },
      'completions': { input: 0.001, output: 0.002, base: 0.01 }
    },
    
    // vLLM 框架费率（仅 OpenAI 风格）
    vllm: {
      'chat/completions': { input: 0.0015, output: 0.003, base: 0.015 },
      'completions': { input: 0.0015, output: 0.003, base: 0.015 },
      'embeddings': { input: 0.0008, output: 0, base: 0.008 }
    }
  };

  /**
   * 任务类型映射
   * 将 URL 路径映射到任务类型
   */
  private readonly taskTypeMapping = {
    // Ollama 原生端点
    '/api/chat': 'chat',
    '/api/generate': 'generate', 
    '/api/embeddings': 'embeddings',
    '/ollama/api/chat': 'chat',
    '/ollama/api/generate': 'generate',
    '/ollama/api/embeddings': 'embeddings',
    
    // OpenAI 兼容端点
    '/openai/chat/completions': 'chat/completions',
    '/openai/completions': 'completions',
    '/openai/embeddings': 'embeddings'
  };

  /**
   * 框架检测映射
   * 根据 URL 路径检测使用的框架
   */
  private readonly frameworkMapping = {
    // Ollama 端点
    '/api/': 'ollama',
    '/ollama/': 'ollama',
    
    // OpenAI 端点（需要根据环境变量判断实际框架）
    '/openai/': this.detectOpenAIFramework()
  };

  /**
   * 获取任务类型
   */
  getTaskType(url: string): string {
    for (const [path, taskType] of Object.entries(this.taskTypeMapping)) {
      if (url.includes(path)) {
        return taskType;
      }
    }
    return 'unknown';
  }

  /**
   * 检测框架类型
   */
  getFramework(url: string): string {
    // 直接的 Ollama 端点
    if (url.includes('/api/') || url.includes('/ollama/')) {
      return 'ollama';
    }
    
    // OpenAI 端点需要根据环境变量判断实际框架
    if (url.includes('/openai/')) {
      return this.detectOpenAIFramework();
    }
    
    return 'unknown';
  }

  /**
   * 获取收益费率
   */
  getEarningsRate(framework: string, taskType: string): {
    input: number;
    output: number;
    base: number;
  } {
    const frameworkRates = this.earningsRates[framework as keyof typeof this.earningsRates];
    
    if (!frameworkRates) {
      this.logger.warn(`Unknown framework: ${framework}, using default rates`);
      return { input: 0.001, output: 0.002, base: 0.01 };
    }

    const taskRates = frameworkRates[taskType as keyof typeof frameworkRates];
    
    if (!taskRates) {
      this.logger.warn(`Unknown task type: ${taskType} for framework: ${framework}, using default rates`);
      return { input: 0.001, output: 0.002, base: 0.01 };
    }

    return taskRates;
  }

  /**
   * 计算收益
   */
  calculateEarnings(
    framework: string,
    taskType: string,
    inputTokens: number,
    outputTokens: number,
    duration?: number
  ): {
    blockRewards: number;
    jobRewards: number;
    breakdown: {
      inputReward: number;
      outputReward: number;
      baseReward: number;
      durationBonus: number;
    };
  } {
    const rates = this.getEarningsRate(framework, taskType);
    
    // 基础收益计算
    const inputReward = inputTokens * rates.input;
    const outputReward = outputTokens * rates.output;
    const baseReward = rates.base;
    
    // 时长奖励（可选）
    let durationBonus = 0;
    if (duration && duration > 1000) { // 超过1秒的请求给予小额奖励
      durationBonus = Math.min(duration / 10000, 0.01); // 最多0.01奖励
    }
    
    const totalJobRewards = inputReward + outputReward + baseReward + durationBonus;

    return {
      blockRewards: 0, // 暂时不使用 block rewards
      jobRewards: totalJobRewards,
      breakdown: {
        inputReward,
        outputReward,
        baseReward,
        durationBonus
      }
    };
  }

  /**
   * 获取支持的端点列表
   */
  getSupportedEndpoints(): {
    ollama: string[];
    vllm: string[];
    openai: string[];
  } {
    return {
      ollama: [
        '/api/chat',
        '/api/generate', 
        '/api/embeddings',
        '/ollama/api/chat',
        '/ollama/api/generate',
        '/ollama/api/embeddings'
      ],
      vllm: [
        '/openai/chat/completions',
        '/openai/completions',
        '/openai/embeddings'
      ],
      openai: [
        '/openai/chat/completions',
        '/openai/completions', 
        '/openai/embeddings'
      ]
    };
  }

  /**
   * 验证端点是否支持收益跟踪
   */
  isTrackableEndpoint(url: string): boolean {
    const allEndpoints = [
      ...this.getSupportedEndpoints().ollama,
      ...this.getSupportedEndpoints().vllm,
      ...this.getSupportedEndpoints().openai
    ];
    
    return allEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * 获取框架能力信息
   */
  getFrameworkCapabilities(): {
    ollama: {
      supportedStyles: string[];
      endpoints: string[];
    };
    vllm: {
      supportedStyles: string[];
      endpoints: string[];
    };
  } {
    return {
      ollama: {
        supportedStyles: ['ollama', 'openai'],
        endpoints: [
          '/api/chat',
          '/api/generate',
          '/api/embeddings',
          '/openai/chat/completions', // 通过 Ollama 的 OpenAI 兼容层
          '/openai/completions'
        ]
      },
      vllm: {
        supportedStyles: ['openai'],
        endpoints: [
          '/openai/chat/completions',
          '/openai/completions',
          '/openai/embeddings'
        ]
      }
    };
  }

  /**
   * 检测 OpenAI 端点背后的实际框架
   */
  private detectOpenAIFramework(): string {
    // 根据环境变量判断当前使用的推理框架
    const framework = process.env['MODEL_INFERENCE_FRAMEWORK']?.toLowerCase();
    
    if (framework === 'ollama') {
      return 'ollama';
    } else if (framework === 'vllm') {
      return 'vllm';
    }
    
    // 默认假设是 vLLM（因为 vLLM 只支持 OpenAI 风格）
    return 'vllm';
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): {
    frameworks: string[];
    taskTypes: string[];
    totalEndpoints: number;
    rateRanges: {
      inputMin: number;
      inputMax: number;
      outputMin: number;
      outputMax: number;
    };
  } {
    const allRates = Object.values(this.earningsRates).flatMap(framework => 
      Object.values(framework)
    );
    
    const inputRates = allRates.map(rate => rate.input);
    const outputRates = allRates.map(rate => rate.output);

    return {
      frameworks: Object.keys(this.earningsRates),
      taskTypes: Object.values(this.taskTypeMapping),
      totalEndpoints: Object.keys(this.taskTypeMapping).length,
      rateRanges: {
        inputMin: Math.min(...inputRates),
        inputMax: Math.max(...inputRates),
        outputMin: Math.min(...outputRates),
        outputMax: Math.max(...outputRates)
      }
    };
  }
}
