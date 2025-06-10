import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { TunnelMessage } from '@saito/models';
import { MessageGateway } from './message-gateway.interface';

/**
 * 消息网关服务实现
 * 负责与网关服务器的WebSocket通信
 */
@Injectable()
export class MessageGatewayService implements MessageGateway {
  private readonly logger = new Logger(MessageGatewayService.name);
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private gatewayUrl: string = '';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly reconnectDelay: number = 2000;

  // 回调函数
  private messageCallback: ((message: TunnelMessage) => void) | null = null;
  private connectionCallback: ((connected: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  /**
   * 连接到网关
   */
  async connect(gatewayAddress: string, key: string, code?: string, basePath?: string): Promise<void> {
    try {
      // 从完整地址中提取基础URL
      const url = new URL(gatewayAddress);
      this.gatewayUrl = `${url.protocol}//${url.host}`;
      
      // 使用传入的basePath参数，如果没有提供则使用空字符串
      const apiBasePath = basePath || '';
      const socketPath = `${apiBasePath}/socket.io`;

      this.logger.debug('Socket连接配置信息:');
      this.logger.debug(`基础URL: ${this.gatewayUrl}`);
      this.logger.debug(`Socket.IO路径: ${socketPath}`);
      if (code) {
        this.logger.debug(`使用认证码: ${code}`);
      }

      // 创建Socket连接
      this.socket = io(this.gatewayUrl, {
        path: socketPath,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 60000,
        timeout: 20000,
        transports: ['polling', 'websocket'],
        forceNew: true,
        secure: true,
        rejectUnauthorized: false,
        extraHeaders: {
          'Origin': this.gatewayUrl,
          'Authorization': `Bearer ${key}`,
          ...(code ? { 'X-Auth-Code': code } : {})
        }
      });

      // 设置Socket事件监听器
      this.setupSocketListeners();
    } catch (error) {
      this.logger.error(`创建Socket连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 断开与网关的连接
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.deviceId = null;
      this.logger.log('Socket连接已断开');
    }
  }

  /**
   * 注册设备
   */
  async registerDevice(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', { 
        type: 'device_register',
        payload: {
          deviceId
        }
       });
      this.logger.log(`发送设备注册请求，ID: ${deviceId}`);
    } else {
      this.logger.warn('Socket未连接，无法注册设备');
    }
  }

  /**
   * 发送消息到网关
   */
  async sendMessage(message: TunnelMessage): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket未连接');
    }

    try {
      this.socket.emit('message', message);
      this.logger.debug('消息已发送', message);
    } catch (error) {
      this.logger.error(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 获取连接的设备ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * 设置消息接收回调
   */
  onMessage(callback: (message: TunnelMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * 设置连接状态变化回调
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallback = callback;
  }

  /**
   * 设置错误回调
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * 设置Socket事件监听器
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      this.logger.log('Socket连接成功');
      this.reconnectAttempts = 0;
      this.connectionCallback?.(true);

      // 如果有设备ID，自动注册
      if (this.deviceId) {
        this.registerDevice(this.deviceId);
      }
    });

    // 连接断开
    this.socket.on('disconnect', (reason: string) => {
      this.logger.warn(`Socket连接断开: ${reason}`);
      this.connectionCallback?.(false);
      this.handleDisconnect();
    });

    // 接收消息
    this.socket.on('message', (data: any) => {
      try {
        // 尝试解析为TunnelMessage
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        this.logger.debug('收到消息', message);
        this.messageCallback?.(message);
      } catch (error) {
        this.logger.error(`解析消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
        this.errorCallback?.(new Error('消息解析失败'));
      }
    });

    // 连接错误
    this.socket.on('connect_error', (error: Error) => {
      this.logger.error(`Socket连接错误: ${error.message}`);
      this.errorCallback?.(error);
    });

    // 设备注册成功
    this.socket.on('device_registered', (data: { deviceId: string }) => {
      this.logger.log(`设备注册成功: ${data.deviceId}`);
    });

    // 设备注册失败
    this.socket.on('device_registration_failed', (data: { error: string }) => {
      this.logger.error(`设备注册失败: ${data.error}`);
      this.errorCallback?.(new Error(`设备注册失败: ${data.error}`));
    });
  }

  /**
   * 处理连接断开
   */
  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // 使用指数退避算法
    } else {
      this.logger.error('达到最大重连尝试次数');
      this.errorCallback?.(new Error('连接失败，达到最大重连尝试次数'));
    }
  }
}

export const MessageGatewayProvider = {
  provide: 'MessageGateway',
  useClass: MessageGatewayService,
};
