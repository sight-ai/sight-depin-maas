import { z } from 'zod';

/**
 * 客户端相关的 Zod Schema 定义
 * 
 * 从 model-inference-client/types/client.types.ts 迁移而来
 */

/**
 * 请求类型枚举
 */
export enum RequestType {
  CHAT = 'chat',
  COMPLETION = 'completion',
  EMBEDDINGS = 'embeddings',
  HEALTH_CHECK = 'health_check',
  MODEL_LIST = 'model_list',
  MODEL_INFO = 'model_info',
  VERSION = 'version'
}

/**
 * 请求类型枚举 Schema
 */
export const RequestTypeSchema = z.nativeEnum(RequestType);

/**
 * 请求上下文 Schema
 */
export const RequestContextSchema = z.object({
  type: RequestTypeSchema.describe('请求类型'),
  baseUrl: z.string().url().describe('基础 URL'),
  effectiveModel: z.string().optional().describe('有效模型名称'),
  pathname: z.string().optional().describe('路径名'),
  args: z.any().optional().describe('请求参数'),
  res: z.any().optional().describe('Express Response 对象')
});

/**
 * 健康检查详细结果 Schema
 */
export const DetailedHealthCheckResultSchema = z.object({
  isHealthy: z.boolean().describe('是否健康'),
  version: z.string().optional().describe('版本信息'),
  responseTime: z.number().nonnegative().describe('响应时间（毫秒）'),
  error: z.string().optional().describe('错误信息')
});

/**
 * 聊天消息 Schema
 */
export const ChatMessageSchema = z.object({
  role: z.string().describe('角色'),
  content: z.string().describe('消息内容')
});

// 注意：ChatRequest, CompletionRequest, EmbeddingsRequest 等已在 request-response.schema.ts 中定义
// 这里不重复定义，避免导出冲突

/**
 * 客户端操作结果 Schema
 */
export const ClientOperationResultSchema = z.object({
  success: z.boolean().describe('操作是否成功'),
  data: z.any().optional().describe('返回数据'),
  error: z.string().optional().describe('错误信息'),
  timestamp: z.string().datetime().describe('时间戳')
});

/**
 * 客户端配置 Schema
 */
export const ClientConfigSchema = z.object({
  baseUrl: z.string().url().describe('基础 URL'),
  timeout: z.number().positive().optional().default(30000).describe('超时时间（毫秒）'),
  retries: z.number().nonnegative().optional().default(3).describe('重试次数'),
  apiKey: z.string().optional().describe('API 密钥'),
  defaultModel: z.string().optional().describe('默认模型'),
  enableHealthCheck: z.boolean().optional().default(true).describe('是否启用健康检查'),
  healthCheckInterval: z.number().positive().optional().default(30000).describe('健康检查间隔（毫秒）')
});

/**
 * 客户端状态 Schema
 */
export const ClientStatusSchema = z.object({
  isConnected: z.boolean().describe('是否连接'),
  isHealthy: z.boolean().describe('是否健康'),
  lastHealthCheck: z.string().datetime().optional().describe('最后健康检查时间'),
  responseTime: z.number().nonnegative().optional().describe('响应时间（毫秒）'),
  error: z.string().optional().describe('错误信息'),
  version: z.string().optional().describe('服务版本'),
  availableModels: z.array(z.string()).optional().describe('可用模型列表')
});

/**
 * 请求调度器接口
 */
export interface IRequestDispatcher {
  dispatch(context: RequestContext): Promise<any>;
}

/**
 * 聊天处理器接口（不是 Zod schema，而是 TypeScript 接口）
 * 用于定义聊天处理器的标准接口
 */
export interface IChatHandler {
  handleChatRequest(
    args: any, // ChatRequest 类型在 request-response.schema.ts 中定义
    res: any, // Express Response 对象
    baseUrl: string,
    effectiveModel: string,
    pathname?: string
  ): Promise<void>;
}

/**
 * 健康检查器接口
 */
export interface IHealthChecker {
  checkHealth(baseUrl: string): Promise<boolean>;
  checkDetailedHealth(baseUrl: string): Promise<DetailedHealthCheckResult>;
  checkConnectivity(baseUrl: string): Promise<boolean>;
  checkModelAvailability(baseUrl: string, modelName: string): Promise<boolean>;
}

/**
 * 模型信息服务接口
 */
export interface IModelInfoService {
  listModels(baseUrl: string): Promise<any>;
  getModelInfo(baseUrl: string, modelName: string): Promise<any>;
  getVersion(baseUrl: string): Promise<string>;
  getModelStats(baseUrl: string): Promise<any>;
}

// 导出类型（RequestType 枚举已在上面定义，不需要重复导出类型）
// export type RequestType = z.infer<typeof RequestTypeSchema>;
export type RequestContext = z.infer<typeof RequestContextSchema>;
export type DetailedHealthCheckResult = z.infer<typeof DetailedHealthCheckResultSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ClientOperationResult = z.infer<typeof ClientOperationResultSchema>;
export type ClientConfig = z.infer<typeof ClientConfigSchema>;
export type ClientStatus = z.infer<typeof ClientStatusSchema>;

// 注意：ChatRequest, CompletionRequest, EmbeddingsRequest 等类型在 request-response.schema.ts 中定义

// 导出 schemas 集合
export const ClientSchemas = {
  RequestTypeSchema,
  RequestContextSchema,
  DetailedHealthCheckResultSchema,
  ChatMessageSchema,
  ClientOperationResultSchema,
  ClientConfigSchema,
  ClientStatusSchema
} as const;
