import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response } from 'express';
import { MODEL_EVENTS } from '@saito/tunnel';

@Injectable()
export abstract class BaseModelService {
  protected readonly logger: Logger;
  protected readonly eventEmitter: EventEmitter2;
  protected readonly serviceType: string;

  constructor(
    eventEmitter: EventEmitter2,
    serviceType: string,
    loggerName: string
  ) {
    this.eventEmitter = eventEmitter;
    this.serviceType = serviceType;
    this.logger = new Logger(loggerName);
    this.setupEventListeners();
  }

  protected setupEventListeners(): void {
    // 监听聊天请求
    this.eventEmitter.on(MODEL_EVENTS.CHAT_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === this.serviceType) {
        try {
          await this.handleChatRequest(data);
        } catch (error) {
          this.handleError('chat', data.taskId, data.data.model, error);
        }
      }
    });

    // 监听完成请求
    this.eventEmitter.on(MODEL_EVENTS.COMPLETION_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === this.serviceType) {
        try {
          await this.handleCompletionRequest(data);
        } catch (error) {
          this.handleError('completion', data.taskId, data.data.model, error);
        }
      }
    });

    // 监听嵌入请求
    this.eventEmitter.on(MODEL_EVENTS.EMBEDDING_REQUEST, async (data: { serviceType: string, taskId: string, data: any }) => {
      if (data.serviceType === this.serviceType) {
        try {
          await this.handleEmbeddingRequest(data);
        } catch (error) {
          this.handleError('embedding', data.taskId, data.data.model, error);
        }
      }
    });
  }

  protected abstract handleChatRequest(data: { taskId: string, data: any }): Promise<void>;
  protected abstract handleCompletionRequest(data: { taskId: string, data: any }): Promise<void>;
  protected abstract handleEmbeddingRequest(data: { taskId: string, data: any }): Promise<void>;

  protected createResponseHandler(taskId: string): Response {
    const response = {
      write: (chunk: any) => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: chunk
        });
      },
      end: () => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: JSON.stringify({ done: true })
        });
      },
      status: (code: number) => response,
      json: (data: any) => {
        this.eventEmitter.emit(MODEL_EVENTS.CHAT_RESPONSE, {
          taskId,
          content: JSON.stringify(data)
        });
        return response;
      },
      setHeader: () => response,
      headersSent: false,
      writableEnded: false,
      // 添加必要的属性
      sendStatus: () => response,
      links: () => response,
      send: () => response,
      jsonp: () => response,
      // 添加其他必要的属性
      ...Object.fromEntries(
        Array.from({ length: 87 }, (_, i) => [`prop${i}`, () => response])
      )
    } as unknown as Response;

    return response;
  }

  protected handleError(type: 'chat' | 'completion' | 'embedding', taskId: string, model: string, error: any): void {
    this.logger.error(`Error handling ${type} request:`, error);
    const eventName = type === 'chat' 
      ? MODEL_EVENTS.CHAT_RESPONSE 
      : type === 'completion' 
        ? MODEL_EVENTS.COMPLETION_RESPONSE 
        : MODEL_EVENTS.EMBEDDING_RESPONSE;
    
    this.eventEmitter.emit(eventName, {
      taskId,
      content: {
        error: `Failed to process ${type} request`,
        model,
        created_at: new Date().toISOString(),
        done: true
      }
    });
  }
} 