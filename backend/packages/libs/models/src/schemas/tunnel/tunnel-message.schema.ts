import { z } from 'zod';
import {
  OpenAIChatCompletionRequestSchema,
  OpenAICompletionRequestSchema,
  OpenAIChatCompletionChunkSchema
} from '../openai/openai-chat.schema';

/**
 * Tunnel 消息相关的 Zod Schema 定义
 * 
 * 包含：
 * 1. 基础消息格式
 * 2. Ping/Pong 消息
 * 3. 上下文消息
 * 4. 任务相关消息
 */

/**
 * 基础 Tunnel 消息 Schema
 */
export const BaseTunnelMessageSchema = z.object({
  type: z.string().describe('消息类型'),
  from: z.string().describe('发送方ID'),
  to: z.string().describe('接收方ID'),
  timestamp: z.number().optional().describe('时间戳'),
});

/**
 * Ping 消息载荷 Schema
 */
export const PingPayloadSchema = z.object({
  message: z.string().describe('Ping消息内容'),
  timestamp: z.number().describe('发送时间戳'),
});

/**
 * Pong 消息载荷 Schema
 */
export const PongPayloadSchema = z.object({
  message: z.string().describe('Pong消息内容'),
  timestamp: z.number().describe('响应时间戳'),
});

/**
 * 上下文 Ping 消息载荷 Schema
 */
export const ContextPingPayloadSchema = z.object({
  requestId: z.string().describe('请求ID'),
  message: z.string().describe('消息内容'),
  timestamp: z.number().describe('发送时间戳'),
});

/**
 * 上下文 Pong 消息载荷 Schema
 */
export const ContextPongPayloadSchema = z.object({
  requestId: z.string().describe('请求ID'),
  message: z.string().describe('消息内容'),
  timestamp: z.number().describe('响应时间戳'),
});

/**
 * 任务请求消息载荷 Schema
 */
export const TaskRequestPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  type: z.enum(['chat_request_stream', 'chat_request_no_stream', 'generate_request_stream', 'generate_request_no_stream', 'proxy_request']).describe('任务类型'),
  data: z.any().describe('任务数据'),
  path: z.string().optional().describe('请求路径'),
});

/**
 * 任务响应消息载荷 Schema
 */
export const TaskResponsePayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  data: z.any().describe('响应数据'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * 任务流式响应消息载荷 Schema
 */
export const TaskStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  chunk: z.any().describe('数据块'),
  done: z.boolean().optional().describe('是否完成'),
});

/**
 * 设备注册消息载荷 Schema
 */
export const DeviceRegistrationPayloadSchema = z.object({
  deviceId: z.string().describe('设备ID'),
  deviceInfo: z.object({
    name: z.string().describe('设备名称'),
    type: z.string().describe('设备类型'),
    capabilities: z.array(z.string()).optional().describe('设备能力'),
  }).describe('设备信息'),
});

/**
 * 设备注册确认消息载荷 Schema
 */
export const DeviceRegisterAckPayloadSchema = z.object({
  success: z.boolean().describe('注册是否成功'),
  deviceId: z.string().describe('设备ID'),
  message: z.string().optional().describe('确认消息'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * Tunnel聊天消息 Schema
 */
export const TunnelChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('角色'),
  content: z.string().describe('消息内容'),
});
export const ChatResponseStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径，用于区分Ollama或OpenAI'),
  data: OpenAIChatCompletionChunkSchema.optional(),
  error: z.string().optional().describe('错误信息'),
});
/**
 * 流式聊天请求消息载荷 Schema
 */
export const ChatRequestStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径，用于区分Ollama或OpenAI'),
  data: OpenAIChatCompletionRequestSchema,
  error: z.string().optional().describe('错误信息'),
});

/**
 * 非流式聊天请求消息载荷 Schema
 */
export const ChatRequestNoStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径，用于区分Ollama或OpenAI'),
  // 响应字段
  data: z.object({
     messages: z.array(TunnelChatMessageSchema).describe('聊天消息列表'),
  model: z.string().optional().describe('模型名称'),
  temperature: z.number().optional().describe('温度参数'),
  max_tokens: z.number().optional().describe('最大令牌数'),
  top_p: z.number().optional().describe('Top-p参数'),
  frequency_penalty: z.number().optional().describe('频率惩罚'),
  presence_penalty: z.number().optional().describe('存在惩罚'),
  }).describe('完整响应数据'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * Chat 兼容性载荷数据 Schema
 * 使用 OpenAI 标准类型
 */
export const ChatCompatibilityDataSchema = OpenAIChatCompletionRequestSchema;

/**
 * Chat 兼容性载荷 Schema
 */
export const ChatCompatibilityPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径'),
  data: ChatCompatibilityDataSchema.describe('兼容性格式的请求数据'),
});

/**
 * 非流式聊天响应消息载荷 Schema
 */
export const ChatResponsePayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  data: z.any().optional().describe('完整响应数据'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * Completion 兼容性载荷数据 Schema
 * 使用 OpenAI 标准类型
 */
export const CompletionCompatibilityDataSchema = OpenAICompletionRequestSchema;

/**
 * Completion 兼容性载荷 Schema
 */
export const CompletionCompatibilityPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径'),
  data: CompletionCompatibilityDataSchema.describe('兼容性格式的请求数据'),
});

/**
 * 流式 Completion 请求消息载荷 Schema
 */
export const CompletionRequestStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径'),
  data: z.any().describe('OpenAI Completion 请求数据'),
});

/**
 * 非流式 Completion 请求消息载荷 Schema
 */
export const CompletionRequestNoStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径'),
  model: z.string().describe('模型名称'),
  prompt: z.union([z.string(), z.array(z.string())]).describe('提示文本'),
  temperature: z.number().optional().describe('温度参数'),
  max_tokens: z.number().optional().describe('最大令牌数'),
  top_p: z.number().optional().describe('Top-p参数'),
  frequency_penalty: z.number().optional().describe('频率惩罚'),
  presence_penalty: z.number().optional().describe('存在惩罚'),
  stop: z.union([z.string(), z.array(z.string())]).optional().describe('停止词'),
  n: z.number().optional().describe('生成数量'),
  echo: z.boolean().optional().describe('是否回显提示'),
  logprobs: z.number().optional().describe('日志概率数量'),
});

/**
 * 流式 Completion 响应消息载荷 Schema
 */
export const CompletionResponseStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().optional().describe('响应路径'),
  data: z.any().optional().describe('流式响应数据'),
  error: z.string().optional().describe('错误信息'),
  done: z.boolean().optional().describe('是否完成'),
});

/**
 * 非流式 Completion 响应消息载荷 Schema
 */
export const CompletionResponsePayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  data: z.any().optional().describe('完整响应数据'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * 流式生成请求消息载荷 Schema
 */
export const GenerateRequestStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径，用于区分Ollama或OpenAI'),
  prompt: z.string().describe('提示文本'),
  model: z.string().optional().describe('模型名称'),
  temperature: z.number().optional().describe('温度参数'),
  max_tokens: z.number().optional().describe('最大令牌数'),
  top_p: z.number().optional().describe('Top-p参数'),
  frequency_penalty: z.number().optional().describe('频率惩罚'),
  presence_penalty: z.number().optional().describe('存在惩罚'),
  stop: z.union([z.string(), z.array(z.string())]).optional().describe('停止词'),
  // 响应字段
  chunk: z.any().optional().describe('流式响应数据块'),
  done: z.boolean().optional().describe('是否完成'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * 非流式生成请求消息载荷 Schema
 */
export const GenerateRequestNoStreamPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径，用于区分Ollama或OpenAI'),
  prompt: z.string().describe('提示文本'),
  model: z.string().optional().describe('模型名称'),
  temperature: z.number().optional().describe('温度参数'),
  max_tokens: z.number().optional().describe('最大令牌数'),
  top_p: z.number().optional().describe('Top-p参数'),
  frequency_penalty: z.number().optional().describe('频率惩罚'),
  presence_penalty: z.number().optional().describe('存在惩罚'),
  stop: z.union([z.string(), z.array(z.string())]).optional().describe('停止词'),
  // 响应字段
  data: z.any().optional().describe('完整响应数据'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * 代理请求消息载荷 Schema
 */
export const ProxyRequestPayloadSchema = z.object({
  taskId: z.string().describe('任务ID'),
  path: z.string().describe('请求路径'),
  method: z.string().optional().describe('HTTP方法'),
  stream: z.boolean().optional().describe('是否流式'),
  data: z.any().describe('请求数据'),
  // 响应字段
  chunk: z.any().optional().describe('流式响应数据块'),
  done: z.boolean().optional().describe('流式完成标志'),
  result: z.any().optional().describe('完整响应数据'),
  error: z.string().optional().describe('错误信息'),
});

/**
 * Ping 消息 Schema
 */
export const PingMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('ping'),
  payload: PingPayloadSchema,
});

/**
 * Pong 消息 Schema
 */
export const PongMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('pong'),
  payload: PongPayloadSchema,
});

/**
 * 上下文 Ping 消息 Schema
 */
export const ContextPingMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('context-ping'),
  payload: ContextPingPayloadSchema,
});

/**
 * 上下文 Pong 消息 Schema
 */
export const ContextPongMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('context-pong'),
  payload: ContextPongPayloadSchema,
});

/**
 * 任务请求消息 Schema
 */
export const TaskRequestMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('task_request'),
  payload: TaskRequestPayloadSchema,
});

/**
 * 任务响应消息 Schema
 */
export const TaskResponseMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('task_response'),
  payload: TaskResponsePayloadSchema,
});

/**
 * 任务流式响应消息 Schema
 */
export const TaskStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('task_stream'),
  payload: TaskStreamPayloadSchema,
});

/**
 * 设备注册消息 Schema
 */
export const DeviceRegistrationMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_registration'),
  payload: DeviceRegistrationPayloadSchema,
});

/**
 * 设备注册确认消息 Schema
 */
export const DeviceRegisterAckMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_register_ack'),
  payload: DeviceRegisterAckPayloadSchema,
});

/**
 * 流式聊天请求消息 Schema
 */
export const ChatRequestStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('chat_request_stream'),
  payload: ChatRequestStreamPayloadSchema,
});

/**
 * 流式聊天响应消息 Schema
 */
export const ChatResponseStreamSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('chat_response_stream'),
  payload: ChatResponseStreamPayloadSchema,
});

/**
 * 非流式聊天请求消息 Schema
 */
export const ChatRequestNoStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('chat_request_no_stream'),
  payload: ChatRequestNoStreamPayloadSchema,
});

/**
 * 非流式聊天响应消息 Schema
 */
export const ChatResponseMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('chat_response'),
  payload: ChatResponsePayloadSchema,
});

/**
 * 流式 Completion 请求消息 Schema
 */
export const CompletionRequestStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('completion_request_stream'),
  payload: CompletionRequestStreamPayloadSchema,
});

/**
 * 非流式 Completion 请求消息 Schema
 */
export const CompletionRequestNoStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('completion_request_no_stream'),
  payload: CompletionRequestNoStreamPayloadSchema,
});

/**
 * 流式 Completion 响应消息 Schema
 */
export const CompletionResponseStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('completion_response_stream'),
  payload: CompletionResponseStreamPayloadSchema,
});

/**
 * 非流式 Completion 响应消息 Schema
 */
export const CompletionResponseMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('completion_response'),
  payload: CompletionResponsePayloadSchema,
});

/**
 * 流式生成请求消息 Schema
 */
export const GenerateRequestStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('generate_request_stream'),
  payload: GenerateRequestStreamPayloadSchema,
});

/**
 * 非流式生成请求消息 Schema
 */
export const GenerateRequestNoStreamMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('generate_request_no_stream'),
  payload: GenerateRequestNoStreamPayloadSchema,
});

/**
 * 代理请求消息 Schema
 */
export const ProxyRequestMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('proxy_request'),
  payload: ProxyRequestPayloadSchema,
});




/**
 * 统一的 Tunnel 消息 Schema
 */
export const TunnelMessageSchema = z.discriminatedUnion('type', [
  PingMessageSchema,
  PongMessageSchema,
  ContextPingMessageSchema,
  ContextPongMessageSchema,
  TaskRequestMessageSchema,
  TaskResponseMessageSchema,
  TaskStreamMessageSchema,
  DeviceRegistrationMessageSchema,
  DeviceRegisterAckMessageSchema,
  ChatRequestStreamMessageSchema,
  ChatResponseStreamSchema,
  ChatRequestNoStreamMessageSchema,
  ChatResponseMessageSchema,
  CompletionRequestStreamMessageSchema,
  CompletionRequestNoStreamMessageSchema,
  CompletionResponseStreamMessageSchema,
  CompletionResponseMessageSchema,
  GenerateRequestStreamMessageSchema,
  GenerateRequestNoStreamMessageSchema,
  ProxyRequestMessageSchema,
]);

// 导出类型
export type BaseTunnelMessage = z.infer<typeof BaseTunnelMessageSchema>;
export type PingPayload = z.infer<typeof PingPayloadSchema>;
export type PongPayload = z.infer<typeof PongPayloadSchema>;
export type ContextPingPayload = z.infer<typeof ContextPingPayloadSchema>;
export type ContextPongPayload = z.infer<typeof ContextPongPayloadSchema>;
export type TaskRequestPayload = z.infer<typeof TaskRequestPayloadSchema>;
export type TaskResponsePayload = z.infer<typeof TaskResponsePayloadSchema>;
export type TaskStreamPayload = z.infer<typeof TaskStreamPayloadSchema>;
export type DeviceRegistrationPayload = z.infer<typeof DeviceRegistrationPayloadSchema>;
export type DeviceRegisterAckPayload = z.infer<typeof DeviceRegisterAckPayloadSchema>;
export type TunnelChatMessage = z.infer<typeof TunnelChatMessageSchema>;
export type ChatRequestStreamPayload = z.infer<typeof ChatRequestStreamPayloadSchema>;
export type ChatRequestNoStreamPayload = z.infer<typeof ChatRequestNoStreamPayloadSchema>;
export type GenerateRequestStreamPayload = z.infer<typeof GenerateRequestStreamPayloadSchema>;
export type GenerateRequestNoStreamPayload = z.infer<typeof GenerateRequestNoStreamPayloadSchema>;
export type ProxyRequestPayload = z.infer<typeof ProxyRequestPayloadSchema>;

export type PingMessage = z.infer<typeof PingMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type ContextPingMessage = z.infer<typeof ContextPingMessageSchema>;
export type ContextPongMessage = z.infer<typeof ContextPongMessageSchema>;
export type TaskRequestMessage = z.infer<typeof TaskRequestMessageSchema>;
export type TaskResponseMessage = z.infer<typeof TaskResponseMessageSchema>;
export type TaskStreamMessage = z.infer<typeof TaskStreamMessageSchema>;
export type DeviceRegistrationMessage = z.infer<typeof DeviceRegistrationMessageSchema>;
export type DeviceRegisterAckMessage = z.infer<typeof DeviceRegisterAckMessageSchema>;
export type ChatRequestStreamMessage = z.infer<typeof ChatRequestStreamMessageSchema>;
// 基础类型导出
export type ChatCompatibilityData = z.infer<typeof ChatCompatibilityDataSchema>;
export type ChatCompatibilityPayload = z.infer<typeof ChatCompatibilityPayloadSchema>;
export type CompletionCompatibilityData = z.infer<typeof CompletionCompatibilityDataSchema>;
export type CompletionCompatibilityPayload = z.infer<typeof CompletionCompatibilityPayloadSchema>;

// 消息类型导出
export type ChatRequestNoStreamMessage = z.infer<typeof ChatRequestNoStreamMessageSchema>;
export type ChatResponseMessage = z.infer<typeof ChatResponseMessageSchema>;
export type CompletionRequestStreamMessage = z.infer<typeof CompletionRequestStreamMessageSchema>;
export type CompletionRequestNoStreamMessage = z.infer<typeof CompletionRequestNoStreamMessageSchema>;
export type CompletionResponseStreamMessage = z.infer<typeof CompletionResponseStreamMessageSchema>;
export type CompletionResponseMessage = z.infer<typeof CompletionResponseMessageSchema>;
export type GenerateRequestStreamMessage = z.infer<typeof GenerateRequestStreamMessageSchema>;
export type GenerateRequestNoStreamMessage = z.infer<typeof GenerateRequestNoStreamMessageSchema>;
export type ProxyRequestMessage = z.infer<typeof ProxyRequestMessageSchema>;
export type TunnelMessage = z.infer<typeof TunnelMessageSchema>;
export type ChatResponseStreamMessage = z.infer<typeof ChatResponseStreamSchema>;

// 导出 schemas 集合
export const TunnelMessageSchemas = {
  BaseTunnelMessageSchema,
  PingPayloadSchema,
  PongPayloadSchema,
  ContextPingPayloadSchema,
  ContextPongPayloadSchema,
  TaskRequestPayloadSchema,
  TaskResponsePayloadSchema,
  TaskStreamPayloadSchema,
  DeviceRegistrationPayloadSchema,
  PingMessageSchema,
  PongMessageSchema,
  ContextPingMessageSchema,
  ContextPongMessageSchema,
  TaskRequestMessageSchema,
  TaskResponseMessageSchema,
  TaskStreamMessageSchema,
  DeviceRegistrationMessageSchema,
  TunnelMessageSchema,
  ChatResponseStreamSchema
} as const;
