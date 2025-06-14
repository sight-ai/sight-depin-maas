import { z } from 'zod';

/**
 * 请求响应相关的 Zod Schema 定义
 * 
 * 从 model-inference-client/model-operations/request-response.types.ts 迁移而来
 * 提供统一的请求响应格式验证
 */

/**
 * 基础消息 Schema
 */
export const BaseMessageSchema = z.object({
  role: z.string().describe('消息角色'),
  content: z.string().describe('消息内容')
});

/**
 * 聊天请求 Schema
 */
export const ChatRequestSchema = z.object({
  messages: z.array(BaseMessageSchema).min(1).describe('消息数组'),
  model: z.string().optional().describe('模型名称'),
  stream: z.boolean().optional().describe('是否流式响应'),
  temperature: z.number().min(0).max(2).optional().describe('温度参数'),
  max_tokens: z.number().int().positive().optional().describe('最大 token 数')
}).catchall(z.any()); // 允许额外的字段

/**
 * 补全请求 Schema
 */
export const CompletionRequestSchema = z.object({
  prompt: z.string().describe('提示文本'),
  model: z.string().optional().describe('模型名称'),
  stream: z.boolean().optional().describe('是否流式响应'),
  temperature: z.number().min(0).max(2).optional().describe('温度参数'),
  max_tokens: z.number().int().positive().optional().describe('最大 token 数')
}).catchall(z.any()); // 允许额外的字段

/**
 * 嵌入向量请求 Schema
 */
export const EmbeddingsRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]).describe('输入文本'),
  model: z.string().optional().describe('模型名称')
}).catchall(z.any()); // 允许额外的字段

/**
 * 嵌入向量数据项 Schema
 */
export const EmbeddingDataItemSchema = z.object({
  object: z.string().describe('对象类型'),
  embedding: z.array(z.number()).describe('嵌入向量'),
  index: z.number().int().nonnegative().describe('索引')
});

/**
 * 嵌入向量使用统计 Schema
 */
export const EmbeddingUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative().describe('提示 token 数'),
  total_tokens: z.number().int().nonnegative().describe('总 token 数')
});

/**
 * 嵌入向量响应 Schema
 */
export const EmbeddingsResponseSchema = z.object({
  object: z.string().describe('对象类型'),
  data: z.array(EmbeddingDataItemSchema).describe('嵌入向量数据'),
  model: z.string().describe('模型名称'),
  usage: EmbeddingUsageSchema.describe('使用统计')
});

/**
 * 聊天响应选择项 Schema
 */
export const ChatChoiceSchema = z.object({
  index: z.number().int().nonnegative().describe('选择项索引'),
  message: BaseMessageSchema.describe('响应消息'),
  finish_reason: z.string().nullable().describe('完成原因')
});

/**
 * 聊天响应 Schema
 */
export const ChatResponseSchema = z.object({
  id: z.string().describe('响应 ID'),
  object: z.string().describe('对象类型'),
  created: z.number().int().positive().describe('创建时间戳'),
  model: z.string().describe('使用的模型'),
  choices: z.array(ChatChoiceSchema).describe('选择项数组'),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().describe('提示 token 数'),
    completion_tokens: z.number().int().nonnegative().describe('补全 token 数'),
    total_tokens: z.number().int().nonnegative().describe('总 token 数')
  }).optional().describe('使用统计')
});

/**
 * 流式响应增量 Schema
 */
export const StreamDeltaSchema = z.object({
  role: z.string().optional().describe('角色'),
  content: z.string().optional().describe('内容增量')
});

/**
 * 流式响应选择项 Schema
 */
export const StreamChoiceSchema = z.object({
  index: z.number().int().nonnegative().describe('选择项索引'),
  delta: StreamDeltaSchema.describe('增量内容'),
  finish_reason: z.string().nullable().describe('完成原因')
});

/**
 * 流式响应块 Schema
 */
export const StreamResponseChunkSchema = z.object({
  id: z.string().describe('响应 ID'),
  object: z.string().describe('对象类型'),
  created: z.number().int().positive().describe('创建时间戳'),
  model: z.string().describe('使用的模型'),
  choices: z.array(StreamChoiceSchema).describe('流式选择项数组')
});

/**
 * 补全响应 Schema
 */
export const CompletionResponseSchema = z.object({
  id: z.string().describe('响应 ID'),
  object: z.string().describe('对象类型'),
  created: z.number().int().positive().describe('创建时间戳'),
  model: z.string().describe('使用的模型'),
  choices: z.array(z.object({
    text: z.string().describe('补全文本'),
    index: z.number().int().nonnegative().describe('选择项索引'),
    finish_reason: z.string().nullable().describe('完成原因')
  })).describe('选择项数组'),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().describe('提示 token 数'),
    completion_tokens: z.number().int().nonnegative().describe('补全 token 数'),
    total_tokens: z.number().int().nonnegative().describe('总 token 数')
  }).optional().describe('使用统计')
});

/**
 * 模型信息 Schema
 */
export const ModelInfoSchema = z.object({
  id: z.string().describe('模型 ID'),
  object: z.string().describe('对象类型'),
  created: z.number().int().positive().optional().describe('创建时间戳'),
  owned_by: z.string().optional().describe('拥有者'),
  permission: z.array(z.any()).optional().describe('权限信息'),
  root: z.string().optional().describe('根模型'),
  parent: z.string().optional().describe('父模型')
});

/**
 * 模型列表响应 Schema
 */
export const ModelListResponseSchema = z.object({
  object: z.string().describe('对象类型'),
  data: z.array(ModelInfoSchema).describe('模型列表')
});

/**
 * 错误响应 Schema
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string().describe('错误消息'),
    type: z.string().describe('错误类型'),
    param: z.string().nullable().optional().describe('错误参数'),
    code: z.string().optional().describe('错误代码')
  }).describe('错误信息')
});

/**
 * 健康检查响应 Schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']).describe('健康状态'),
  version: z.string().optional().describe('版本信息'),
  timestamp: z.string().datetime().describe('检查时间'),
  details: z.record(z.any()).optional().describe('详细信息')
});

/**
 * 通用 API 响应包装器 Schema
 */
export const ApiResponseWrapperSchema = z.object({
  success: z.boolean().describe('请求是否成功'),
  data: z.any().optional().describe('响应数据'),
  error: z.string().optional().describe('错误信息'),
  timestamp: z.string().datetime().describe('响应时间戳'),
  requestId: z.string().optional().describe('请求 ID'),
  duration: z.number().nonnegative().optional().describe('处理时间（毫秒）')
});

// 导出类型
export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;
export type EmbeddingsRequest = z.infer<typeof EmbeddingsRequestSchema>;
export type EmbeddingDataItem = z.infer<typeof EmbeddingDataItemSchema>;
export type EmbeddingUsage = z.infer<typeof EmbeddingUsageSchema>;
export type EmbeddingsResponse = z.infer<typeof EmbeddingsResponseSchema>;
export type ChatChoice = z.infer<typeof ChatChoiceSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type StreamDelta = z.infer<typeof StreamDeltaSchema>;
export type StreamChoice = z.infer<typeof StreamChoiceSchema>;
export type StreamResponseChunk = z.infer<typeof StreamResponseChunkSchema>;
export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;
export type ModelInfo = z.infer<typeof ModelInfoSchema>;
export type ModelListResponse = z.infer<typeof ModelListResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type ApiResponseWrapper<T = any> = Omit<z.infer<typeof ApiResponseWrapperSchema>, 'data'> & { data?: T };

// 导出 schemas 集合
export const RequestResponseSchemas = {
  BaseMessageSchema,
  ChatRequestSchema,
  CompletionRequestSchema,
  EmbeddingsRequestSchema,
  EmbeddingDataItemSchema,
  EmbeddingUsageSchema,
  EmbeddingsResponseSchema,
  ChatChoiceSchema,
  ChatResponseSchema,
  StreamDeltaSchema,
  StreamChoiceSchema,
  StreamResponseChunkSchema,
  CompletionResponseSchema,
  ModelInfoSchema,
  ModelListResponseSchema,
  ErrorResponseSchema,
  HealthCheckResponseSchema,
  ApiResponseWrapperSchema
} as const;
