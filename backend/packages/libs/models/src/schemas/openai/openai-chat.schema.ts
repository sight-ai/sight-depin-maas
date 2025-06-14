import { z } from 'zod';

/**
 * OpenAI 聊天相关的 Zod Schema 定义
 * 
 * 包含：
 * 1. 聊天消息格式
 * 2. 聊天请求和响应
 * 3. 流式响应格式
 */

/**
 * OpenAI 聊天消息格式
 */
export const OpenAIChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']).describe('消息角色'),
  content: z.string().nullable().describe('消息内容'),
  name: z.string().optional().describe('消息发送者名称'),
  function_call: z.object({
    name: z.string().describe('函数名称'),
    arguments: z.string().describe('函数参数（JSON 字符串）')
  }).optional().describe('函数调用信息')
});

/**
 * OpenAI 函数定义
 */
export const OpenAIFunctionSchema = z.object({
  name: z.string().describe('函数名称'),
  description: z.string().optional().describe('函数描述'),
  parameters: z.object({
    type: z.literal('object').describe('参数类型'),
    properties: z.record(z.any()).describe('参数属性'),
    required: z.array(z.string()).optional().describe('必需参数列表')
  }).describe('函数参数定义')
});

/**
 * OpenAI 聊天补全请求
 */
export const OpenAIChatCompletionRequestSchema = z.object({
  model: z.string().describe('模型名称'),
  messages: z.array(OpenAIChatMessageSchema).min(1).describe('消息数组'),
  temperature: z.number().min(0).max(2).optional().describe('温度参数'),
  top_p: z.number().min(0).max(1).optional().describe('Top-p 参数'),
  n: z.number().int().positive().optional().default(1).describe('生成数量'),
  stream: z.boolean().optional().default(false).describe('是否流式响应'),
  stop: z.union([z.string(), z.array(z.string())]).optional().describe('停止词'),
  max_tokens: z.number().int().positive().optional().describe('最大 token 数'),
  presence_penalty: z.number().min(-2).max(2).optional().describe('存在惩罚'),
  frequency_penalty: z.number().min(-2).max(2).optional().describe('频率惩罚'),
  logit_bias: z.record(z.number()).optional().describe('logit 偏置'),
  user: z.string().optional().describe('用户标识'),
  functions: z.array(OpenAIFunctionSchema).optional().describe('可用函数'),
  function_call: z.union([
    z.literal('none'),
    z.literal('auto'),
    z.object({ name: z.string() })
  ]).optional().describe('函数调用控制'),
  // 自定义字段
  task_id: z.string().optional().describe('任务 ID'),
  device_id: z.string().optional().describe('设备 ID')
});

/**
 * OpenAI 聊天补全选择项
 */
export const OpenAIChatCompletionChoiceSchema = z.object({
  index: z.number().int().nonnegative().describe('选择项索引'),
  message: OpenAIChatMessageSchema.describe('响应消息'),
  finish_reason: z.enum(['stop', 'length', 'function_call', 'content_filter']).nullable().describe('完成原因')
});

/**
 * OpenAI 使用统计
 */
export const OpenAIUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative().describe('提示 token 数'),
  completion_tokens: z.number().int().nonnegative().describe('补全 token 数'),
  total_tokens: z.number().int().nonnegative().describe('总 token 数')
});

/**
 * OpenAI 聊天补全响应
 */
export const OpenAIChatCompletionResponseSchema = z.object({
  id: z.string().describe('响应 ID'),
  object: z.literal('chat.completion').describe('对象类型'),
  created: z.number().int().positive().describe('创建时间戳'),
  model: z.string().describe('使用的模型'),
  choices: z.array(OpenAIChatCompletionChoiceSchema).describe('选择项数组'),
  usage: OpenAIUsageSchema.describe('使用统计'),
  system_fingerprint: z.string().optional().describe('系统指纹')
});

/**
 * OpenAI 流式响应增量
 */
export const OpenAIChatCompletionDeltaSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']).optional().describe('角色'),
  content: z.string().optional().describe('内容增量'),
  function_call: z.object({
    name: z.string().optional().describe('函数名称'),
    arguments: z.string().optional().describe('函数参数增量')
  }).optional().describe('函数调用增量')
});

/**
 * OpenAI 流式响应选择项
 */
export const OpenAIChatCompletionStreamChoiceSchema = z.object({
  index: z.number().int().nonnegative().describe('选择项索引'),
  delta: OpenAIChatCompletionDeltaSchema.describe('增量内容'),
  finish_reason: z.enum(['stop', 'length', 'function_call', 'content_filter']).nullable().describe('完成原因')
});

/**
 * OpenAI 聊天补全流式响应块
 */
export const OpenAIChatCompletionChunkSchema = z.object({
  id: z.string().describe('响应 ID'),
  object: z.literal('chat.completion.chunk').describe('对象类型'),
  created: z.number().int().positive().describe('创建时间戳'),
  model: z.string().describe('使用的模型'),
  choices: z.array(OpenAIChatCompletionStreamChoiceSchema).describe('流式选择项数组'),
  system_fingerprint: z.string().optional().describe('系统指纹')
});

// 导出类型
export type OpenAIChatMessage = z.infer<typeof OpenAIChatMessageSchema>;
export type OpenAIFunction = z.infer<typeof OpenAIFunctionSchema>;
export type OpenAIChatCompletionRequest = z.infer<typeof OpenAIChatCompletionRequestSchema>;
export type OpenAIChatCompletionChoice = z.infer<typeof OpenAIChatCompletionChoiceSchema>;
export type OpenAIUsage = z.infer<typeof OpenAIUsageSchema>;
export type OpenAIChatCompletionResponse = z.infer<typeof OpenAIChatCompletionResponseSchema>;
export type OpenAIChatCompletionDelta = z.infer<typeof OpenAIChatCompletionDeltaSchema>;
export type OpenAIChatCompletionStreamChoice = z.infer<typeof OpenAIChatCompletionStreamChoiceSchema>;
export type OpenAIChatCompletionChunk = z.infer<typeof OpenAIChatCompletionChunkSchema>;

/**
 * OpenAI Completion Request Schema (非聊天模式)
 */
export const OpenAICompletionRequestSchema = z.object({
  model: z.string().describe('模型名称'),
  prompt: z.union([z.string(), z.array(z.string())]).describe('提示文本'),
  max_tokens: z.number().int().positive().optional().describe('最大 token 数'),
  temperature: z.number().min(0).max(2).optional().describe('温度参数'),
  top_p: z.number().min(0).max(1).optional().describe('Top P 参数'),
  n: z.number().int().positive().optional().describe('生成数量'),
  stream: z.boolean().optional().describe('是否流式响应'),
  logprobs: z.number().int().min(0).max(5).optional().describe('日志概率数量'),
  echo: z.boolean().optional().describe('是否回显提示'),
  stop: z.union([z.string(), z.array(z.string())]).optional().describe('停止词'),
  presence_penalty: z.number().min(-2).max(2).optional().describe('存在惩罚'),
  frequency_penalty: z.number().min(-2).max(2).optional().describe('频率惩罚'),
  best_of: z.number().int().positive().optional().describe('最佳选择数'),
  logit_bias: z.record(z.number()).optional().describe('logit 偏置'),
  user: z.string().optional().describe('用户标识')
}).catchall(z.any());

/**
 * OpenAI Completion Response Schema
 */
export const OpenAICompletionResponseSchema = z.object({
  id: z.string().describe('响应 ID'),
  object: z.string().describe('对象类型'),
  created: z.number().int().positive().describe('创建时间戳'),
  model: z.string().describe('使用的模型'),
  choices: z.array(z.object({
    text: z.string().describe('生成的文本'),
    index: z.number().int().nonnegative().describe('选择项索引'),
    logprobs: z.any().nullable().describe('日志概率'),
    finish_reason: z.string().nullable().describe('完成原因')
  })).describe('选择项数组'),
  usage: OpenAIUsageSchema.optional().describe('使用统计')
});

// 导出新增的类型（避免重复导出）
export type OpenAICompletionRequest = z.infer<typeof OpenAICompletionRequestSchema>;
export type OpenAICompletionResponse = z.infer<typeof OpenAICompletionResponseSchema>;

// 导出 schemas 集合
export const OpenAIChatSchemas = {
  OpenAIChatMessageSchema,
  OpenAIFunctionSchema,
  OpenAIChatCompletionRequestSchema,
  OpenAIChatCompletionChoiceSchema,
  OpenAIUsageSchema,
  OpenAIChatCompletionResponseSchema,
  OpenAIChatCompletionDeltaSchema,
  OpenAIChatCompletionStreamChoiceSchema,
  OpenAIChatCompletionChunkSchema,
  OpenAICompletionRequestSchema,
  OpenAICompletionResponseSchema
} as const;
