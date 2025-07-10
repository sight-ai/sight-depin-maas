import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { TunnelMessage } from '@saito/models';
import { MessageGateway } from './message-gateway.interface';
import { NetworkDiagnostics } from '../utils/network-diagnostics';

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
  private readonly diagnostics = new NetworkDiagnostics();

  // 回调函数
  private messageCallback: ((message: TunnelMessage) => void) | null = null;
  private connectionCallback: ((connected: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  /**
   * 连接到网关
   */
  async connect(gatewayAddress: string, code?: string, basePath?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 从完整地址中提取基础URL
        const url = new URL(gatewayAddress);
        this.gatewayUrl = `${url.protocol}//${url.host}`;

        // 使用传入的basePath参数，如果没有提供则使用空字符串
        const apiBasePath = basePath || '';
        // 确保路径正确：如果 basePath 为空或只有空格，直接使用 /socket.io
        const socketPath = (apiBasePath && apiBasePath.trim()) ? `${apiBasePath.trim()}/socket.io` : '/socket.io';

        this.logger.debug('Socket连接配置信息:');
        this.logger.debug(`基础URL: ${this.gatewayUrl}`);
        this.logger.debug(`Socket.IO路径: ${socketPath}`);
        if (code) {
          this.logger.debug(`使用认证码: ${code}`);
        }

        // 创建Socket连接
        const isSecure = this.gatewayUrl.startsWith('https://');
        this.socket = io(this.gatewayUrl, {
          path: socketPath,
          reconnection: true,
          reconnectionAttempts: 5, // 减少重连次数，避免无限重连
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000, // 减少最大延迟
          timeout: 10000, // 减少超时时间
          transports: ['polling'], // 暂时只使用 polling 避免升级问题
          forceNew: true,
          secure: isSecure,
          rejectUnauthorized: false,
          upgrade: true, // 允许传输升级
          rememberUpgrade: true, // 记住升级
          // 明确指定 Engine.IO 版本
          autoConnect: true,
          extraHeaders: {
            'Origin': this.gatewayUrl,
            ...(code ? { 'X-Auth-Code': code } : {})
          }
        });

        // 设置连接成功和失败的监听器
        const onConnect = () => {
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onConnectError);
          resolve();
        };

        const onConnectError = (error: Error) => {
          this.socket?.off('connect', onConnect);
          this.socket?.off('connect_error', onConnectError);
          reject(error);
        };

        this.socket.on('connect', onConnect);
        this.socket.on('connect_error', onConnectError);

        // 设置Socket事件监听器
        this.setupSocketListeners();
      } catch (error) {
        this.logger.error(`创建Socket连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
        reject(error);
      }
    });
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
   * 发送消息到网关
   */
  async sendMessage(message: TunnelMessage): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket未连接');
    }

    try {
      this.socket.emit('message', message);

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

      // 使用诊断工具分析错误
      this.diagnostics.analyzeSocketIOError(error.message);

      // 如果是第一次连接错误，运行完整诊断
      if (this.reconnectAttempts === 0) {
        this.diagnostics.diagnoseGatewayConnection(this.gatewayUrl).catch(() => {
          // 忽略诊断错误，不影响主要流程
        });
      }

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

    // 添加更多Socket.IO事件监听以便诊断
    this.socket.on('error', (error: any) => {
      this.logger.error(`Socket通用错误: ${error}`);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      this.logger.log(`Socket重连成功，尝试次数: ${attemptNumber}`);
      this.reconnectAttempts = 0; // 重置重连计数
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.logger.debug(`Socket重连尝试 #${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      this.logger.error(`Socket重连错误: ${error.message}`);
    });

    this.socket.on('reconnect_failed', () => {
      this.logger.error('Socket重连失败，已达到最大尝试次数');
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
