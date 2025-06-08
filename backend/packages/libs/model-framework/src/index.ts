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
// Abstract Base Classes (New Architecture)
// -----------------------------------------------------------------------------
export * from './lib/abstracts/base-framework-manager';
export * from './lib/abstracts/base-model-service';
export * from './lib/abstracts/base-process-manager';

// -----------------------------------------------------------------------------
// Clean Services
// -----------------------------------------------------------------------------
// export * from './lib/services/base-model.service'; // 注释掉以避免冲突
export * from './lib/services/clean-ollama.service';
export * from './lib/services/clean-vllm.service';
export * from './lib/services/vllm-process-manager.service';
export * from './lib/services/ollama-process-manager.service';
export * from './lib/services/dynamic-model-config.service';


// -----------------------------------------------------------------------------
// Modern Architecture - No Legacy Compatibility
// -----------------------------------------------------------------------------
// All legacy adapters have been removed. Use FrameworkManagerService directly.

// -----------------------------------------------------------------------------
// Module
// -----------------------------------------------------------------------------
export * from './lib/model-framework.module';
