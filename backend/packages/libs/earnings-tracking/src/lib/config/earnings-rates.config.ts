import { Injectable, Logger } from '@nestjs/common';
import { EarningsRate, SupportedEndpoints, FrameworkCapabilities, ConfigSummary } from '../earnings-tracking.types';

/**
 * 收益费率配置服务
 * 
 * 管理不同框架和任务类型的收益费率配置
 */
@Injectable()
export class EarningsRatesConfig {
  private readonly logger = new Logger(EarningsRatesConfig.name);

  /**
   * 收益费率配置
   * 按框架和任务类型分类
   */
  private readonly earningsRates: Record<string, Record<string, EarningsRate>> = {
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
   * 获取收益费率
   */
  getEarningsRate(framework: string, taskType: string): EarningsRate {
    const frameworkRates = this.earningsRates[framework];
    
    if (!frameworkRates) {
      this.logger.warn(`Unknown framework: ${framework}, using default rates`);
      return this.getDefaultEarningsRate();
    }

    const taskRates = frameworkRates[taskType];
    
    if (!taskRates) {
      this.logger.warn(`Unknown task type: ${taskType} for framework: ${framework}, using default rates`);
      return this.getDefaultEarningsRate();
    }

    return taskRates;
  }

  /**
   * 获取支持的端点列表
   */
  getSupportedEndpoints(): SupportedEndpoints {
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
   * 获取框架能力信息
   */
  getFrameworkCapabilities(): Record<string, FrameworkCapabilities> {
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
   * 验证端点是否支持收益跟踪
   */
  isTrackableEndpoint(url: string): boolean {
    const supportedEndpoints = this.getSupportedEndpoints();
    const allEndpoints = [
      ...supportedEndpoints.ollama,
      ...supportedEndpoints.vllm,
      ...supportedEndpoints.openai
    ];
    
    return allEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): ConfigSummary {
    const allRates = Object.values(this.earningsRates).flatMap(framework =>
      Object.values(framework)
    );

    const inputRates = allRates.map(rate => rate.input);
    const outputRates = allRates.map(rate => rate.output);

    return {
      frameworks: Object.keys(this.earningsRates),
      taskTypes: this.getAllTaskTypes(),
      totalEndpoints: this.getTotalEndpointsCount(),
      rateRanges: {
        inputMin: Math.min(...inputRates),
        inputMax: Math.max(...inputRates),
        outputMin: Math.min(...outputRates),
        outputMax: Math.max(...outputRates)
      }
    };
  }

  /**
   * 获取所有支持的框架
   */
  getSupportedFrameworks(): string[] {
    return Object.keys(this.earningsRates);
  }

  /**
   * 获取框架支持的任务类型
   */
  getFrameworkTaskTypes(framework: string): string[] {
    const frameworkRates = this.earningsRates[framework];
    return frameworkRates ? Object.keys(frameworkRates) : [];
  }

  /**
   * 更新费率配置（用于动态配置）
   */
  updateEarningsRate(framework: string, taskType: string, rate: EarningsRate): void {
    if (!this.earningsRates[framework]) {
      this.earningsRates[framework] = {};
    }
    
    this.earningsRates[framework][taskType] = rate;
    this.logger.log(`Updated earnings rate for ${framework}/${taskType}: ${JSON.stringify(rate)}`);
  }

  /**
   * 获取默认收益费率
   */
  private getDefaultEarningsRate(): EarningsRate {
    return { input: 0.001, output: 0.002, base: 0.01 };
  }

  /**
   * 获取所有任务类型
   */
  private getAllTaskTypes(): string[] {
    const taskTypes = new Set<string>();
    Object.values(this.earningsRates).forEach(framework => {
      Object.keys(framework).forEach(taskType => taskTypes.add(taskType));
    });
    return Array.from(taskTypes);
  }

  /**
   * 获取总端点数量
   */
  private getTotalEndpointsCount(): number {
    const supportedEndpoints = this.getSupportedEndpoints();
    return supportedEndpoints.ollama.length + 
           supportedEndpoints.vllm.length + 
           supportedEndpoints.openai.length;
  }
}
