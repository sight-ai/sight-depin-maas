import { z } from 'zod';

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

export type PingMessage = z.infer<typeof PingMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type ContextPingMessage = z.infer<typeof ContextPingMessageSchema>;
export type ContextPongMessage = z.infer<typeof ContextPongMessageSchema>;
export type TaskRequestMessage = z.infer<typeof TaskRequestMessageSchema>;
export type TaskResponseMessage = z.infer<typeof TaskResponseMessageSchema>;
export type TaskStreamMessage = z.infer<typeof TaskStreamMessageSchema>;
export type DeviceRegistrationMessage = z.infer<typeof DeviceRegistrationMessageSchema>;
export type TunnelMessage = z.infer<typeof TunnelMessageSchema>;

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
} as const;
