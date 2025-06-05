import { Module, Global } from '@nestjs/common';
import { FrameworkDetectorService } from './framework-detector.service';
import { ModelServiceFactoryImpl } from './model-service.factory';
import { FrameworkManagerService } from './framework-manager.service';
import { VllmProcessManagerService } from './services/vllm-process-manager.service';
import { OllamaProcessManagerService } from './services/ollama-process-manager.service';

// Create a token for the ModelServiceFactory
export const MODEL_SERVICE_FACTORY = Symbol('MODEL_SERVICE_FACTORY');

/**
 * Global module for model framework management
 * Updated to use new architecture with backward compatibility
 */
@Global()
@Module({
  providers: [
    // New Architecture (Primary)
    FrameworkManagerService,
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // Legacy Services (Backward Compatibility)
    FrameworkDetectorService,
    {
      provide: MODEL_SERVICE_FACTORY,
      useClass: ModelServiceFactoryImpl
    },
    // Alias for backward compatibility
    {
      provide: 'ModelServiceFactory',
      useExisting: MODEL_SERVICE_FACTORY
    }
  ],
  exports: [
    // New Architecture
    FrameworkManagerService,
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // Legacy Services
    FrameworkDetectorService,
    MODEL_SERVICE_FACTORY,
    'ModelServiceFactory'
  ]
})
export class ModelFrameworkModule {}
