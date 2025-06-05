import { Logger } from '@nestjs/common';
import { Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { UnifiedModelService, UnifiedChatRequest, UnifiedCompletionRequest, UnifiedEmbeddingsRequest, UnifiedEmbeddingsResponse } from '../interfaces/service.interface';
import { ModelFramework, UnifiedModelList, UnifiedModelInfo } from '../types/framework.types';

/**
 * Base Model Service
 * 
 * 提供所有模型服务的公共功能：
 * 1. 任务ID生成
 * 2. 请求透传
 * 3. 错误处理
 * 4. 工具方法
 */
export abstract class BaseModelService implements UnifiedModelService {
  protected readonly logger = new Logger(this.constructor.name);
  
  // 子类必须实现的属性
  abstract readonly framework: ModelFramework;
  protected abstract readonly baseUrl: string;

  /**
   * 生成唯一任务ID
   */
  protected generateTaskId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `task_${timestamp}_${random}`;
  }

  /**
   * 通用请求透传方法
   * 处理流式和非流式请求
   */
  protected async passthroughRequest(
    args: any, 
    res: Response, 
    pathname: string, 
    taskId: string
  ): Promise<void> {
    const url = `${this.baseUrl}${pathname}`;
    
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url,
        data: args,
        timeout: 60000,
        responseType: args.stream ? 'stream' : 'json',
        headers: {
          'Content-Type': 'application/json',
          'Accept': args.stream ? 'text/event-stream' : 'application/json',
        }
      };

      const response = await axios(config);

      if (args.stream) {
        // 流式响应处理
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        response.data.pipe(res);
        
        response.data.on('end', () => {
          this.logger.debug(`Streaming completed for task: ${taskId}`);
        });
        
        response.data.on('error', (error: Error) => {
          this.logger.error(`Streaming error for task ${taskId}: ${error.message}`);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });
      } else {
        // 非流式响应处理
        res.status(response.status).json(response.data);
      }
      
    } catch (error) {
      this.logger.error(`Request failed for task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (!res.headersSent) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const message = error.response?.data?.error || error.message;
          res.status(status).json({ error: message });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  }

  /**
   * 格式化文件大小
   */
  protected formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 从模型名称提取模型家族
   */
  protected extractModelFamily(modelName: string): string {
    const name = modelName.toLowerCase();
    
    if (name.includes('llama')) return 'llama';
    if (name.includes('mistral')) return 'mistral';
    if (name.includes('codellama')) return 'codellama';
    if (name.includes('vicuna')) return 'vicuna';
    if (name.includes('alpaca')) return 'alpaca';
    if (name.includes('qwen')) return 'qwen';
    if (name.includes('deepseek')) return 'deepseek';
    
    return 'unknown';
  }

  /**
   * 从模型名称提取参数数量
   */
  protected extractParameters(modelName: string): string {
    const match = modelName.match(/(\d+(?:\.\d+)?)[bB]/);
    return match ? `${match[1]}B` : 'unknown';
  }

  /**
   * 通用HTTP请求方法
   */
  protected async makeRequest<T = any>(
    endpoint: string, 
    options: AxiosRequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await axios({
        url,
        timeout: 5000,
        ...options
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Request to ${endpoint} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // 抽象方法 - 子类必须实现
  abstract chat(args: UnifiedChatRequest, res: Response, pathname?: string): Promise<void>;
  abstract complete(args: UnifiedCompletionRequest, res: Response, pathname?: string): Promise<void>;
  abstract checkStatus(): Promise<boolean>;
  abstract listModels(): Promise<UnifiedModelList>;
  abstract getModelInfo(modelName: string): Promise<UnifiedModelInfo>;
  abstract generateEmbeddings(args: UnifiedEmbeddingsRequest): Promise<UnifiedEmbeddingsResponse>;
  abstract getVersion(): Promise<{ version: string; framework: ModelFramework }>;
}
