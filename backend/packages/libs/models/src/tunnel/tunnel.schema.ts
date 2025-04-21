/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

/**
 * Socket连接配置
 */
export const SocketConnectionConfigSchema = z.object({
  path: z.string(),
  reconnection: z.boolean(),
  reconnectionAttempts: z.number(),
  reconnectionDelay: z.number(),
  timeout: z.number(),
  transports: z.array(z.string()),
  forceNew: z.boolean(),
  secure: z.boolean(),
  rejectUnauthorized: z.boolean(),
  extraHeaders: z.record(z.string())
});

/**
 * Socket消息基础类型
 */
export const BaseSocketMessageSchema = z.object({
  type: z.string(),
  taskId: z.string()
});

/**
 * 聊天请求类型
 */
export const ChatRequestSchema = BaseSocketMessageSchema.extend({
  type: z.literal('chat_request_stream').or(z.literal('chat_request_no_stream')),
  data: z.object({
    model: z.string(),
    messages: z.array(z.object({
      role: z.string(),
      content: z.string()
    })),
    stream: z.boolean().optional(),
    device_id: z.string().optional(),
    task_id: z.string().optional()
  })
});

/**
 * 生成请求类型
 */
export const GenerateRequestSchema = BaseSocketMessageSchema.extend({
  type: z.literal('generate_request_stream').or(z.literal('generate_request_no_stream')),
  data: z.object({
    model: z.string(),
    prompt: z.string(),
    stream: z.boolean().optional(),
    device_id: z.string().optional(),
    task_id: z.string().optional()
  })
});

/**
 * 代理请求类型
 */
export const ProxyRequestSchema = BaseSocketMessageSchema.extend({
  type: z.literal('proxy_request'),
  data: z.object({
    method: z.string(),
    url: z.string(),
    headers: z.record(z.string()),
    body: z.record(z.any()).optional()
  })
});

/**
 * 响应消息类型
 */
export const ResponseMessageSchema = z.object({
  taskId: z.string(),
  content: z.string().optional(),
  error: z.string().optional()
});

/**
 * 流式响应消息类型
 */
export const StreamResponseMessageSchema = ResponseMessageSchema;

/**
 * Socket服务器消息类型
 */
export const ServerMessageSchema = z.union([
  ChatRequestSchema,
  GenerateRequestSchema,
  ProxyRequestSchema
]);

/**
 * 导出所有Schema
 */
export const TunnelSchema = {
  SocketConnectionConfig: SocketConnectionConfigSchema,
  BaseSocketMessage: BaseSocketMessageSchema,
  ChatRequest: ChatRequestSchema,
  GenerateRequest: GenerateRequestSchema,
  ProxyRequest: ProxyRequestSchema,
  ResponseMessage: ResponseMessageSchema,
  StreamResponseMessage: StreamResponseMessageSchema,
  ServerMessage: ServerMessageSchema
};

/**
 * 使用Schema获取类型的工具类型
 */
export type ModelOfTunnel<T extends keyof typeof TunnelSchema> =
  (typeof TunnelSchema)[T] extends z.ZodType<infer O> ? O : never; 