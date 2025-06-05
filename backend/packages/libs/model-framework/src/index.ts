// =============================================================================
// Model Framework Library - Clean Architecture
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types & Interfaces
// -----------------------------------------------------------------------------
export * from './lib/types/framework.types';
export * from './lib/interfaces/service.interface';

// -----------------------------------------------------------------------------
// Core Architecture (Simplified)
// -----------------------------------------------------------------------------
export * from './lib/framework-manager.service';

// -----------------------------------------------------------------------------
// Clean Services
// -----------------------------------------------------------------------------
export * from './lib/services/base-model.service';
export * from './lib/services/clean-ollama.service';
export * from './lib/services/clean-vllm.service';
export * from './lib/services/vllm-process-manager.service';
export * from './lib/services/ollama-process-manager.service';

// -----------------------------------------------------------------------------
// Legacy Compatibility Adapters
// -----------------------------------------------------------------------------
export * from './lib/adapters/legacy-compatibility.adapter';

// Legacy aliases for backward compatibility
export { LegacyFrameworkDetectorAdapter as FrameworkDetectorService } from './lib/adapters/legacy-compatibility.adapter';
export { LegacyModelServiceFactoryAdapter as ModelServiceFactoryImpl } from './lib/adapters/legacy-compatibility.adapter';

// -----------------------------------------------------------------------------
// Module
// -----------------------------------------------------------------------------
export * from './lib/model-framework.module';
