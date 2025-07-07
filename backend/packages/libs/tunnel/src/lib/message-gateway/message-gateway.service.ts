import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { TunnelMessage } from '@saito/models';
import { ISocketTransportGateway, ConnectionStatus } from './message-gateway.interface';
import { NetworkDiagnostics } from '../utils/network-diagnostics';

/**
 * 消息网关服务实现
 * 负责与网关服务器的WebSocket通信
 */
@Injectable()
export class SocketMessageGatewayService implements ISocketTransportGateway {
  private readonly logger = new Logger(SocketMessageGatewayService.name);
  private socket: Socket | null = null;
  private deviceId: string | null = null;
  private gatewayUrl: string = '';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly reconnectDelay: number = 2000;
  private readonly diagnostics = new NetworkDiagnostics();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;

  // 回调函数
  private messageCallback: ((message: TunnelMessage) => void) | null = null;
  private connectionCallback: ((connected: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  /**
   * 获取传输类型标识
   */
  getTransportType(): 'socket' {
    return 'socket';
  }

  /**
   * 连接到网关
   */
  async connect(gatewayAddress: string, code?: string, basePath?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 重置手动断开标记
        this.isManualDisconnect = false;

        // 从完整地址中提取基础URL
        const url = new URL(gatewayAddress);
        this.gatewayUrl = `${url.protocol}//${url.host}`;

        // 临时修复：直接使用默认Socket.IO路径，因为Gateway端没有配置自定义路径
        // TODO: 等Gateway端配置好 /api/model/socket.io 路径后，恢复原来的逻辑
        const socketPath = '/socket.io';

        // 原来的逻辑（暂时注释）：
        // const apiBasePath = basePath || '';
        // const socketPath = (apiBasePath && apiBasePath.trim()) ? `${apiBasePath.trim()}/socket.io` : '/socket.io';

        this.logger.debug('Socket连接配置信息:');
        this.logger.debug(`基础URL: ${this.gatewayUrl}`);
        this.logger.debug(`Socket.IO路径: ${socketPath}`);
        this.logger.debug(`原始basePath参数: ${basePath || 'undefined'} (临时忽略)`);
        if (code) {
          this.logger.debug(`使用认证码: ${code}`);
        }

        // 创建Socket连接
        const isSecure = this.gatewayUrl.startsWith('https://');
        this.socket = io(this.gatewayUrl, {
          path: socketPath,
          reconnection: true,
          reconnectionAttempts: Infinity, // 无限重连尝试
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000, // 增加最大延迟
          timeout: 20000, // 增加超时时间
          transports: ['polling', 'websocket'], // 支持多种传输方式
          forceNew: true,
          secure: isSecure,
          rejectUnauthorized: false,
          upgrade: true, // 允许传输升级
          rememberUpgrade: true, // 记住升级
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
    this.isManualDisconnect = true;

    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.deviceId = null;
      this.reconnectAttempts = 0;
      this.logger.log('Socket连接已手动断开');
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
      // this.logger.debug('消息已发送', message);
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
   * 获取连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.socket?.connected ?? false,
      deviceId: this.deviceId,
      gatewayUrl: this.gatewayUrl
    };
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
   * 手动触发重连
   */
  async reconnect(): Promise<void> {
    this.logger.log('手动触发重连...');

    // 重置手动断开标记
    this.isManualDisconnect = false;

    // 重置重连计数
    this.reconnectAttempts = 0;

    if (this.socket) {
      if (this.socket.connected) {
        this.logger.log('Socket已连接，先断开再重连');
        this.socket.disconnect();
      }

      // 等待一小段时间后重连
      setTimeout(() => {
        if (this.socket && !this.isManualDisconnect) {
          this.socket.connect();
        }
      }, 1000);
    } else {
      this.logger.warn('Socket实例不存在，无法重连');
    }
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

      // 清除重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.connectionCallback?.(true);
    });

    // 连接断开
    this.socket.on('disconnect', (reason: string) => {
      this.logger.warn(`Socket连接断开: ${reason}`);
      this.connectionCallback?.(false);

      // 只在非手动断开时尝试重连
      if (!this.isManualDisconnect) {
        this.handleDisconnect(reason);
      } else {
        this.logger.log('手动断开连接，不进行重连');
      }
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
      this.logger.log(`🔄 Socket重连成功，尝试次数: ${attemptNumber}`);
      this.reconnectAttempts = 0; // 重置重连计数

      // 清除重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // 通知连接恢复
      this.connectionCallback?.(true);
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.logger.debug(`🔄 Socket重连尝试 #${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      this.logger.error(`❌ Socket重连错误: ${error.message}`);

      // 分析重连错误
      this.diagnostics.analyzeSocketIOError(error.message);
    });

    this.socket.on('reconnect_failed', () => {
      this.logger.error('❌ Socket重连失败，已达到最大尝试次数');
      this.errorCallback?.(new Error('Socket重连失败，已达到最大尝试次数'));
    });
  }

  /**
   * 处理连接断开
   */
  private handleDisconnect(reason?: string): void {
    // 如果是手动断开，不进行重连
    if (this.isManualDisconnect) {
      this.logger.log('手动断开连接，停止重连');
      return;
    }

    // 清除之前的重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 分析断开原因，决定是否重连
    const shouldReconnect = this.shouldAttemptReconnect(reason);
    if (!shouldReconnect) {
      this.logger.warn(`断开原因: ${reason}，不进行重连`);
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

      this.logger.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，延迟 ${delay}ms...`);

      this.reconnectTimer = setTimeout(() => {
        if (this.socket && !this.socket.connected && !this.isManualDisconnect) {
          this.logger.log('执行重连...');
          this.socket.connect();
        }
      }, delay);
    } else {
      this.logger.error('达到最大重连尝试次数');
      this.errorCallback?.(new Error('连接失败，达到最大重连尝试次数'));
    }
  }

  /**
   * 判断是否应该尝试重连
   */
  private shouldAttemptReconnect(reason?: string): boolean {
    if (!reason) return true;

    // 某些断开原因不应该重连
    const noReconnectReasons = [
      'io server disconnect', // 服务器主动断开
      'io client disconnect', // 客户端主动断开
    ];

    return !noReconnectReasons.includes(reason);
  }
}

export const MessageGatewayProvider = {
  provide: 'MessageGateway',
  useClass: SocketMessageGatewayService,
};
