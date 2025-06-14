import { Injectable, Logger } from '@nestjs/common';
import { FrameworkDetector } from '../detectors/framework.detector';
import { TaskTypeDetector } from '../detectors/task-type.detector';
import { EarningsCalculator } from '../calculators/earnings.calculator';
import { EarningsRatesConfig } from '../config/earnings-rates.config';
import {
  EarningsRate,
  EarningsCalculationResult,
  SupportedEndpoints,
  FrameworkCapabilities,
  ConfigSummary
} from '../earnings-tracking.types';

/**
 * 收益配置服务
 *
 * 整合各个组件，提供统一的收益配置和计算接口
 * 遵循单一职责原则，每个组件负责特定功能
 */
@Injectable()
export class EarningsConfigService {
  private readonly logger = new Logger(EarningsConfigService.name);

  constructor(
    private readonly frameworkDetector: FrameworkDetector,
    private readonly taskTypeDetector: TaskTypeDetector,
    private readonly earningsCalculator: EarningsCalculator,
    private readonly earningsRatesConfig: EarningsRatesConfig
  ) {}

  /**
   * 获取任务类型
   */
  getTaskType(url: string): string {
    return this.taskTypeDetector.detectTaskType(url);
  }

  /**
   * 检测框架类型
   */
  getFramework(url: string): string {
    return this.frameworkDetector.detectFramework(url);
  }

  /**
   * 获取收益费率
   */
  getEarningsRate(framework: string, taskType: string): EarningsRate {
    return this.earningsRatesConfig.getEarningsRate(framework, taskType);
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
  ): EarningsCalculationResult {
    const rate = this.getEarningsRate(framework, taskType);
    return this.earningsCalculator.calculateEarnings(rate, inputTokens, outputTokens, duration);
  }

  /**
   * 获取支持的端点列表
   */
  getSupportedEndpoints(): SupportedEndpoints {
    return this.earningsRatesConfig.getSupportedEndpoints();
  }

  /**
   * 验证端点是否支持收益跟踪
   */
  isTrackableEndpoint(url: string): boolean {
    return this.earningsRatesConfig.isTrackableEndpoint(url);
  }

  /**
   * 获取框架能力信息
   */
  getFrameworkCapabilities(): Record<string, FrameworkCapabilities> {
    return this.earningsRatesConfig.getFrameworkCapabilities();
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): ConfigSummary {
    return this.earningsRatesConfig.getConfigSummary();
  }

  /**
   * 获取所有支持的框架
   */
  getSupportedFrameworks(): string[] {
    return this.earningsRatesConfig.getSupportedFrameworks();
  }

  /**
   * 获取框架支持的任务类型
   */
  getFrameworkTaskTypes(framework: string): string[] {
    return this.earningsRatesConfig.getFrameworkTaskTypes(framework);
  }

  /**
   * 检查是否为聊天任务
   */
  isChatTask(url: string): boolean {
    return this.taskTypeDetector.isChatTask(url);
  }

  /**
   * 检查是否为生成任务
   */
  isGenerateTask(url: string): boolean {
    return this.taskTypeDetector.isGenerateTask(url);
  }

  /**
   * 检查是否为嵌入任务
   */
  isEmbeddingsTask(url: string): boolean {
    return this.taskTypeDetector.isEmbeddingsTask(url);
  }

  /**
   * 检查是否为Ollama框架
   */
  isOllamaFramework(url: string): boolean {
    return this.frameworkDetector.isOllamaFramework(url);
  }

  /**
   * 检查是否为vLLM框架
   */
  isVllmFramework(url: string): boolean {
    return this.frameworkDetector.isVllmFramework(url);
  }

  /**
   * 检查是否为OpenAI兼容端点
   */
  isOpenAICompatible(url: string): boolean {
    return this.frameworkDetector.isOpenAICompatible(url);
  }
}
