import { Injectable, Logger } from '@nestjs/common';
import got from 'got-cjs';
import { env } from '../../env';
import { ApiRequestOptions, DEFAULT_REQUEST_TIMEOUT, HttpMethod, MAX_RETRIES } from '../types/ollama.types';

/**
 * Client for communicating with Ollama API
 */
@Injectable()
export class OllamaApiClient {
  private readonly logger = new Logger(OllamaApiClient.name);
  private readonly baseUrl = env().OLLAMA_API_URL;

  constructor() {
    
  }

  /**
   * Check if Ollama service is available
   */
  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL('api/version', this.baseUrl);
      const response = await got.get(url.toString(), {
        timeout: { request: 5000 },
        retry: { limit: 0 }
      });
      return response.statusCode === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a stream for streaming responses
   */
  createStream(endpoint: string, data: any): any {
    // Ensure we have the correct URL format
    const apiEndpoint = this.getApiEndpoint(endpoint);
    const url = new URL(apiEndpoint, this.baseUrl);
    
    
    
    
    return got.stream(url.toString(), {
      method: 'POST',
      json: data,
      timeout: { request: DEFAULT_REQUEST_TIMEOUT }
    });
  }

  /**
   * Send a request to the Ollama API
   */
  async sendRequest<T>(
    endpoint: string, 
    method: HttpMethod = 'GET', 
    data?: any, 
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const apiEndpoint = this.getApiEndpoint(endpoint);
    const url = new URL(apiEndpoint, this.baseUrl);
    
    const requestOptions = {
      timeout: { request: options.timeout || DEFAULT_REQUEST_TIMEOUT },
      retry: { limit: options.retries || MAX_RETRIES }
    };

    try {
      if (method === 'GET') {
        return await got.get(url.toString(), requestOptions).json();
      } else {
        return await got.post(url.toString(), {
          ...requestOptions,
          json: data
        }).json();
      }
    } catch (error) {
      this.logger.error(`Failed to ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('socket hang up') ||
      error.message?.includes('network timeout')
    );
  }
  
  /**
   * Get API endpoint with correct format
   */
  private getApiEndpoint(endpoint: string): string {
    // For OpenAI format endpoints, use as is
    if (endpoint.startsWith('openai/') || endpoint.startsWith('v1/')) {
      return endpoint;
    }
    
    // For Ollama endpoints, ensure they start with api/
    return endpoint.startsWith('api/') ? endpoint : `api/${endpoint}`;
  }
}
