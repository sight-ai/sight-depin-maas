import { Module, Global } from '@nestjs/common';
import { FrameworkManagerService } from './framework-manager.service';
import { VllmProcessManagerService } from './services/vllm-process-manager.service';
import { OllamaProcessManagerService } from './services/ollama-process-manager.service';
import {
  LegacyFrameworkDetectorAdapter,
  LegacyModelServiceFactoryAdapter
} from './adapters/legacy-compatibility.adapter';

// Create a token for the ModelServiceFactory
export const MODEL_SERVICE_FACTORY = Symbol('MODEL_SERVICE_FACTORY');

/**
 * Global module for model framework management
 * Simplified architecture with legacy compatibility adapters
 */
@Global()
@Module({
  providers: [
    // Core Architecture
    FrameworkManagerService,
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // Legacy Compatibility Adapters
    LegacyFrameworkDetectorAdapter,
    LegacyModelServiceFactoryAdapter,

    // Legacy Service Aliases (for backward compatibility)
    {
      provide: 'FrameworkDetectorService',
      useExisting: LegacyFrameworkDetectorAdapter
    },
    {
      provide: MODEL_SERVICE_FACTORY,
      useExisting: LegacyModelServiceFactoryAdapter
    },
    {
      provide: 'ModelServiceFactory',
      useExisting: LegacyModelServiceFactoryAdapter
    }
  ],
  exports: [
    // Core Architecture
    FrameworkManagerService,
    VllmProcessManagerService,
    OllamaProcessManagerService,

    // Legacy Compatibility
    LegacyFrameworkDetectorAdapter,
    LegacyModelServiceFactoryAdapter,
    'FrameworkDetectorService',
    MODEL_SERVICE_FACTORY,
    'ModelServiceFactory'
  ]
})
export class ModelFrameworkModule {}
