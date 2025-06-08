import { z } from 'zod';

/**
 * Supported model inference frameworks
 * 使用常量而不是枚举，便于动态扩展
 */
export const ModelFramework = {
  OLLAMA: 'ollama',
  VLLM: 'vllm'
} as const;

export type ModelFramework = typeof ModelFramework[keyof typeof ModelFramework];

/**
 * Framework configuration schema
 */
export const FrameworkConfigSchema = z.object({
  framework: z.string(),
  ollamaUrl: z.string().url().optional(),
  vllmUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().nonnegative().optional()
});

export type FrameworkConfig = z.infer<typeof FrameworkConfigSchema>;

/**
 * Framework status information
 */
export interface FrameworkStatus {
  framework: ModelFramework;
  isAvailable: boolean;
  url: string;
  version?: string;
  error?: string;
  lastChecked: Date;
}

/**
 * Framework health status (detailed)
 */
export interface FrameworkHealthStatus {
  isAvailable: boolean;
  url: string;
  version?: string;
  error?: string;
  lastChecked: Date;
  responseTime?: number;
}

/**
 * Framework detection result (legacy)
 */
export interface FrameworkDetectionResult {
  detected: ModelFramework;
  available: ModelFramework[];
  primary: FrameworkStatus;
  secondary?: FrameworkStatus;
  config: FrameworkConfig;
}

/**
 * Enhanced framework detection result (new architecture)
 */
export interface EnhancedFrameworkDetectionResult {
  available: ModelFramework[];
  unavailable: ModelFramework[];
  details: Record<ModelFramework, FrameworkHealthStatus>;
  recommended?: ModelFramework;
}

/**
 * Framework switching options
 */
export interface FrameworkSwitchOptions {
  framework: ModelFramework;
  force?: boolean;
  validateAvailability?: boolean;
}

/**
 * Common API response format for both frameworks
 */
export interface UnifiedApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  framework: ModelFramework;
  timestamp: string;
}

/**
 * Model information unified format
 */
export interface UnifiedModelInfo {
  name: string;
  size?: string;
  family?: string;
  parameters?: string;
  quantization?: string;
  format?: string;
  modified_at?: string;
  digest?: string;
  details?: Record<string, any>;
}

/**
 * Unified model list response
 */
export interface UnifiedModelList {
  models: UnifiedModelInfo[];
  total: number;
  framework: ModelFramework;
}
