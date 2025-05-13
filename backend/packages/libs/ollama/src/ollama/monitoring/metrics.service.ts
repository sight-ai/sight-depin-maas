import { Injectable, Logger } from '@nestjs/common';
import { ProcessorConfigService } from '../config/processor-config.service';

/**
 * Metrics data for a single request
 */
export interface RequestMetrics {
  // Request identifier
  requestId: string;
  
  // Model used for the request
  model: string;
  
  // Endpoint used for the request
  endpoint: string;
  
  // Whether the request was streamed
  isStreaming: boolean;
  
  // Processor type used
  processorType: string;
  
  // Parser type used
  parserType: string;
  
  // Request start timestamp
  startTime: number;
  
  // Request end timestamp
  endTime?: number;
  
  // Request duration in milliseconds
  durationMs?: number;
  
  // Number of tokens in the prompt
  promptTokens?: number;
  
  // Number of tokens in the completion
  completionTokens?: number;
  
  // Total number of tokens
  totalTokens?: number;
  
  // Whether the request was successful
  success: boolean;
  
  // Error message if the request failed
  errorMessage?: string;
  
  // Number of retries
  retryCount?: number;
  
  // Whether the response was cached
  fromCache?: boolean;
  
  // Additional custom metrics
  custom?: Record<string, any>;
}

/**
 * Aggregated metrics for all requests
 */
export interface AggregatedMetrics {
  // Total number of requests
  totalRequests: number;
  
  // Number of successful requests
  successfulRequests: number;
  
  // Number of failed requests
  failedRequests: number;
  
  // Average request duration in milliseconds
  averageDurationMs: number;
  
  // Total number of tokens processed
  totalTokensProcessed: number;
  
  // Number of cached responses
  cachedResponses: number;
  
  // Number of retries
  totalRetries: number;
  
  // Metrics by model
  metricsByModel: Record<string, {
    requests: number;
    averageDurationMs: number;
    totalTokens: number;
  }>;
  
  // Metrics by endpoint
  metricsByEndpoint: Record<string, {
    requests: number;
    averageDurationMs: number;
    successRate: number;
  }>;
}

/**
 * Service for collecting and reporting metrics
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: RequestMetrics[] = [];
  private readonly startTime = Date.now();
  
  constructor(private configService: ProcessorConfigService) {}
  
  /**
   * Start tracking metrics for a request
   */
  startRequest(
    requestId: string,
    model: string,
    endpoint: string,
    isStreaming: boolean,
    processorType: string,
    parserType: string
  ): RequestMetrics {
    const metrics: RequestMetrics = {
      requestId,
      model,
      endpoint,
      isStreaming,
      processorType,
      parserType,
      startTime: Date.now(),
      success: false
    };
    
    if (this.configService.getConfig().collectDetailedMetrics) {
      this.metrics.push(metrics);
      
    }
    
    return metrics;
  }
  
  /**
   * Complete metrics for a request
   */
  completeRequest(
    metrics: RequestMetrics, 
    success: boolean, 
    tokenInfo?: { 
      promptTokens?: number; 
      completionTokens?: number; 
      totalTokens?: number 
    },
    error?: Error,
    retryCount?: number,
    fromCache?: boolean,
    custom?: Record<string, any>
  ): void {
    if (!this.configService.getConfig().collectDetailedMetrics) {
      return;
    }
    
    const endTime = Date.now();
    const durationMs = endTime - metrics.startTime;
    
    // Update metrics
    metrics.endTime = endTime;
    metrics.durationMs = durationMs;
    metrics.success = success;
    metrics.promptTokens = tokenInfo?.promptTokens;
    metrics.completionTokens = tokenInfo?.completionTokens;
    metrics.totalTokens = tokenInfo?.totalTokens;
    metrics.errorMessage = error?.message;
    metrics.retryCount = retryCount;
    metrics.fromCache = fromCache;
    metrics.custom = custom;
    
    
    
    // Log detailed metrics if enabled
    if (this.configService.getConfig().collectDetailedMetrics) {
      this.logger.verbose(`Request metrics: ${JSON.stringify(metrics)}`);
    }
  }
  
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): AggregatedMetrics {
    const metricsByModel: Record<string, { 
      requests: number; 
      totalDuration: number;
      totalTokens: number;
    }> = {};
    
    const metricsByEndpoint: Record<string, {
      requests: number;
      successful: number;
      totalDuration: number;
    }> = {};
    
    let totalDuration = 0;
    let totalTokens = 0;
    let cachedResponses = 0;
    let totalRetries = 0;
    
    // Calculate aggregated metrics
    for (const metric of this.metrics) {
      if (metric.durationMs) {
        totalDuration += metric.durationMs;
      }
      
      if (metric.totalTokens) {
        totalTokens += metric.totalTokens;
      }
      
      if (metric.fromCache) {
        cachedResponses++;
      }
      
      if (metric.retryCount) {
        totalRetries += metric.retryCount;
      }
      
      // Aggregate by model
      if (!metricsByModel[metric.model]) {
        metricsByModel[metric.model] = { 
          requests: 0, 
          totalDuration: 0,
          totalTokens: 0
        };
      }
      metricsByModel[metric.model].requests++;
      if (metric.durationMs) {
        metricsByModel[metric.model].totalDuration += metric.durationMs;
      }
      if (metric.totalTokens) {
        metricsByModel[metric.model].totalTokens += metric.totalTokens;
      }
      
      // Aggregate by endpoint
      if (!metricsByEndpoint[metric.endpoint]) {
        metricsByEndpoint[metric.endpoint] = {
          requests: 0,
          successful: 0,
          totalDuration: 0
        };
      }
      metricsByEndpoint[metric.endpoint].requests++;
      if (metric.success) {
        metricsByEndpoint[metric.endpoint].successful++;
      }
      if (metric.durationMs) {
        metricsByEndpoint[metric.endpoint].totalDuration += metric.durationMs;
      }
    }
    
    // Format the final aggregated metrics
    const result: AggregatedMetrics = {
      totalRequests: this.metrics.length,
      successfulRequests: this.metrics.filter(m => m.success).length,
      failedRequests: this.metrics.filter(m => !m.success).length,
      averageDurationMs: this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
      totalTokensProcessed: totalTokens,
      cachedResponses,
      totalRetries,
      metricsByModel: {},
      metricsByEndpoint: {}
    };
    
    // Format model metrics
    for (const [model, data] of Object.entries(metricsByModel)) {
      result.metricsByModel[model] = {
        requests: data.requests,
        averageDurationMs: data.requests > 0 ? data.totalDuration / data.requests : 0,
        totalTokens: data.totalTokens
      };
    }
    
    // Format endpoint metrics
    for (const [endpoint, data] of Object.entries(metricsByEndpoint)) {
      result.metricsByEndpoint[endpoint] = {
        requests: data.requests,
        averageDurationMs: data.requests > 0 ? data.totalDuration / data.requests : 0,
        successRate: data.requests > 0 ? data.successful / data.requests : 0
      };
    }
    
    return result;
  }
  
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = [];
    
  }
}
