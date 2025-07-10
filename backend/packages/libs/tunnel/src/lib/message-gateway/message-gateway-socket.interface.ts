import { TunnelMessage } from '@saito/models';
import { ITransportGateway } from './message-gateway.interface';

/**
 * 消息网关接口
 * 负责与网关服务器的WebSocket通信
 */
export interface ISocketMessageGateway extends ITransportGateway {
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

  /**
   * 设置错误回调
   * @param callback 错误回调函数
   */
  onError(callback: (error: Error) => void): void;

}

