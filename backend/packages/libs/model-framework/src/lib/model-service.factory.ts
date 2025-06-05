import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  UnifiedModelService,
  ModelServiceFactory
} from './interfaces/service.interface';
import {
  ModelFramework,
  FrameworkSwitchOptions
} from './types/framework.types';
import { FrameworkDetectorService } from './framework-detector.service';

/**
 * Factory service for creating and managing model service instances
 */
@Injectable()
export class ModelServiceFactoryImpl implements ModelServiceFactory {
  private readonly logger = new Logger(ModelServiceFactoryImpl.name);
  private serviceCache = new Map<ModelFramework, UnifiedModelService>();
  private currentFramework: ModelFramework | null = null;

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(FrameworkDetectorService)
    private readonly frameworkDetector: FrameworkDetectorService,
    @Optional() @Inject('OllamaService') private readonly ollamaService?: any,
    @Optional() @Inject('VllmService') private readonly vllmService?: any
  ) {}

  /**
   * Create a model service instance for the specified framework
   */
  async createService(framework: ModelFramework): Promise<UnifiedModelService> {
    // Check cache first
    if (this.serviceCache.has(framework)) {
      const cachedService = this.serviceCache.get(framework)!;
      this.logger.debug(`Returning cached service for framework: ${framework}`);
      return cachedService;
    }

    let service: UnifiedModelService;

    try {
      switch (framework) {
        case ModelFramework.OLLAMA:
          // Use directly injected service if available
          if (this.ollamaService) {
            service = this.ollamaService;
          } else {
            // Create clean Ollama service
            const { CleanOllamaService } = await import('./services/clean-ollama.service');
            service = new CleanOllamaService();
          }
          break;

        case ModelFramework.VLLM:
          // Use directly injected service if available
          if (this.vllmService) {
            service = this.vllmService;
          } else {
            // Create clean vLLM service
            const { CleanVllmService } = await import('./services/clean-vllm.service');
            service = new CleanVllmService();
          }
          break;

        default:
          throw new Error(`Unsupported framework: ${framework}`);
      }

      // Cache the service
      this.serviceCache.set(framework, service);
      this.logger.log(`Created and cached service for framework: ${framework}`);
      
      return service;
    } catch (error) {
      this.logger.error(`Failed to create service for framework ${framework}:`, error);
      const errorMessage = `Failed to create service for framework: ${framework}`;
      const originalError = error instanceof Error ? error.message : String(error);
      throw new Error(`${errorMessage}. Original error: ${originalError}`);
    }
  }

  /**
   * Get the current active service based on framework detection
   */
  async getCurrentService(): Promise<UnifiedModelService> {
    try {
      const detection = await this.frameworkDetector.detectFrameworks();

      // Check if the detected framework is available
      if (!detection?.primary?.isAvailable) {
        // Try secondary framework if available
        if (detection?.secondary?.isAvailable) {
          this.logger.warn(
            `Primary framework ${detection.detected} is not available, switching to ${detection.secondary.framework}`
          );
          return this.createService(detection.secondary.framework);
        } else {
          // If no frameworks are available, still try to create the detected service
          // This allows for graceful degradation
          this.logger.warn(`No frameworks appear to be available, attempting to create ${detection?.detected || 'ollama'} service anyway`);
          return this.createService(detection?.detected || ModelFramework.OLLAMA);
        }
      }

      this.currentFramework = detection.detected;
      return this.createService(detection.detected);
    } catch (error) {
      this.logger.error('Error in getCurrentService:', error);
      // Fallback to creating an Ollama service
      this.logger.warn('Falling back to Ollama service due to detection error');
      return this.createService(ModelFramework.OLLAMA);
    }
  }

  /**
   * Switch to a different framework
   */
  async switchFramework(
    framework: ModelFramework,
    options: Partial<FrameworkSwitchOptions> = {}
  ): Promise<UnifiedModelService> {
    this.logger.log(`Switching to framework: ${framework}`);

    // Validate availability if requested
    if (options.validateAvailability !== false) {
      const isAvailable = await this.frameworkDetector.isFrameworkAvailable(framework);
      if (!isAvailable && !options.force) {
        throw new Error(`Framework ${framework} is not available`);
      }
    }

    // Clear cache if forcing switch
    if (options.force) {
      this.serviceCache.clear();
      this.frameworkDetector.clearCache();
    }

    // Set the framework override in the detector so it persists across status checks
    this.frameworkDetector.setFrameworkOverride(framework);
    this.currentFramework = framework;
    return this.createService(framework);
  }

  /**
   * Get available frameworks
   */
  async getAvailableFrameworks(): Promise<ModelFramework[]> {
    const detection = await this.frameworkDetector.detectFrameworks();
    return detection.available;
  }

  /**
   * Get current framework
   */
  getCurrentFramework(): ModelFramework | null {
    return this.currentFramework;
  }

  /**
   * Check if a framework is available
   */
  async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    return this.frameworkDetector.isFrameworkAvailable(framework);
  }

  /**
   * Get framework status
   */
  async getFrameworkStatus() {
    return this.frameworkDetector.detectFrameworks();
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.serviceCache.clear();
    this.frameworkDetector.clearCache();
    this.currentFramework = null;
    this.logger.log('Service cache cleared');
  }

  /**
   * Warm up services by pre-creating them
   */
  async warmUp(): Promise<void> {
    try {
      const availableFrameworks = await this.getAvailableFrameworks();
      
      const warmUpPromises = availableFrameworks.map(async (framework) => {
        try {
          await this.createService(framework);
          this.logger.log(`Warmed up service for framework: ${framework}`);
        } catch (error) {
          this.logger.warn(`Failed to warm up service for framework ${framework}:`, error);
        }
      });

      await Promise.all(warmUpPromises);
      this.logger.log('Service warm-up completed');
    } catch (error) {
      this.logger.error('Service warm-up failed:', error);
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    currentFramework: ModelFramework | null;
    availableFrameworks: ModelFramework[];
    serviceStatus: Record<string, boolean>;
  }> {
    const availableFrameworks = await this.getAvailableFrameworks();
    const serviceStatus: Record<string, boolean> = {};

    // Check status of cached services
    for (const [framework, service] of this.serviceCache.entries()) {
      try {
        serviceStatus[framework] = await service.checkStatus();
      } catch (error) {
        serviceStatus[framework] = false;
      }
    }

    return {
      currentFramework: this.currentFramework,
      availableFrameworks,
      serviceStatus
    };
  }
}
