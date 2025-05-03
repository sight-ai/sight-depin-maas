import { Socket } from "socket.io-client";

export abstract class TunnelService {
  /**
   * 连接Socket
   * @param node_id 节点ID
   */
  abstract connectSocket(node_id: string): Promise<void>;

  /**
   * 断开Socket连接
   */
  abstract disconnectSocket(): Promise<void>;

  /**
   * 创建Socket连接
   * @param gatewayAddress 网关地址
   * @param key 认证密钥
   * @param code 一次性认证码
   */
  abstract createSocket(gatewayAddress: string, key: string, code?: string): Promise<void>;

  /**
   * 向设备发送消息
   * @param params 发送消息的参数
   */
  abstract handleSendToDevice(params: { deviceId: string; message: string }): Promise<void>;

  /**
   * 为任务注册流式处理器
   * @param params 注册流式处理器的参数
   */
  abstract handleRegisterStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<void>;
  }): Promise<void>;

  /**
   * 为任务注册非流式处理器
   * @param params 注册非流式处理器的参数
   */
  abstract handleRegisterNoStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<any>;
  }): Promise<void>;

  /**
   * 获取所有已连接设备
   * @returns 已连接设备ID列表
   */
  abstract getConnectedDevices(): Promise<string[]>;

  /**
   * 检查设备是否已连接
   * @param deviceId 设备ID
   * @returns 设备是否已连接
   */
  abstract isDeviceConnected(deviceId: string): Promise<boolean>;

  // 内部属性和方法
  abstract node_id: string;
  abstract gatewayUrl: string;
  abstract socket: Socket;
  abstract setupSocketListeners(): void;
  abstract handleDisconnect(): void;
}