import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuration options for message processors
 */
export interface ProcessorConfig {
  // Default processor type to use when format cannot be determined
  defaultProcessorType: 'openai' | 'ollama' | 'generic';
  
  // Whether to enable automatic format detection
  enableAutoDetection: boolean;
  
  // Maximum number of retries for failed requests
  maxRetries: number;
  
  // Retry delay in milliseconds (can be used for exponential backoff)
  retryDelayMs: number;
  
  // Whether to enable response caching
  enableCaching: boolean;
  
  // Cache TTL in milliseconds
  cacheTtlMs: number;
  
  // Whether to collect detailed metrics
  collectDetailedMetrics: boolean;
}

/**
 * Service for managing processor configuration
 */
@Injectable()
export class ProcessorConfigService {
  private readonly logger = new Logger(ProcessorConfigService.name);
  private config: ProcessorConfig;

  constructor(private configService: ConfigService) {
    this.initializeConfig();
  }

  /**
   * Initialize configuration from environment variables or defaults
   */
  private initializeConfig(): void {
    this.config = {
      defaultProcessorType: this.getConfigValue<'openai' | 'ollama' | 'generic'>(
        'OLLAMA_DEFAULT_PROCESSOR_TYPE', 
        'generic'
      ),
      enableAutoDetection: this.getConfigValue<boolean>(
        'OLLAMA_ENABLE_AUTO_DETECTION', 
        true
      ),
      maxRetries: this.getConfigValue<number>(
        'OLLAMA_MAX_RETRIES', 
        3
      ),
      retryDelayMs: this.getConfigValue<number>(
        'OLLAMA_RETRY_DELAY_MS', 
        1000
      ),
      enableCaching: this.getConfigValue<boolean>(
        'OLLAMA_ENABLE_CACHING', 
        false
      ),
      cacheTtlMs: this.getConfigValue<number>(
        'OLLAMA_CACHE_TTL_MS', 
        60000 // 1 minute
      ),
      collectDetailedMetrics: this.getConfigValue<boolean>(
        'OLLAMA_COLLECT_DETAILED_METRICS', 
        false
      ),
    };

    
  }

  /**
   * Get configuration value from environment or use default
   */
  private getConfigValue<T>(key: string, defaultValue: T): T {
    const value = this.configService.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Get the current processor configuration
   */
  getConfig(): ProcessorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(partialConfig: Partial<ProcessorConfig>): void {
    this.config = { ...this.config, ...partialConfig };
    
  }
}
