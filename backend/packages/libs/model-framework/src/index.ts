// =============================================================================
// Model Framework Library - Clean Architecture
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types & Interfaces
// -----------------------------------------------------------------------------
export * from './lib/types/framework.types';
export * from './lib/interfaces/service.interface';

// -----------------------------------------------------------------------------
// New Abstract Architecture (Primary)
// -----------------------------------------------------------------------------
export * from './lib/abstracts/framework-provider.abstract';
export * from './lib/registry/framework-registry';
export * from './lib/providers/ollama-framework.provider';
export * from './lib/providers/vllm-framework.provider';
export * from './lib/framework-manager.service';

// -----------------------------------------------------------------------------
// Clean Services
// -----------------------------------------------------------------------------
export * from './lib/services/clean-ollama.service';
export * from './lib/services/clean-vllm.service';
export * from './lib/services/vllm-process-manager.service';
export * from './lib/services/ollama-process-manager.service';

// -----------------------------------------------------------------------------
// Legacy Services (Backward Compatibility)
// -----------------------------------------------------------------------------
export * from './lib/framework-detector.service';
export * from './lib/model-service.factory';

// -----------------------------------------------------------------------------
// Module
// -----------------------------------------------------------------------------
export * from './lib/model-framework.module';
