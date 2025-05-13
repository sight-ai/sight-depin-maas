import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OpenAIChatCompletionRequest,
  OpenAICompletionRequest
} from '@saito/models';
import { TaskUpdateData } from '../types/ollama.types';
import { OllamaApiClient } from '../api/ollama-api.client';
import { OllamaStreamHandler } from '../handlers/ollama-stream.handler';

/**
 * Handler for chat and completion requests
 */
@Injectable()
export class ChatHandler {
  private readonly logger = new Logger(ChatHandler.name);

  constructor(
    private readonly apiClient: OllamaApiClient,
    private readonly streamHandler: OllamaStreamHandler
  ) {}

  /**
   * Check if endpoint is using OpenAI format
   */
  private isOpenAIFormat(endpoint: string): boolean {
    return endpoint.includes('openai') || endpoint.includes('v1');
  }

  /**
   * Check if endpoint is a chat endpoint
   */
  private isChatEndpoint(endpoint: string): boolean {
    return endpoint.includes('chat');
  }



  /**
   * Handle chat request
   */
  async handleChatRequest(
    args: z.infer<typeof OllamaChatRequest | typeof OpenAIChatCompletionRequest>,
    res: Response,
    endpoint: string,
    createTask: (model: string, taskId?: string, deviceId?: string) => Promise<{ id: string }>,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
  ): Promise<void> {
    const isOpenAI = this.isOpenAIFormat(endpoint);
    const processedArgs = args;
    await this.handleRequest(
      processedArgs,
      res,
      !isOpenAI ? 'api/chat' : endpoint,
      createTask,
      updateTask,
      createEarnings,
      isOpenAI
    );
  }

  /**
   * Handle completion request
   */
  async handleCompletionRequest(
    args: z.infer<typeof OllamaGenerateRequest | typeof OpenAICompletionRequest>,
    res: Response,
    endpoint: string,
    createTask: (model: string, taskId?: string, deviceId?: string) => Promise<{ id: string }>,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
  ): Promise<void> {
    const isOpenAI = this.isOpenAIFormat(endpoint);
    const processedArgs = args;

    await this.handleRequest(
      processedArgs,
      res,
      !isOpenAI ? 'api/generate' : endpoint,
      createTask,
      updateTask,
      createEarnings,
      isOpenAI
    );
  }

  /**
   * Common request handling logic
   */
  private async handleRequest(
    args: any,
    res: Response,
    endpoint: string,
    createTask: (model: string, taskId?: string, deviceId?: string) => Promise<{ id: string }>,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>,
    returnOpenAIFormat: boolean
  ): Promise<void> {
    const processedArgs = { ...args, stream: args.stream !== false };

    try {
      // Check if service is available
      if (!await this.apiClient.checkStatus()) {
        if (!res.headersSent) {
          res.status(400).json({
            error: 'Ollama service is not available',
            model: processedArgs.model,
            created_at: new Date().toISOString(),
            done: true
          });
        }
        return;
      }

      // Create task
      const task = await createTask(processedArgs.model, processedArgs.task_id, processedArgs.device_id);
      await updateTask(task.id, { status: 'running' });
      

      // Handle streaming or non-streaming request
      if (processedArgs.stream) {
        res.status(200);
        const stream = this.apiClient.createStream(endpoint, processedArgs);
        await this.streamHandler.handleStream(
          stream,
          res,
          task.id,
          endpoint,
          updateTask,
          createEarnings
        );
      } else {
        await this.handleNonStream(
          processedArgs,
          res,
          task.id,
          endpoint,
          updateTask,
          createEarnings,
          returnOpenAIFormat
        );
      }
    } catch (error: any) {
      this.logger.error(`Error in ${endpoint} request:`, error);
      this.handleErrorResponse(error, res, args.model);
    }
  }

  /**
   * Handle non-streaming response
   */
  private async handleNonStream(
    args: any,
    res: Response,
    taskId: string,
    endpoint: string,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>,
    _returnOpenAIFormat: boolean // Unused parameter, kept for compatibility
  ): Promise<void> {
    try {
      const responseBody = await this.apiClient.sendRequest<any>(endpoint, 'POST', args);

      // Update task status
      await updateTask(taskId, {
        status: 'completed',
        total_duration: responseBody.total_duration ?? null,
        load_duration: responseBody.load_duration ?? null,
        prompt_eval_count: responseBody.prompt_eval_count ?? null,
        prompt_eval_duration: responseBody.prompt_eval_duration ?? null,
        eval_count: responseBody.eval_count ?? null,
        eval_duration: responseBody.eval_duration ?? null
      });

      // Create earnings record
      await createEarnings(taskId, responseBody);

      // Send response
      if (!res.headersSent) {
        // Log token usage information if available
        if (responseBody.prompt_eval_count || responseBody.eval_count) {
          
        }

        // Return the response as is, without any format conversion
        res.status(200).json(responseBody);
      }
    } catch (error: any) {
      await updateTask(taskId, { status: 'failed' });
      this.handleErrorResponse(error, res, args?.model);
    }
  }

  /**
   * Handle error response
   */
  private handleErrorResponse(error: any, res: Response, model?: string): void {
    if (!res.headersSent) {
      res.status(400).json({
        error: 'Error during API request',
        details: error instanceof Error ? error.message : 'Unknown error',
        model: model || 'unknown',
        created_at: new Date().toISOString(),
        done: true
      });
    }
  }
}
