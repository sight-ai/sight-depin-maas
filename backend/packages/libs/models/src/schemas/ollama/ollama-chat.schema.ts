import { z } from 'zod';

/**
 * Ollama 聊天相关的 Zod Schema 定义
 * 
 * 包含：
 * 1. 聊天消息格式
 * 2. 聊天请求和响应
 * 3. 工具函数定义
 */

/**
 * 聊天消息格式
 */
export const OllamaChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('消息角色'),
  content: z.string().describe('消息内容'),
  images: z.array(z.string()).optional().describe('图片 URL 数组（可选）')
});

/**
 * 工具函数格式
 */
export const OllamaToolFunctionSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string().describe('函数名称'),
    description: z.string().describe('函数描述'),
    parameters: z.object({
      type: z.string().describe('参数类型'),
      properties: z.record(z.any()).describe('参数属性'),
      required: z.array(z.string()).optional().describe('必需参数列表')
    })
  })
});

/**
 * Ollama 聊天请求格式
 */
export const OllamaChatRequestSchema = z.object({
  model: z.string().describe('模型名称'),
  messages: z.array(OllamaChatMessageSchema).describe('消息数组'),
  stream: z.boolean().optional().default(true).describe('是否流式响应'),
  format: z.string().optional().describe('响应格式'),
  keep_alive: z.number().optional().describe('保持活跃时间'),
  options: z.object({
    temperature: z.number().min(0).max(2).optional().describe('温度参数'),
    top_p: z.number().min(0).max(1).optional().describe('Top-p 参数'),
    top_k: z.number().int().positive().optional().describe('Top-k 参数'),
    num_predict: z.number().int().positive().optional().describe('预测数量'),
    repeat_penalty: z.number().optional().describe('重复惩罚'),
    seed: z.number().int().optional().describe('随机种子')
  }).optional().describe('生成选项'),
  tools: z.array(OllamaToolFunctionSchema).optional().describe('可用工具'),
  // 自定义字段
  task_id: z.string().optional().describe('任务 ID'),
  device_id: z.string().optional().describe('设备 ID')
});

/**
 * Ollama 聊天响应格式
 */
export const OllamaChatResponseSchema = z.object({
  model: z.string().describe('模型名称'),
  created_at: z.string().describe('创建时间'),
  message: OllamaChatMessageSchema.describe('响应消息'),
  done: z.boolean().describe('是否完成'),
  done_reason: z.string().optional().describe('完成原因'),
  total_duration: z.number().optional().describe('总耗时（纳秒）'),
  load_duration: z.number().optional().describe('加载耗时（纳秒）'),
  prompt_eval_count: z.number().optional().describe('提示评估数量'),
  prompt_eval_duration: z.number().optional().describe('提示评估耗时（纳秒）'),
  eval_count: z.number().optional().describe('评估数量'),
  eval_duration: z.number().optional().describe('评估耗时（纳秒）')
});

/**
 * Ollama 聊天流式响应块
 */
export const OllamaChatStreamChunkSchema = z.object({
  model: z.string().describe('模型名称'),
  created_at: z.string().describe('创建时间'),
  message: z.object({
    role: z.string().describe('角色'),
    content: z.string().describe('内容片段')
  }).describe('消息片段'),
  done: z.boolean().describe('是否完成')
});

// 导出类型
export type OllamaChatMessage = z.infer<typeof OllamaChatMessageSchema>;
export type OllamaToolFunction = z.infer<typeof OllamaToolFunctionSchema>;
export type OllamaChatRequest = z.infer<typeof OllamaChatRequestSchema>;
export type OllamaChatResponse = z.infer<typeof OllamaChatResponseSchema>;
export type OllamaChatStreamChunk = z.infer<typeof OllamaChatStreamChunkSchema>;

/**
 * Ollama Generate Request Schema (非聊天模式)
 */
export const OllamaGenerateRequestSchema = z.object({
  model: z.string().describe('模型名称'),
  prompt: z.string().describe('提示文本'),
  suffix: z.string().optional().describe('后缀文本'),
  images: z.array(z.string()).optional().describe('图片数组（base64编码）'),
  format: z.enum(['json']).optional().describe('响应格式'),
  options: z.record(z.any()).optional().describe('模型选项'),
  system: z.string().optional().describe('系统消息'),
  template: z.string().optional().describe('提示模板'),
  context: z.array(z.number()).optional().describe('上下文数组'),
  stream: z.boolean().optional().describe('是否流式响应'),
  raw: z.boolean().optional().describe('是否原始模式'),
  keep_alive: z.string().optional().describe('保持活跃时间')
}).catchall(z.any());

/**
 * Ollama Generate Response Schema
 */
export const OllamaGenerateResponseSchema = z.object({
  model: z.string().describe('模型名称'),
  created_at: z.string().describe('创建时间'),
  response: z.string().describe('生成的响应'),
  done: z.boolean().describe('是否完成'),
  context: z.array(z.number()).optional().describe('上下文数组'),
  total_duration: z.number().optional().describe('总耗时（纳秒）'),
  load_duration: z.number().optional().describe('加载耗时（纳秒）'),
  prompt_eval_count: z.number().optional().describe('提示评估 token 数'),
  prompt_eval_duration: z.number().optional().describe('提示评估耗时（纳秒）'),
  eval_count: z.number().optional().describe('评估 token 数'),
  eval_duration: z.number().optional().describe('评估耗时（纳秒）')
});

// 导出新增的类型（避免重复导出）
export type OllamaGenerateRequest = z.infer<typeof OllamaGenerateRequestSchema>;
export type OllamaGenerateResponse = z.infer<typeof OllamaGenerateResponseSchema>;

// 导出 schemas 集合
export const OllamaChatSchemas = {
  OllamaChatMessageSchema,
  OllamaToolFunctionSchema,
  OllamaChatRequestSchema,
  OllamaChatResponseSchema,
  OllamaChatStreamChunkSchema,
  OllamaGenerateRequestSchema,
  OllamaGenerateResponseSchema
} as const;
