import { Injectable, Logger } from '@nestjs/common';

/**
 * 框架检测器
 * 
 * 负责根据URL路径检测使用的推理框架
 */
@Injectable()
export class FrameworkDetector {
  private readonly logger = new Logger(FrameworkDetector.name);

  /**
   * 检测框架类型
   */
  detectFramework(url: string): string {
    // 直接的 Ollama 端点
    if (url.includes('/api/') || url.includes('/ollama/')) {
      return 'ollama';
    }
    
    // OpenAI 端点需要根据环境变量判断实际框架
    if (url.includes('/openai/')) {
      return this.detectOpenAIFramework();
    }
    
    this.logger.warn(`Unknown framework for URL: ${url}`);
    return 'unknown';
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
   * 检查是否为Ollama框架
   */
  isOllamaFramework(url: string): boolean {
    return this.detectFramework(url) === 'ollama';
  }

  /**
   * 检查是否为vLLM框架
   */
  isVllmFramework(url: string): boolean {
    return this.detectFramework(url) === 'vllm';
  }

  /**
   * 检查是否为OpenAI兼容端点
   */
  isOpenAICompatible(url: string): boolean {
    return url.includes('/openai/');
  }

  /**
   * 获取框架优先级
   * 用于在多框架环境中确定使用顺序
   */
  getFrameworkPriority(): string[] {
    const framework = process.env['MODEL_INFERENCE_FRAMEWORK']?.toLowerCase();
    
    if (framework === 'ollama') {
      return ['ollama', 'vllm'];
    } else if (framework === 'vllm') {
      return ['vllm', 'ollama'];
    }
    
    return ['vllm', 'ollama'];
  }
}
