import { TunnelMessage } from '@saito/models';

/**
 * Tunnel 模块事件定义
 * 使用 NestJS EventEmitter 实现模块间解耦通信
 */

// ========================================
// 连接相关事件
// ========================================

/**
 * Socket 连接建立事件
 */
export class TunnelConnectionEstablishedEvent {
  constructor(
    public readonly deviceId: string,
    public readonly gatewayUrl: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * Socket 连接断开事件
 */
export class TunnelConnectionLostEvent {
  constructor(
    public readonly deviceId: string,
    public readonly reason: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 设备注册成功事件
 */
export class TunnelDeviceRegisteredEvent {
  constructor(
    public readonly deviceId: string,
    public readonly peerId: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 消息相关事件
// ========================================

/**
 * 收到入站消息事件
 */
export class TunnelMessageReceivedEvent {
  constructor(
    public readonly message: TunnelMessage,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 发送出站消息事件
 */
export class TunnelMessageSentEvent {
  constructor(
    public readonly message: TunnelMessage,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 消息处理失败事件
 */
export class TunnelMessageFailedEvent {
  constructor(
    public readonly message: TunnelMessage,
    public readonly error: Error,
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 设备状态相关事件
// ========================================

/**
 * 设备上线事件
 */
export class TunnelDeviceOnlineEvent {
  constructor(
    public readonly deviceId: string,
    public readonly peerId: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 设备下线事件
 */
export class TunnelDeviceOfflineEvent {
  constructor(
    public readonly deviceId: string,
    public readonly peerId: string,
    public readonly reason: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 心跳接收事件
 */
export class TunnelHeartbeatReceivedEvent {
  constructor(
    public readonly fromDeviceId: string,
    public readonly payload: any,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 模型报告接收事件
 */
export class TunnelModelReportReceivedEvent {
  constructor(
    public readonly fromDeviceId: string,
    public readonly models: any[],
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 任务相关事件
// ========================================

/**
 * 聊天请求接收事件
 */
export class TunnelChatRequestReceivedEvent {
  constructor(
    public readonly requestId: string,
    public readonly fromDeviceId: string,
    public readonly payload: any,
    public readonly isStream: boolean,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 聊天响应发送事件
 */
export class TunnelChatResponseSentEvent {
  constructor(
    public readonly requestId: string,
    public readonly toDeviceId: string,
    public readonly payload: any,
    public readonly isStream: boolean,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 完成请求接收事件
 */
export class TunnelCompletionRequestReceivedEvent {
  constructor(
    public readonly requestId: string,
    public readonly fromDeviceId: string,
    public readonly payload: any,
    public readonly isStream: boolean,
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 推理服务相关事件
// ========================================

/**
 * 聊天推理请求事件
 */
export class TunnelChatInferenceRequestEvent {
  constructor(
    public readonly taskId: string,
    public readonly fromDeviceId: string,
    public readonly requestParams: any,
    public readonly path: string,
    public readonly isStream: boolean,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 完成推理请求事件
 */
export class TunnelCompletionInferenceRequestEvent {
  constructor(
    public readonly taskId: string,
    public readonly fromDeviceId: string,
    public readonly requestParams: any,
    public readonly path: string,
    public readonly isStream: boolean,
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * 推理响应事件
 */
export class TunnelInferenceResponseEvent {
  constructor(
    public readonly taskId: string,
    public readonly toDeviceId: string,
    public readonly response: any,
    public readonly isStream: boolean,
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 设备状态更新事件
// ========================================

/**
 * 设备状态更新请求事件
 */
export class TunnelDeviceStatusUpdateRequestEvent {
  constructor(
    public readonly deviceId: string,
    public readonly status: string,
    public readonly reason?: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 错误相关事件
// ========================================

/**
 * Tunnel 错误事件
 */
export class TunnelErrorEvent {
  constructor(
    public readonly error: Error,
    public readonly context: string,
    public readonly deviceId?: string,
    public readonly timestamp: number = Date.now()
  ) {}
}

// ========================================
// 事件名称常量
// ========================================

export const TUNNEL_EVENTS = {
  // 连接事件
  CONNECTION_ESTABLISHED: 'tunnel.connection.established',
  CONNECTION_LOST: 'tunnel.connection.lost',
  DEVICE_REGISTERED: 'tunnel.device.registered',

  // 消息事件
  MESSAGE_RECEIVED: 'tunnel.message.received',
  MESSAGE_SENT: 'tunnel.message.sent',
  MESSAGE_FAILED: 'tunnel.message.failed',

  // 设备状态事件
  DEVICE_ONLINE: 'tunnel.device.online',
  DEVICE_OFFLINE: 'tunnel.device.offline',
  HEARTBEAT_RECEIVED: 'tunnel.heartbeat.received',
  MODEL_REPORT_RECEIVED: 'tunnel.model.report.received',

  // 任务事件
  CHAT_REQUEST_RECEIVED: 'tunnel.chat.request.received',
  CHAT_RESPONSE_SENT: 'tunnel.chat.response.sent',
  COMPLETION_REQUEST_RECEIVED: 'tunnel.completion.request.received',

  // 推理服务事件
  CHAT_INFERENCE_REQUEST: 'tunnel.chat.inference.request',
  COMPLETION_INFERENCE_REQUEST: 'tunnel.completion.inference.request',
  INFERENCE_RESPONSE: 'tunnel.inference.response',

  // 设备状态更新事件
  DEVICE_STATUS_UPDATE_REQUEST: 'tunnel.device.status.update.request',

  // 错误事件
  ERROR: 'tunnel.error'
} as const;

export type TunnelEventName = typeof TUNNEL_EVENTS[keyof typeof TUNNEL_EVENTS];
