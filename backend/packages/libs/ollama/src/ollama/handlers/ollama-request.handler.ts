import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { MAX_RETRIES, TaskUpdateData } from '../types/ollama.types';
import { OllamaApiClient } from '../api/ollama-api.client';
import { OllamaStreamHandler } from './ollama-stream.handler';

/**
 * Handler for Ollama requests
 */
@Injectable()
export class OllamaRequestHandler {
  private readonly logger = new Logger(OllamaRequestHandler.name);

  constructor(
    private readonly apiClient: OllamaApiClient,
    private readonly streamHandler: OllamaStreamHandler
  ) {}

  /**
   * Handle model request (common logic for chat and completion)
   */
  async handleModelRequest(
    args: any,
    res: Response,
    endpoint: string,
    createTask: (model: string, taskId?: string, deviceId?: string) => Promise<{ id: string }>,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
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
          createEarnings
        );
      }
    } catch (error: any) {
      this.logger.error(`Error in ${endpoint} request:`, error);
      this.handleErrorResponse(error, res, args.model);
    }
  }
  /**
   * Check if endpoint is using OpenAI format
   */
  private isOpenAIFormat(endpoint: string): boolean {
    return endpoint.includes('openai') || endpoint.includes('v1');
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
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
  ): Promise<void> {
    let retries = 0;
    const isOpenAI = this.isOpenAIFormat(endpoint);

    const attemptRequest = async (): Promise<void> => {
      try {
        const responseBody = await this.apiClient.sendRequest<any>(endpoint, 'POST', args);

        // Update task status
        await updateTask(taskId, isOpenAI ? {
          status: 'completed',
          total_duration: responseBody.usage.total_duration ?? null,
          load_duration: responseBody.usage.load_duration ?? null,
          prompt_eval_count: responseBody.usage.prompt_tokens ?? null,
          prompt_eval_duration: responseBody.usage.prompt_tokens ?? null,
          eval_count: responseBody.usage.completion_tokens ?? null,
          eval_duration: responseBody.usage.completion_tokens ?? null
        } : responseBody);

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
        if (retries < MAX_RETRIES && this.apiClient.isRetryableError(error)) {
          retries++;
          const backoffTime = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return attemptRequest();
        }

        await updateTask(taskId, { status: 'failed' });
        this.handleErrorResponse(error, res, args?.model);
      }
    };

    await attemptRequest();
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
