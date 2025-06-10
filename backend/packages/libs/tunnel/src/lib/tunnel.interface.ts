import { Socket } from "socket.io-client";
import { TunnelMessage } from '@saito/models';

/**
 * Tunnel 消息监听器
 */
export type TunnelMessageListener = {
  match: (msg: TunnelMessage) => boolean;
  callback: (msg: TunnelMessage) => void;
  once?: (msg: TunnelMessage) => boolean;
};

/**
 * Tunnel 服务接口
 */
export interface TunnelService {
  /**
   * 处理消息
   * @param message 隧道消息
   * @param listener 可选的消息监听器
   */
  handleMessage(message: TunnelMessage, listener?: TunnelMessageListener): Promise<void>;

  /**
   * 发送消息
   * @param message 隧道消息
   */
  sendMessage(message: TunnelMessage): Promise<void>;

  /**
   * 连接Socket
   * @param node_id 节点ID
   */
  connectSocket(node_id: string): Promise<void>;

  /**
   * 断开Socket连接
   */
  disconnectSocket(): Promise<void>;

  /**
   * 创建Socket连接
   * @param gatewayAddress 网关地址
   * @param key 认证密钥
   * @param code 一次性认证码
   * @param basePath API服务器基础路径
   */
  createSocket(gatewayAddress: string, key: string, code?: string, basePath?: string): Promise<void>;

  /**
   * 向设备发送消息
   * @param params 发送消息的参数
   */
  handleSendToDevice(params: { deviceId: string; message: string }): Promise<void>;

  /**
   * 为任务注册流式处理器
   * @param params 注册流式处理器的参数
   */
  handleRegisterStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<void>;
  }): Promise<void>;

  /**
   * 为任务注册非流式处理器
   * @param params 注册非流式处理器的参数
   */
  handleRegisterNoStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<any>;
  }): Promise<void>;

  /**
   * 获取所有已连接设备
   * @returns 已连接设备ID列表
   */
  getConnectedDevices(): Promise<string[]>;

  /**
   * 检查设备是否已连接
   * @param deviceId 设备ID
   * @returns 设备是否已连接
   */
  isDeviceConnected(deviceId: string): Promise<boolean>;

  // 内部属性和方法
  node_id: string;
  gatewayUrl: string;
  socket: Socket;
  setupSocketListeners(): void;
  handleDisconnect(): void;
}