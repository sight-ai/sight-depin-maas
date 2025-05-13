import { Injectable, Logger } from '@nestjs/common';
import { IResponseProcessor } from '../interfaces/response-processor.interface';
import { OpenAIResponseProcessor } from './openai-response.processor';
import { OllamaResponseProcessor } from './ollama-response.processor';
import { GenericResponseProcessor } from './generic-response.processor';
import { ProcessorConfigService } from '../config/processor-config.service';

/**
 * Factory for creating response processors based on format and configuration
 */
@Injectable()
export class ResponseProcessorFactory {
  private readonly logger = new Logger(ResponseProcessorFactory.name);
  
  constructor(private configService: ProcessorConfigService) {}

  /**
   * Create a response processor based on the endpoint and configuration
   */
  createProcessor(endpoint: string): IResponseProcessor {
    const config = this.configService.getConfig();
    
    // If auto-detection is disabled, use the default processor
    if (!config.enableAutoDetection) {
      return this.createProcessorByType(config.defaultProcessorType);
    }
    
    // Detect format based on endpoint
    if (this.isOpenAIFormat(endpoint)) {
      
      return new OpenAIResponseProcessor();
    } else if (this.isOllamaFormat(endpoint)) {
      
      return new OllamaResponseProcessor();
    } else {
      
      return new GenericResponseProcessor();
    }
  }
  
  /**
   * Create a processor by explicit type
   */
  createProcessorByType(type: 'openai' | 'ollama' | 'generic'): IResponseProcessor {
    switch (type) {
      case 'openai':
        return new OpenAIResponseProcessor();
      case 'ollama':
        return new OllamaResponseProcessor();
      case 'generic':
      default:
        return new GenericResponseProcessor();
    }
  }
  
  /**
   * Check if endpoint is using OpenAI format
   */
  private isOpenAIFormat(endpoint: string): boolean {
    return endpoint.includes('openai') || endpoint.includes('v1');
  }
  
  /**
   * Check if endpoint is using Ollama format
   */
  private isOllamaFormat(endpoint: string): boolean {
    return endpoint.includes('ollama') || endpoint.includes('api/generate') || endpoint.includes('api/chat');
  }
}
