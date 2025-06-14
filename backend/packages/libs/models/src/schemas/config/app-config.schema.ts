import { z } from 'zod';

/**
 * 应用配置相关的 Zod Schema 定义
 * 
 * 从 common/types/config.types.ts 迁移而来
 */

// 注意：ConfigChangeEventSchema, ConfigValidationResultSchema, GatewayConfigSchema
// 已在 framework-config.schema.ts 中定义，这里不重复定义以避免冲突

/**
 * Ollama 框架配置 Schema
 */
export const OllamaFrameworkConfigSchema = z.object({
  framework: z.literal('ollama').describe('框架类型'),
  baseUrl: z.string().url().describe('Ollama 服务 URL'),
  timeout: z.number().positive().default(30000).describe('超时时间（毫秒）'),
  retries: z.number().nonnegative().default(3).describe('重试次数'),
  enableHealthCheck: z.boolean().default(true).describe('是否启用健康检查'),
  healthCheckInterval: z.number().positive().default(30000).describe('健康检查间隔（毫秒）'),
  models: z.array(z.string()).optional().describe('可用模型列表'),
  defaultModel: z.string().optional().describe('默认模型'),
  // Ollama 特有配置
  keepAlive: z.string().optional().describe('模型保持活跃时间'),
  numCtx: z.number().int().positive().optional().describe('上下文长度'),
  numGpu: z.number().int().nonnegative().optional().describe('GPU 数量'),
  numThread: z.number().int().positive().optional().describe('线程数'),
  repeatLastN: z.number().int().nonnegative().optional().describe('重复惩罚窗口'),
  repeatPenalty: z.number().positive().optional().describe('重复惩罚系数'),
  temperature: z.number().min(0).max(2).optional().describe('温度参数'),
  seed: z.number().int().optional().describe('随机种子'),
  stop: z.array(z.string()).optional().describe('停止词'),
  tfsZ: z.number().positive().optional().describe('TFS Z 参数'),
  numPredict: z.number().int().positive().optional().describe('预测 token 数'),
  topK: z.number().int().positive().optional().describe('Top K 参数'),
  topP: z.number().min(0).max(1).optional().describe('Top P 参数'),
  numa: z.boolean().optional().describe('是否启用 NUMA')
});

/**
 * vLLM 框架配置 Schema
 */
export const VllmFrameworkConfigSchema = z.object({
  framework: z.literal('vllm').describe('框架类型'),
  baseUrl: z.string().url().describe('vLLM 服务 URL'),
  timeout: z.number().positive().default(30000).describe('超时时间（毫秒）'),
  retries: z.number().nonnegative().default(3).describe('重试次数'),
  enableHealthCheck: z.boolean().default(true).describe('是否启用健康检查'),
  healthCheckInterval: z.number().positive().default(30000).describe('健康检查间隔（毫秒）'),
  models: z.array(z.string()).optional().describe('可用模型列表'),
  apiKey: z.string().optional().describe('API 密钥'),
  // vLLM 特有配置
  maxTokens: z.number().int().positive().optional().describe('最大 token 数'),
  temperature: z.number().min(0).max(2).optional().describe('温度参数'),
  topP: z.number().min(0).max(1).optional().describe('Top P 参数'),
  topK: z.number().int().positive().optional().describe('Top K 参数'),
  frequencyPenalty: z.number().min(-2).max(2).optional().describe('频率惩罚'),
  presencePenalty: z.number().min(-2).max(2).optional().describe('存在惩罚'),
  repetitionPenalty: z.number().positive().optional().describe('重复惩罚'),
  seed: z.number().int().optional().describe('随机种子'),
  stop: z.array(z.string()).optional().describe('停止词'),
  stream: z.boolean().optional().describe('是否流式响应'),
  logprobs: z.number().int().nonnegative().optional().describe('日志概率数量'),
  echo: z.boolean().optional().describe('是否回显输入'),
  maxContextLenToCapture: z.number().int().positive().optional().describe('最大上下文捕获长度')
});

// AppConfigSchema 已在 framework-config.schema.ts 中定义，这里不重复定义

/**
 * 本地配置 Schema
 */
export const LocalConfigSchema = z.object({
  configPath: z.string().describe('配置文件路径'),
  autoSave: z.boolean().default(true).describe('是否自动保存'),
  backupCount: z.number().int().nonnegative().default(5).describe('备份文件数量'),
  encryptionEnabled: z.boolean().default(false).describe('是否启用加密'),
  lastBackup: z.string().datetime().optional().describe('最后备份时间')
});

// 导出类型（只导出这个文件中定义的类型）
export type OllamaFrameworkConfig = z.infer<typeof OllamaFrameworkConfigSchema>;
export type VllmFrameworkConfig = z.infer<typeof VllmFrameworkConfigSchema>;
export type LocalConfig = z.infer<typeof LocalConfigSchema>;

// 配置变更回调函数类型
export type ConfigChangeCallback = (event: any) => void | Promise<void>;

// 导出 schemas 集合（只包含这个文件中定义的 schemas）
export const AppConfigSchemas = {
  OllamaFrameworkConfigSchema,
  VllmFrameworkConfigSchema,
  LocalConfigSchema
} as const;
