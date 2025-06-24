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
 * 设备注册请求消息载荷 Schema (按照节点对接文档)
 */
export const DeviceRegisterRequestPayloadSchema = z.object({
  code: z.string().describe('一次性注册码'),
  gateway_address: z.string().describe('网关地址'),
  reward_address: z.string().describe('奖励地址'),
  device_type: z.string().optional().describe('设备类型'),
  gpu_type: z.string().optional().describe('GPU类型'),
  device_id: z.string().optional().describe('设备ID'),
  device_name: z.string().optional().describe('设备名称'),
  ip: z.string().optional().describe('IP地址'),
  local_models: z.any().optional().describe('本地模型信息'),
  did_document: z.any().optional().describe('DID文档')
});

/**
 * 设备注册响应消息载荷 Schema
 */
export const DeviceRegisterResponsePayloadSchema = z.object({
  device_id: z.string().describe('设备ID'),
  status: z.enum(['connected', 'failed']).describe('注册状态'),
  device_type: z.string().optional().describe('设备类型'),
  reward_address: z.string().optional().describe('奖励地址'),
  error: z.string().optional().describe('错误信息')
});

/**
 * 模型上报消息载荷 Schema (按照节点对接文档)
 */
export const DeviceModelReportPayloadSchema = z.object({
  device_id: z.string().describe('设备ID (UUID格式)'),
  models: z.array(z.object({
    name: z.string().describe('模型名称'),
    modified_at: z.string().describe('修改时间'),
    size: z.number().describe('模型大小 (字节)'),
    digest: z.string().describe('模型摘要'),
    details: z.object({
      format: z.string().describe('模型格式'),
      family: z.string().describe('模型家族'),
      families: z.array(z.string()).nullable().describe('模型家族列表'),
      parameter_size: z.string().describe('参数大小'),
      quantization_level: z.string().describe('量化级别')
    })
  })).describe('模型列表')
});

/**
 * 模型上报响应消息载荷 Schema
 */
export const DeviceModelReportResponsePayloadSchema = z.object({
  success: z.boolean().describe('上报是否成功'),
  message: z.string().optional().describe('响应消息')
});

/**
 * 心跳上报消息载荷 Schema (按照节点对接文档)
 */
export const DeviceHeartbeatReportPayloadSchema = z.object({
  code: z.string().describe('设备识别码'),
  cpu_usage: z.number().min(0).max(100).optional().describe('CPU使用率 (0-100)'),
  memory_usage: z.number().min(0).max(100).optional().describe('内存使用率 (0-100)'),
  gpu_usage: z.number().min(0).max(100).optional().describe('GPU使用率 (0-100)'),
  ip: z.string().optional().describe('IP地址'),
  timestamp: z.string().optional().describe('时间戳'),
  type: z.string().optional().describe('设备类型'),
  model: z.string().optional().describe('当前运行模型'),
  device_info: z.object({
    cpu_model: z.string().optional().describe('CPU型号'),
    cpu_cores: z.number().optional().describe('CPU核心数'),
    cpu_threads: z.number().optional().describe('CPU线程数'),
    ram_total: z.number().optional().describe('总内存 (GB)'),
    gpu_model: z.string().optional().describe('GPU型号'),
    gpu_count: z.number().optional().describe('GPU数量'),
    gpu_memory: z.number().optional().describe('GPU显存 (GB)'),
    disk_total: z.number().optional().describe('总磁盘空间 (GB)'),
    os_info: z.string().optional().describe('操作系统信息')
  }).optional().describe('设备详细信息'),
  gateway_url: z.string().optional().describe('网关URL'),
  device_id: z.string().optional().describe('设备ID')
});

/**
 * 心跳响应消息载荷 Schema
 */
export const DeviceHeartbeatResponsePayloadSchema = z.object({
  success: z.boolean().describe('处理是否成功'),
  message: z.string().optional().describe('响应消息')
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
 * 设备注册确认消息 Schema
 */
export const DeviceRegisterAckMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_register_ack'),
  payload: DeviceRegisterAckPayloadSchema,
});

/**
 * 设备注册请求消息 Schema (按照节点对接文档)
 */
export const DeviceRegisterRequestMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_register_request'),
  payload: DeviceRegisterRequestPayloadSchema,
});

/**
 * 设备注册响应消息 Schema
 */
export const DeviceRegisterResponseMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_register_response'),
  payload: DeviceRegisterResponsePayloadSchema,
});

/**
 * 模型上报消息 Schema (按照节点对接文档)
 */
export const DeviceModelReportMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_model_report'),
  payload: DeviceModelReportPayloadSchema,
});

/**
 * 模型上报响应消息 Schema
 */
export const DeviceModelReportResponseMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_model_report_response'),
  payload: DeviceModelReportResponsePayloadSchema,
});

/**
 * 心跳上报消息 Schema (按照节点对接文档)
 */
export const DeviceHeartbeatReportMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_heartbeat_report'),
  payload: DeviceHeartbeatReportPayloadSchema,
});

/**
 * 心跳响应消息 Schema
 */
export const DeviceHeartbeatResponseMessageSchema = BaseTunnelMessageSchema.extend({
  type: z.literal('device_heartbeat_response'),
  payload: DeviceHeartbeatResponsePayloadSchema,
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
  DeviceRegisterAckMessageSchema,
  DeviceRegisterRequestMessageSchema,
  DeviceRegisterResponseMessageSchema,
  DeviceModelReportMessageSchema,
  DeviceModelReportResponseMessageSchema,
  DeviceHeartbeatReportMessageSchema,
  DeviceHeartbeatResponseMessageSchema,
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
export type DeviceRegisterRequestPayload = z.infer<typeof DeviceRegisterRequestPayloadSchema>;
export type DeviceRegisterResponsePayload = z.infer<typeof DeviceRegisterResponsePayloadSchema>;
export type DeviceModelReportPayload = z.infer<typeof DeviceModelReportPayloadSchema>;
export type DeviceModelReportResponsePayload = z.infer<typeof DeviceModelReportResponsePayloadSchema>;
export type DeviceHeartbeatReportPayload = z.infer<typeof DeviceHeartbeatReportPayloadSchema>;
export type DeviceHeartbeatResponsePayload = z.infer<typeof DeviceHeartbeatResponsePayloadSchema>;
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
export type DeviceRegisterAckMessage = z.infer<typeof DeviceRegisterAckMessageSchema>;
export type DeviceRegisterRequestMessage = z.infer<typeof DeviceRegisterRequestMessageSchema>;
export type DeviceRegisterResponseMessage = z.infer<typeof DeviceRegisterResponseMessageSchema>;
export type DeviceModelReportMessage = z.infer<typeof DeviceModelReportMessageSchema>;
export type DeviceModelReportResponseMessage = z.infer<typeof DeviceModelReportResponseMessageSchema>;
export type DeviceHeartbeatReportMessage = z.infer<typeof DeviceHeartbeatReportMessageSchema>;
export type DeviceHeartbeatResponseMessage = z.infer<typeof DeviceHeartbeatResponseMessageSchema>;
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
  DeviceRegisterAckPayloadSchema,
  DeviceRegisterRequestPayloadSchema,
  DeviceRegisterResponsePayloadSchema,
  DeviceModelReportPayloadSchema,
  DeviceModelReportResponsePayloadSchema,
  DeviceHeartbeatReportPayloadSchema,
  DeviceHeartbeatResponsePayloadSchema,
  PingMessageSchema,
  PongMessageSchema,
  ContextPingMessageSchema,
  ContextPongMessageSchema,
  TaskRequestMessageSchema,
  TaskResponseMessageSchema,
  TaskStreamMessageSchema,
  DeviceRegisterAckMessageSchema,
  DeviceRegisterRequestMessageSchema,
  DeviceRegisterResponseMessageSchema,
  DeviceModelReportMessageSchema,
  DeviceModelReportResponseMessageSchema,
  DeviceHeartbeatReportMessageSchema,
  DeviceHeartbeatResponseMessageSchema,
  TunnelMessageSchema,
  ChatResponseStreamSchema
} as const;
