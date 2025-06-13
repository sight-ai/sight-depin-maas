import { Injectable, Logger } from '@nestjs/common';

/**
 * 任务类型检测器
 * 
 * 负责根据URL路径检测任务类型
 */
@Injectable()
export class TaskTypeDetector {
  private readonly logger = new Logger(TaskTypeDetector.name);

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
   * 获取任务类型
   */
  detectTaskType(url: string): string {
    for (const [path, taskType] of Object.entries(this.taskTypeMapping)) {
      if (url.includes(path)) {
        return taskType;
      }
    }
    
    this.logger.warn(`Unknown task type for URL: ${url}`);
    return 'unknown';
  }

  /**
   * 检查是否为聊天任务
   */
  isChatTask(url: string): boolean {
    const taskType = this.detectTaskType(url);
    return taskType === 'chat' || taskType === 'chat/completions';
  }

  /**
   * 检查是否为生成任务
   */
  isGenerateTask(url: string): boolean {
    const taskType = this.detectTaskType(url);
    return taskType === 'generate' || taskType === 'completions';
  }

  /**
   * 检查是否为嵌入任务
   */
  isEmbeddingsTask(url: string): boolean {
    const taskType = this.detectTaskType(url);
    return taskType === 'embeddings';
  }

  /**
   * 获取所有支持的任务类型
   */
  getSupportedTaskTypes(): string[] {
    return [...new Set(Object.values(this.taskTypeMapping))];
  }

  /**
   * 获取任务类型映射
   */
  getTaskTypeMapping(): Record<string, string> {
    return { ...this.taskTypeMapping };
  }
}
