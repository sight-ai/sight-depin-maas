import { z } from 'zod';

/**
 * Ollama 模型管理相关的 Zod Schema 定义
 * 
 * 包含：
 * 1. 模型信息格式
 * 2. 模型列表和详情
 * 3. 模型操作（拉取、推送、创建、删除）
 */

/**
 * 模型详情信息
 */
export const OllamaModelDetailsSchema = z.object({
  parent_model: z.string().optional().describe('父模型'),
  format: z.string().describe('模型格式'),
  family: z.string().describe('模型家族'),
  families: z.array(z.string()).optional().describe('模型家族列表'),
  parameter_size: z.string().describe('参数大小'),
  quantization_level: z.string().describe('量化级别')
});

/**
 * 基础模型信息
 */
export const OllamaModelSchema = z.object({
  name: z.string().describe('模型名称'),
  model: z.string().optional().describe('模型标识'),
  modified_at: z.string().describe('修改时间'),
  size: z.number().describe('模型大小（字节）'),
  digest: z.string().describe('模型摘要'),
  details: OllamaModelDetailsSchema.describe('模型详情')
});

/**
 * 模型列表响应
 */
export const OllamaModelListSchema = z.object({
  models: z.array(OllamaModelSchema).describe('模型列表')
});

/**
 * 模型详细信息响应
 */
export const OllamaModelInfoSchema = z.object({
  modelfile: z.string().describe('模型文件内容'),
  parameters: z.string().describe('模型参数'),
  template: z.string().describe('模型模板'),
  details: OllamaModelDetailsSchema.describe('模型详情'),
  model_info: z.record(z.any()).describe('额外模型信息'),
  license: z.string().optional().describe('许可证'),
  system: z.string().optional().describe('系统提示')
});

/**
 * 运行中的模型信息
 */
export const OllamaRunningModelSchema = z.object({
  name: z.string().describe('模型名称'),
  model: z.string().describe('模型标识'),
  size: z.number().describe('模型大小'),
  digest: z.string().describe('模型摘要'),
  details: OllamaModelDetailsSchema.describe('模型详情'),
  expires_at: z.string().describe('过期时间'),
  size_vram: z.number().describe('显存占用大小')
});

/**
 * 运行中的模型列表
 */
export const OllamaRunningModelsSchema = z.object({
  models: z.array(OllamaRunningModelSchema).describe('运行中的模型列表')
});

/**
 * 模型拉取请求
 */
export const OllamaModelPullRequestSchema = z.object({
  model: z.string().describe('要拉取的模型名称'),
  insecure: z.boolean().optional().describe('是否允许不安全连接'),
  stream: z.boolean().optional().default(true).describe('是否流式响应')
});

/**
 * 模型拉取响应
 */
export const OllamaModelPullResponseSchema = z.object({
  status: z.string().describe('拉取状态'),
  digest: z.string().optional().describe('模型摘要'),
  total: z.number().optional().describe('总大小'),
  completed: z.number().optional().describe('已完成大小')
});

/**
 * 模型推送请求
 */
export const OllamaModelPushRequestSchema = z.object({
  model: z.string().describe('要推送的模型名称'),
  insecure: z.boolean().optional().describe('是否允许不安全连接'),
  stream: z.boolean().optional().default(true).describe('是否流式响应')
});

/**
 * 模型推送响应
 */
export const OllamaModelPushResponseSchema = z.object({
  status: z.string().describe('推送状态'),
  digest: z.string().optional().describe('模型摘要'),
  total: z.number().optional().describe('总大小'),
  completed: z.number().optional().describe('已完成大小')
});

/**
 * 模型创建请求
 */
export const OllamaModelCreateRequestSchema = z.object({
  model: z.string().describe('新模型名称'),
  from: z.string().optional().describe('基础模型'),
  files: z.record(z.string()).optional().describe('文件映射'),
  adapters: z.record(z.string()).optional().describe('适配器映射'),
  template: z.string().optional().describe('模型模板'),
  license: z.union([z.string(), z.array(z.string())]).optional().describe('许可证'),
  system: z.string().optional().describe('系统提示'),
  parameters: z.record(z.any()).optional().describe('模型参数'),
  messages: z.array(z.any()).optional().describe('消息模板'),
  stream: z.boolean().optional().default(true).describe('是否流式响应'),
  quantize: z.string().optional().describe('量化设置')
});

/**
 * 模型创建响应
 */
export const OllamaModelCreateResponseSchema = z.object({
  status: z.string().describe('创建状态')
});

/**
 * 模型删除请求
 */
export const OllamaModelDeleteRequestSchema = z.object({
  name: z.string().describe('要删除的模型名称')
});

/**
 * 模型复制请求
 */
export const OllamaModelCopyRequestSchema = z.object({
  source: z.string().describe('源模型名称'),
  destination: z.string().describe('目标模型名称')
});

/**
 * 版本信息响应
 */
export const OllamaVersionResponseSchema = z.object({
  version: z.string().describe('Ollama 版本')
});

// 导出类型
export type OllamaModelDetails = z.infer<typeof OllamaModelDetailsSchema>;
export type OllamaModel = z.infer<typeof OllamaModelSchema>;
export type OllamaModelList = z.infer<typeof OllamaModelListSchema>;
export type OllamaModelInfo = z.infer<typeof OllamaModelInfoSchema>;
export type OllamaRunningModel = z.infer<typeof OllamaRunningModelSchema>;
export type OllamaRunningModels = z.infer<typeof OllamaRunningModelsSchema>;
export type OllamaModelPullRequest = z.infer<typeof OllamaModelPullRequestSchema>;
export type OllamaModelPullResponse = z.infer<typeof OllamaModelPullResponseSchema>;
export type OllamaModelPushRequest = z.infer<typeof OllamaModelPushRequestSchema>;
export type OllamaModelPushResponse = z.infer<typeof OllamaModelPushResponseSchema>;
export type OllamaModelCreateRequest = z.infer<typeof OllamaModelCreateRequestSchema>;
export type OllamaModelCreateResponse = z.infer<typeof OllamaModelCreateResponseSchema>;
export type OllamaModelDeleteRequest = z.infer<typeof OllamaModelDeleteRequestSchema>;
export type OllamaModelCopyRequest = z.infer<typeof OllamaModelCopyRequestSchema>;
export type OllamaVersionResponse = z.infer<typeof OllamaVersionResponseSchema>;

// 导出 schemas 集合
export const OllamaModelSchemas = {
  OllamaModelDetailsSchema,
  OllamaModelSchema,
  OllamaModelListSchema,
  OllamaModelInfoSchema,
  OllamaRunningModelSchema,
  OllamaRunningModelsSchema,
  OllamaModelPullRequestSchema,
  OllamaModelPullResponseSchema,
  OllamaModelPushRequestSchema,
  OllamaModelPushResponseSchema,
  OllamaModelCreateRequestSchema,
  OllamaModelCreateResponseSchema,
  OllamaModelDeleteRequestSchema,
  OllamaModelCopyRequestSchema,
  OllamaVersionResponseSchema
} as const;
