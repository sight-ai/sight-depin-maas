import { TunnelMessage } from '@saito/models';

/**
 * 连接状态类型
 */
export type ConnectionStatus = {
  connected: boolean;
  deviceId?: string | null;
  gatewayUrl?: string;
}

/**
 * 所有传输实现都必须支持的核心功能
 */
export interface ITransportGateway {
  /**
   * 发送消息到网关
   * @param message 隧道消息
   */
  sendMessage(message: TunnelMessage): Promise<void>;

  /**
   * 设置消息接收回调
   * @param callback 消息接收回调函数
   */
  onMessage(callback: (message: TunnelMessage) => void): void;

  /**
   * 获取连接状态
   * @returns 连接状态信息
   */
  getConnectionStatus(): ConnectionStatus;

  /**
   * 设置错误回调
   * @param callback 错误回调函数
   */
  onError?(callback: (error: Error) => void): void;

  getTransportType(): 'libp2p' | 'socket';

}

/**
 * Socket传输网关扩展接口
 * 包含Socket特有的连接管理功能
 */
export interface ISocketTransportGateway extends ITransportGateway {

  /**
   * 连接到网关
   * @param gatewayAddress 网关地址
   * @param code 一次性认证码
   * @param basePath API服务器基础路径
   */
  connect(gatewayAddress: string, code?: string, basePath?: string): Promise<void>;

  /**
   * 断开与网关的连接
   */
  disconnect(): Promise<void>;

  /**
   * 检查连接状态
   */
  isConnected(): boolean;

  /**
   * 获取连接的设备ID
   */
  getDeviceId(): string | null;

  /**
   * 设置连接状态变化回调
   * @param callback 连接状态变化回调函数
   */
  onConnectionChange(callback: (connected: boolean) => void): void;

  getTransportType(): 'libp2p' | 'socket';

}

/**
 * Libp2p传输网关扩展接口
 * 包含Libp2p特有的功能
 */
export interface ILibp2pTransportGateway extends ITransportGateway {
  /**
   * 获取传输类型标识
   */

  /**
   * Libp2p特有功能可以在这里扩展
   * 例如：peer discovery, DHT operations等
   */
}

/**
 * 传输网关类型枚举
 */
export type TransportGatewayType = 'socket' | 'libp2p';

/**
 * 统一的传输网关类型判断函数
 * 替代多个类型守卫函数，更易扩展
 */
export function getTransportGatewayType(gateway: ITransportGateway): TransportGatewayType {
  const gatewayType = gateway.getTransportType();
  if (gatewayType) {
    return gatewayType;
  }
  // 默认返回socket（向后兼容）
  return 'socket';
}


/**
 * @deprecated 保持向后兼容，逐步迁移到ITransportGateway
 */
// export interface MessageGateway extends ITransportGateway {}
