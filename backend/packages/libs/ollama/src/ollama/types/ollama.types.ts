import { Response } from 'express';

// Constants
export const DEFAULT_REQUEST_TIMEOUT = 60000; // 60 seconds
export const MAX_RETRIES = 3;
export const STREAM_TIMEOUT = 10000; // 10 seconds



// Task update data
export interface TaskUpdateData {
  status: 'running' | 'completed' | 'failed';
  total_duration?: number | null;
  load_duration?: number | null;
  prompt_eval_count?: number | null;
  prompt_eval_duration?: number | null;
  eval_count?: number | null;
  eval_duration?: number | null;
}

// API response options
export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST';

// Error handler function type
export type ErrorHandler = (error: any, res: Response, model?: string) => void;
