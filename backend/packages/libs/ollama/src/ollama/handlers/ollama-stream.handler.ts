import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { STREAM_TIMEOUT, TaskUpdateData } from '../types/ollama.types';

/**
 * Handler for streaming responses
 */
@Injectable()
export class OllamaStreamHandler {
  private readonly logger = new Logger(OllamaStreamHandler.name);

  constructor() { }

  /**
   * Check if endpoint is using OpenAI format
   */
  private isOpenAIFormat(endpoint: string): boolean {
    return endpoint.includes('openai') || endpoint.includes('v1');
  }



  /**
   * Handle streaming response
   */
  async handleStream(
    stream: any,
    res: Response,
    taskId: string,
    endpoint: string,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
  ): Promise<void> {
    let hasReceivedData = false;
    const streamTimeout = setTimeout(() => {
      if (!hasReceivedData) {
        stream.destroy(new Error('Stream timeout: No data received'));
      }
    }, STREAM_TIMEOUT);

    const isOpenAI = this.isOpenAIFormat(endpoint);
    // Set up stream event handlers
    stream.on('data', async (chunk: any) => {
      try {
        hasReceivedData = true;
        const chunkStr = chunk.toString();
        

        if (isOpenAI) {
          await this.handleOpenAIStreamChunk(chunk, chunkStr, res, taskId, endpoint, updateTask, createEarnings);
        } else {
          await this.handleOllamaStreamChunk(chunk, chunkStr, res, taskId, updateTask, createEarnings);
        }
      } catch (err) {
        
      }
    });

    // Handle stream errors
    stream.on('error', async (error: any) => {
      clearTimeout(streamTimeout);
      await updateTask(taskId, { status: 'failed' });

      if (!res.headersSent) {
        res.status(400).json({
          error: error.message || 'Stream error occurred',
          model: 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }

      if (!res.writableEnded) res.end();
    });

    // Handle stream end
    stream.on('end', () => {
      clearTimeout(streamTimeout);
      if (!res.writableEnded) res.end();
    });
  }

  /**
   * Handle OpenAI format stream chunk
   */
  private async handleOpenAIStreamChunk(
    chunk: any,
    chunkStr: string,
    res: Response,
    taskId: string,
    _endpoint: string, // Unused parameter, kept for compatibility
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
  ): Promise<void> {
    try {
      // Pass through the chunk as is
      res.write(chunk);

      // Check if this is SSE format (starts with "data: ")
      if (chunkStr.startsWith('data: ')) {
        // Extract the JSON part
        const jsonStr = chunkStr.substring(6); // Remove "data: " prefix

        // Check if it's the [DONE] marker
        if (jsonStr === '[DONE]') {
          return;
        }

        try {
          // Parse the JSON part
          const part = JSON.parse(jsonStr);
          

          // Check if this is the final chunk (contains finish_reason: "stop")
          if (part.choices &&
              part.choices[0] &&
              part.choices[0].finish_reason === 'stop') {

            // Update task status with any available usage information
            const usage = part.usage || {};
            await updateTask(taskId, {
              status: 'completed',
              prompt_eval_count: usage.prompt_tokens ?? 0,
              eval_count: usage.completion_tokens ?? 0
            });

            // Log token usage
            

            // Create earnings record
            await createEarnings(taskId, {
              prompt_eval_count: usage.prompt_tokens || 0,
              eval_count: usage.completion_tokens || 0
            });
          }
        } catch (jsonError) {
          
        }
      } else {
        // Try to parse as regular JSON
        try {
          const part = JSON.parse(chunkStr);
          

          if (part.done) {
            // Update task status
            await updateTask(taskId, {
              status: 'completed',
              total_duration: part.total_duration ?? null,
              load_duration: part.load_duration ?? null,
              prompt_eval_count: part.prompt_eval_count ?? null,
              prompt_eval_duration: part.prompt_eval_duration ?? null,
              eval_count: part.eval_count ?? null,
              eval_duration: part.eval_duration ?? null
            });

            // Log token usage
            

            // Create earnings record
            await createEarnings(taskId, part, part.device_id);

            res.end();
          }
        } catch (jsonError) {
          
        }
      }
    } catch (error) {
      
      // Make sure the chunk is written even if there's an error
      if (!res.writableEnded) {
        res.write(chunk);
      }
    }

  }

  /**
   * Handle Ollama format stream chunk
   */
  private async handleOllamaStreamChunk(
    chunk: any,
    chunkStr: string,
    res: Response,
    taskId: string,
    updateTask: (taskId: string, data: TaskUpdateData) => Promise<void>,
    createEarnings: (taskId: string, data: any, deviceId?: string) => Promise<void>
  ): Promise<void> {
    try {
      const part: any = JSON.parse(chunkStr);

      // For Ollama format, we need to convert to SSE format
      res.write(chunk);

      if (part.done) {
        // Update task status
        await updateTask(taskId, {
          status: 'completed',
          total_duration: part.total_duration ?? null,
          load_duration: part.load_duration ?? null,
          prompt_eval_count: part.prompt_eval_count ?? null,
          prompt_eval_duration: part.prompt_eval_duration ?? null,
          eval_count: part.eval_count ?? null,
          eval_duration: part.eval_duration ?? null
        });

        // Log token usage
        

        // Create earnings record
        await createEarnings(taskId, part, part.device_id);

        res.end();
      }
    } catch (parseError) {
      
      // For Ollama format, we still need to write the chunk even if parsing fails
      res.write(chunk);
    }
  }
}
