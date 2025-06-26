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
  connect(node_id: string): Promise<void>;

  /**
   * 断开Socket连接
   */
  disconnect(): Promise<void>;

  /**
   * 创建Socket连接
   * @param gatewayAddress 网关地址
   * @param code 一次性认证码
   * @param basePath API服务器基础路径
   */
  createConnection(gatewayAddress: string, code?: string, basePath?: string): Promise<void>;

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

  /**
   * 检查Socket连接状态
   * @returns 连接是否已建立
   */
  isConnected(): boolean;

  // 内部属性和方法
  node_id: string;
  gatewayUrl: string;
  socket: Socket;
  setupSocketListeners(): void;
  handleDisconnect(): void;
}
