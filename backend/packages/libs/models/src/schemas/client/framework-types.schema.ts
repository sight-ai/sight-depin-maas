import { z } from 'zod';

/**
 * 框架相关的 Zod Schema 定义
 * 
 * 从 model-inference-client/types/framework.types.ts 迁移而来
 */

/**
 * 支持的模型推理框架 Schema
 */
export const ModelFrameworkSchema = z.enum(['ollama', 'vllm']);

/**
 * ModelFramework 枚举（用于代码中的常量引用）
 */
export enum ModelFramework {
  OLLAMA = 'ollama',
  VLLM = 'vllm'
}

/**
 * 客户端框架配置 Schema（简化版，用于客户端类型定义）
 */
export const ClientFrameworkConfigSchema = z.object({
  framework: z.string().describe('框架名称'),
  ollamaUrl: z.string().url().optional().describe('Ollama URL'),
  vllmUrl: z.string().url().optional().describe('vLLM URL'),
  defaultModel: z.string().optional().describe('默认模型'),
  timeout: z.number().positive().optional().describe('超时时间（毫秒）'),
  retries: z.number().nonnegative().optional().describe('重试次数')
});

/**
 * 框架状态信息 Schema
 */
export const FrameworkStatusSchema = z.object({
  framework: ModelFrameworkSchema.describe('框架类型'),
  isAvailable: z.boolean().describe('是否可用'),
  url: z.string().url().describe('服务 URL'),
  version: z.string().optional().describe('版本信息'),
  error: z.string().optional().describe('错误信息'),
  lastChecked: z.string().datetime().describe('最后检查时间')
});

/**
 * 框架健康状态（详细）Schema
 */
export const FrameworkHealthStatusSchema = z.object({
  isAvailable: z.boolean().describe('是否可用'),
  url: z.string().url().describe('服务 URL'),
  version: z.string().optional().describe('版本信息'),
  error: z.string().optional().describe('错误信息'),
  lastChecked: z.string().datetime().describe('最后检查时间'),
  responseTime: z.number().nonnegative().optional().describe('响应时间（毫秒）')
});

/**
 * 传统框架检测结果 Schema（向后兼容）
 */
export const LegacyFrameworkDetectionResultSchema = z.object({
  detected: ModelFrameworkSchema.describe('检测到的框架'),
  available: z.array(ModelFrameworkSchema).describe('可用框架列表'),
  primary: FrameworkStatusSchema.describe('主要框架状态'),
  secondary: FrameworkStatusSchema.optional().describe('次要框架状态'),
  config: ClientFrameworkConfigSchema.describe('框架配置')
});

/**
 * 增强框架检测结果 Schema（新架构）
 */
export const EnhancedFrameworkDetectionResultSchema = z.object({
  available: z.array(ModelFrameworkSchema).describe('可用框架列表'),
  unavailable: z.array(ModelFrameworkSchema).describe('不可用框架列表'),
  details: z.record(ModelFrameworkSchema, FrameworkHealthStatusSchema).describe('框架详细状态'),
  recommended: ModelFrameworkSchema.optional().describe('推荐框架')
});

/**
 * 框架切换选项 Schema
 */
export const FrameworkSwitchOptionsSchema = z.object({
  framework: ModelFrameworkSchema.describe('目标框架'),
  force: z.boolean().optional().describe('是否强制切换'),
  validateAvailability: z.boolean().optional().describe('是否验证可用性')
});

/**
 * 统一 API 响应格式 Schema
 */
export const UnifiedApiResponseSchema = z.object({
  success: z.boolean().describe('操作是否成功'),
  data: z.any().optional().describe('响应数据'),
  error: z.string().optional().describe('错误信息'),
  framework: ModelFrameworkSchema.describe('框架类型'),
  timestamp: z.string().datetime().describe('时间戳')
});

/**
 * 统一模型信息格式 Schema
 */
export const UnifiedModelInfoSchema = z.object({
  name: z.string().describe('模型名称'),
  size: z.string().optional().describe('模型大小'),
  family: z.string().optional().describe('模型家族'),
  parameters: z.string().optional().describe('参数数量'),
  quantization: z.string().optional().describe('量化信息'),
  format: z.string().optional().describe('模型格式'),
  modified_at: z.string().optional().describe('修改时间'),
  digest: z.string().optional().describe('模型摘要'),
  details: z.record(z.any()).optional().describe('详细信息')
});

/**
 * 统一模型列表响应 Schema
 */
export const UnifiedModelListSchema = z.object({
  models: z.array(UnifiedModelInfoSchema).describe('模型列表'),
  total: z.number().int().nonnegative().describe('模型总数'),
  framework: ModelFrameworkSchema.describe('框架类型')
});

/**
 * 框架切换结果 Schema
 */
export const FrameworkSwitchResultSchema = z.object({
  success: z.boolean().describe('切换是否成功'),
  previousFramework: ModelFrameworkSchema.optional().describe('之前的框架'),
  currentFramework: ModelFrameworkSchema.describe('当前框架'),
  message: z.string().describe('结果消息'),
  timestamp: z.string().datetime().describe('切换时间'),
  requiresRestart: z.boolean().optional().describe('是否需要重启')
});

/**
 * 框架能力信息 Schema
 */
export const FrameworkCapabilitiesSchema = z.object({
  framework: ModelFrameworkSchema.describe('框架类型'),
  supportedOperations: z.array(z.enum([
    'chat',
    'completion',
    'embeddings',
    'model_list',
    'model_info',
    'health_check'
  ])).describe('支持的操作'),
  supportedFormats: z.array(z.string()).optional().describe('支持的格式'),
  maxContextLength: z.number().int().positive().optional().describe('最大上下文长度'),
  supportsStreaming: z.boolean().describe('是否支持流式响应'),
  supportsToolCalls: z.boolean().optional().describe('是否支持工具调用'),
  supportedModels: z.array(z.string()).optional().describe('支持的模型列表')
});

/**
 * 框架性能指标 Schema
 */
export const FrameworkPerformanceMetricsSchema = z.object({
  framework: ModelFrameworkSchema.describe('框架类型'),
  averageResponseTime: z.number().nonnegative().describe('平均响应时间（毫秒）'),
  successRate: z.number().min(0).max(1).describe('成功率'),
  errorRate: z.number().min(0).max(1).describe('错误率'),
  throughput: z.number().nonnegative().describe('吞吐量（请求/秒）'),
  lastUpdated: z.string().datetime().describe('最后更新时间'),
  sampleSize: z.number().int().nonnegative().describe('样本大小')
});

// 导出类型（注意：ModelFramework 枚举已在上面定义，这里不重复导出类型）
// export type ModelFramework = z.infer<typeof ModelFrameworkSchema>;
export type ClientFrameworkConfig = z.infer<typeof ClientFrameworkConfigSchema>;
export type FrameworkStatus = z.infer<typeof FrameworkStatusSchema>;
export type FrameworkHealthStatus = z.infer<typeof FrameworkHealthStatusSchema>;
export type LegacyFrameworkDetectionResult = z.infer<typeof LegacyFrameworkDetectionResultSchema>;
export type EnhancedFrameworkDetectionResult = z.infer<typeof EnhancedFrameworkDetectionResultSchema>;
export type FrameworkSwitchOptions = z.infer<typeof FrameworkSwitchOptionsSchema>;
export type UnifiedApiResponse<T = any> = Omit<z.infer<typeof UnifiedApiResponseSchema>, 'data'> & { data?: T };
export type UnifiedModelInfo = z.infer<typeof UnifiedModelInfoSchema>;
export type UnifiedModelList = z.infer<typeof UnifiedModelListSchema>;
export type FrameworkSwitchResult = z.infer<typeof FrameworkSwitchResultSchema>;
export type FrameworkCapabilities = z.infer<typeof FrameworkCapabilitiesSchema>;
export type FrameworkPerformanceMetrics = z.infer<typeof FrameworkPerformanceMetricsSchema>;

// 导出 schemas 集合
export const FrameworkSchemas = {
  ModelFrameworkSchema,
  ClientFrameworkConfigSchema,
  FrameworkStatusSchema,
  FrameworkHealthStatusSchema,
  LegacyFrameworkDetectionResultSchema,
  EnhancedFrameworkDetectionResultSchema,
  FrameworkSwitchOptionsSchema,
  UnifiedApiResponseSchema,
  UnifiedModelInfoSchema,
  UnifiedModelListSchema,
  FrameworkSwitchResultSchema,
  FrameworkCapabilitiesSchema,
  FrameworkPerformanceMetricsSchema
} as const;
