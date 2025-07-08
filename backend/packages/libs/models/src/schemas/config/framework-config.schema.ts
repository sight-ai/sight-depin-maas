import { z } from 'zod';

/**
 * 框架配置相关的 Zod Schema 定义
 * 
 * 包含：
 * 1. 基础框架配置
 * 2. Ollama 特定配置
 * 3. vLLM 特定配置
 * 4. 应用配置
 */

/**
 * 基础框架配置 Schema
 */
export const BaseFrameworkConfigSchema = z.object({
  baseUrl: z.string().url().describe('服务基础 URL'),
  timeout: z.number().positive().optional().default(30000).describe('请求超时时间（毫秒）'),
  retries: z.number().nonnegative().optional().default(3).describe('重试次数'),
  enableHealthCheck: z.boolean().optional().default(true).describe('是否启用健康检查'),
  healthCheckInterval: z.number().positive().optional().default(30000).describe('健康检查间隔（毫秒）')
});

/**
 * Ollama 配置 Schema
 */
export const OllamaConfigSchema = BaseFrameworkConfigSchema.extend({
  framework: z.literal('ollama').describe('框架类型'),
  models: z.array(z.string()).optional().describe('可用模型列表'),
  defaultModel: z.string().optional().describe('默认模型'),
  keepAlive: z.number().optional().describe('模型保持活跃时间'),
  numCtx: z.number().int().positive().optional().describe('上下文长度'),
  numGpu: z.number().int().nonnegative().optional().describe('使用的 GPU 数量'),
  numThread: z.number().int().positive().optional().describe('使用的线程数'),
  lowVram: z.boolean().optional().describe('是否启用低显存模式'),
  f16Kv: z.boolean().optional().describe('是否使用 f16 键值缓存'),
  logitsAll: z.boolean().optional().describe('是否返回所有 logits'),
  vocabOnly: z.boolean().optional().describe('是否只加载词汇表'),
  useMmap: z.boolean().optional().describe('是否使用内存映射'),
  useMlock: z.boolean().optional().describe('是否使用内存锁定'),
  embeddingOnly: z.boolean().optional().describe('是否只用于嵌入'),
  numa: z.boolean().optional().describe('是否启用 NUMA')
});

/**
 * vLLM 配置 Schema
 */
export const VllmConfigSchema = BaseFrameworkConfigSchema.extend({
  framework: z.literal('vllm').describe('框架类型'),
  apiKey: z.string().optional().describe('API 密钥'),
  models: z.array(z.string()).optional().describe('可用模型列表'),
  defaultModel: z.string().optional().describe('默认模型'),
  maxModelLen: z.number().int().positive().optional().describe('最大模型长度'),
  gpuMemoryUtilization: z.number().min(0).max(1).optional().describe('GPU 内存利用率'),
  tensorParallelSize: z.number().int().positive().optional().describe('张量并行大小'),
  pipelineParallelSize: z.number().int().positive().optional().describe('流水线并行大小'),
  blockSize: z.number().int().positive().optional().describe('块大小'),
  swapSpace: z.number().nonnegative().optional().describe('交换空间大小（GB）'),
  maxNumSeqs: z.number().int().positive().optional().describe('最大序列数'),
  maxNumBatchedTokens: z.number().int().positive().optional().describe('最大批处理 token 数'),
  maxPaddingLength: z.number().int().nonnegative().optional().describe('最大填充长度'),
  disableLogStats: z.boolean().optional().describe('是否禁用日志统计'),
  quantization: z.enum(['awq', 'gptq', 'squeezellm', 'fp8', 'int8']).nullable().optional().describe('量化方法'),
  enforceEager: z.boolean().optional().describe('是否强制使用 eager 模式'),
  maxContextLenToCapture: z.number().int().positive().optional().describe('最大捕获上下文长度')
});

/**
 * 框架配置联合类型
 */
export const FrameworkConfigSchema = z.discriminatedUnion('framework', [
  OllamaConfigSchema,
  VllmConfigSchema
]);

/**
 * 资源配置 Schema
 */
export const ResourceConfigSchema = z.object({
  gpuLimits: z.array(z.number().int().nonnegative()).optional().describe('GPU 限制列表'),
  memoryLimit: z.string().optional().describe('内存限制（如 "8GB"）'),
  cpuCores: z.number().int().positive().optional().describe('CPU 核心数限制'),
  diskSpace: z.string().optional().describe('磁盘空间限制（如 "100GB"）')
});

/**
 * 网关配置 Schema
 */
export const GatewayConfigSchema = z.object({
  url: z.string().url().describe('网关 URL'),
  code: z.string().describe('设备代码'),
  deviceId: z.string().describe('设备 ID'),
  lastSync: z.string().optional().describe('最后同步时间'),
  syncInterval: z.number().positive().optional().default(60000).describe('同步间隔（毫秒）'),
  enableHeartbeat: z.boolean().optional().default(true).describe('是否启用心跳'),
  heartbeatInterval: z.number().positive().optional().default(30000).describe('心跳间隔（毫秒）')
});

/**
 * 应用配置 Schema
 */
export const AppConfigSchema = z.object({
  clientType: z.enum(['ollama', 'vllm']).nullable().describe('客户端类型'),
  frameworkConfig: FrameworkConfigSchema.nullable().describe('框架配置'),
  resourceConfig: ResourceConfigSchema.optional().describe('资源配置'),
  gatewayConfig: GatewayConfigSchema.optional().describe('网关配置'),
  version: z.string().optional().describe('配置版本'),
  lastUpdated: z.string().datetime().describe('最后更新时间'),
  environment: z.enum(['development', 'production', 'test']).optional().default('production').describe('环境类型'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).optional().default('info').describe('日志级别'),
  enableMetrics: z.boolean().optional().default(true).describe('是否启用指标收集'),
  enableTelemetry: z.boolean().optional().default(false).describe('是否启用遥测')
});

/**
 * 配置验证结果 Schema
 */
export const ConfigValidationResultSchema = z.object({
  isValid: z.boolean().describe('配置是否有效'),
  errors: z.array(z.string()).describe('错误列表'),
  warnings: z.array(z.string()).describe('警告列表'),
  suggestions: z.array(z.string()).optional().describe('建议列表')
});

/**
 * 配置变更事件 Schema
 */
export const ConfigChangeEventSchema = z.object({
  configFile: z.string().describe('配置文件名'),
  key: z.string().describe('变更的配置键'),
  oldValue: z.any().describe('旧值'),
  newValue: z.any().describe('新值'),
  timestamp: z.string().datetime().describe('变更时间戳'),
  source: z.enum(['user', 'system', 'api']).optional().describe('变更来源')
});

// 导出类型
export type BaseFrameworkConfig = z.infer<typeof BaseFrameworkConfigSchema>;
export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;
export type VllmConfig = z.infer<typeof VllmConfigSchema>;
export type FrameworkConfig = z.infer<typeof FrameworkConfigSchema>;
export type ResourceConfig = z.infer<typeof ResourceConfigSchema>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ConfigValidationResult = z.infer<typeof ConfigValidationResultSchema>;
export type ConfigChangeEvent = z.infer<typeof ConfigChangeEventSchema>;

// 导出 schemas 集合
export const FrameworkConfigSchemas = {
  BaseFrameworkConfigSchema,
  OllamaConfigSchema,
  VllmConfigSchema,
  FrameworkConfigSchema,
  ResourceConfigSchema,
  GatewayConfigSchema,
  AppConfigSchema,
  ConfigValidationResultSchema,
  ConfigChangeEventSchema
} as const;
