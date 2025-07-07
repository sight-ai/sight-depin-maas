import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Socket } from 'socket.io-client';
import { TunnelService, TunnelMessageListener } from './tunnel.interface';
import { TunnelMessage } from '@saito/models';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { UnknownMessageTypeError } from './errors/unknown-message-type.error';
import {
  ITransportGateway,
  ISocketTransportGateway,
  getTransportGatewayType
} from './message-gateway/message-gateway.interface';
import { ConnectionError, DeviceRegistrationError, MessageSendError } from './errors/connection.error';
import { GLOBAL_PEER_ID_PROVIDER } from './tunnel.module';
import {
  TUNNEL_EVENTS,
  TunnelConnectionEstablishedEvent,
  TunnelConnectionLostEvent,
  TunnelDeviceRegisteredEvent,
  TunnelMessageReceivedEvent,
  TunnelMessageSentEvent,
  TunnelMessageFailedEvent,
  TunnelErrorEvent
} from './events';

/**
 * 统一的隧道服务实现
 * 支持Socket和Libp2p两种传输方式，根据MessageGateway的类型自动适配
 */
@Injectable()
export class TunnelServiceImpl implements TunnelService {
  private readonly logger = new Logger(TunnelServiceImpl.name);

  node_id: string = '';
  gatewayUrl: string = '';
  socket: Socket;

  private listeners: TunnelMessageListener[] = [];

  // 存储已连接的设备
  private connectedDevices: Set<string> = new Set<string>();

  // 存储任务处理器
  private streamHandlers: Map<string, (message: any) => Promise<void>> = new Map();
  private noStreamHandlers: Map<string, (message: any) => Promise<any>> = new Map();

  // 存储设备与任务的映射关系
  private deviceTaskMap: Map<string, Set<string>> = new Map();

  constructor(
    private readonly handlerRegistry: MessageHandlerRegistry,
    @Inject('MessageGateway') private readonly messageGateway: ITransportGateway,
    @Inject('PEER_ID') private peerId: string,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // 初始化socket为空对象，实际连接在createConnection中建立
    this.socket = {} as Socket;
    this.setupMessageGatewayCallbacks();
  }

  /**
   * 处理消息
   */
  async handleMessage(message: TunnelMessage, listener?: TunnelMessageListener): Promise<void> {
    // this.logger.log("TunnelServiceImpl.handleMessage", message);
    this.logger.log(`🔍 当前设备ID (peerId): ${this.peerId}`);
    this.logger.log(`📨 消息目标: ${message.to}, 消息来源: ${message.from}`);
    this.logger.log(`🔄 消息类型: ${message.type}`);

    if (message.from === message.to) {
      this.logger.debug("忽略自发自收消息");
      return;
    }

    try {
      // 发射消息接收事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.MESSAGE_RECEIVED,
        new TunnelMessageReceivedEvent(message)
      );

      // 使用注入的peerId
      if (message.to === this.peerId) {
        this.logger.log(`✅ 消息目标匹配，处理入站消息`);
        await this.handleIncomeMessage(message, listener);
      } else if (message.from === this.peerId) {
        this.logger.log(`📤 消息来源匹配，处理出站消息`);
        await this.handleOutcomeMessage(message, listener);
      } else {
        this.logger.warn(`❌ 忽略与设备ID不匹配的消息 - 当前设备: ${this.peerId}, 消息路径: ${message.from} -> ${message.to}`);
      }
    } catch (error) {
      this.logger.error(`消息处理失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 发射消息处理失败事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.MESSAGE_FAILED,
        new TunnelMessageFailedEvent(message, error instanceof Error ? error : new Error('未知错误'))
      );

      throw error;
    }
  }

  /**
   * 发送消息到网关
   */
  async sendMessage(message: TunnelMessage): Promise<void> {
    try {
      await this.messageGateway.sendMessage(message);

      // 发射消息发送成功事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.MESSAGE_SENT,
        new TunnelMessageSentEvent(message)
      );
    } catch (error) {
      this.logger.error(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 发射消息发送失败事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.MESSAGE_FAILED,
        new TunnelMessageFailedEvent(message, error instanceof Error ? error : new Error('发送消息失败'))
      );

      throw new MessageSendError('发送消息失败', message);
    }
  }

  /**
   * 创建连接 - 支持Socket和Libp2p
   */
  async createConnection(gatewayAddress: string, code?: string, basePath?: string): Promise<void> {
    try {
      this.logger.log(`🔗 正在建立连接到: ${gatewayAddress}`);

      // 使用统一的类型判断函数
      const transportType = getTransportGatewayType(this.messageGateway);
      if (transportType === 'socket') {
        // Socket实现需要实际建立连接
        const socketGateway = this.messageGateway as ISocketTransportGateway;
        await socketGateway.connect(gatewayAddress, code, basePath);
        this.logger.log(`✅ Socket连接建立成功`);
      } else {
        // Libp2p实现不需要实际连接，只记录状态
        this.logger.log(`✅ Libp2p模式，连接状态已更新`);
      }

      this.gatewayUrl = gatewayAddress;
      this.socket = {} as Socket; // 保持兼容性

      // 发射连接建立事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.CONNECTION_ESTABLISHED,
        new TunnelConnectionEstablishedEvent(this.peerId || 'unknown', gatewayAddress)
      );
    } catch (error) {
      this.logger.error(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 发射错误事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.ERROR,
        new TunnelErrorEvent(
          error instanceof Error ? error : new Error('连接失败'),
          'createConnection',
          this.peerId
        )
      );

      throw new ConnectionError('连接失败', error as Error);
    }
  }

  /**
   * 连接Socket
   */
  async connect(node_id: string): Promise<void> {
    try {
      this.node_id = node_id;
      this.peerId = node_id;

      // 更新全局PEER_ID提供者
      GLOBAL_PEER_ID_PROVIDER.setPeerId(node_id);

      // await this.messageGateway.registerDevice(node_id);
      this.logger.log(`发送设备注册请求，ID: ${node_id}`);

      // 发射设备注册事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.DEVICE_REGISTERED,
        new TunnelDeviceRegisteredEvent(node_id, node_id)
      );
    } catch (error) {
      this.logger.error(`设备注册失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 发射错误事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.ERROR,
        new TunnelErrorEvent(
          error instanceof Error ? error : new Error('设备注册失败'),
          'connect',
          node_id
        )
      );

      throw new DeviceRegistrationError(node_id, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 断开Socket连接
   */
  async disconnect(): Promise<void> {
    try {
      // 使用统一的类型判断函数
      const transportType = getTransportGatewayType(this.messageGateway);
      if (transportType === 'socket') {
        // Socket实现需要实际断开连接
        const socketGateway = this.messageGateway as ISocketTransportGateway;
        await socketGateway.disconnect();
        this.logger.log('Socket连接已断开');
      } else {
        // Libp2p实现不需要实际断开，只记录状态
        this.logger.log('Libp2p模式，连接状态已更新');
      }

      // 发射连接断开事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.CONNECTION_LOST,
        new TunnelConnectionLostEvent(this.peerId, 'Manual disconnect')
      );

      // 清理状态
      this.connectedDevices.clear();
      this.streamHandlers.clear();
      this.noStreamHandlers.clear();
      this.deviceTaskMap.clear();
      this.listeners = [];
    } catch (error) {
      this.logger.error(`断开连接失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 发射错误事件
      this.eventEmitter.emit(
        TUNNEL_EVENTS.ERROR,
        new TunnelErrorEvent(
          error instanceof Error ? error : new Error('断开连接失败'),
          'disconnect',
          this.peerId
        )
      );

      throw error;
    }
  }

  /**
   * 获取所有已连接设备
   */
  async getConnectedDevices(): Promise<string[]> {
    return Array.from(this.connectedDevices);
  }

  /**
   * 检查设备是否已连接
   */
  async isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.connectedDevices.has(deviceId);
  }

  /**
   * 检查连接状态 - 支持Socket和Libp2p
   */
  isConnected(): boolean {
    // 使用统一的类型判断函数
    const transportType = getTransportGatewayType(this.messageGateway);
    if (transportType === 'socket') {
      const socketGateway = this.messageGateway as ISocketTransportGateway;
      return socketGateway.isConnected();
    } else {
      // Libp2p实现通过getConnectionStatus检查
      return this.messageGateway.getConnectionStatus().connected;
    }
  }

  /**
   * 等待连接建立
   */
  async waitForConnection(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.isConnected()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * 设置Socket事件监听器（保持兼容性）
   */
  setupSocketListeners(): void {
    // 这个方法保持为空，实际的监听器设置在MessageGateway中
    this.logger.debug('setupSocketListeners called (compatibility method)');
  }

  /**
   * 处理连接断开（保持兼容性）
   */
  handleDisconnect(): void {
    this.logger.warn('handleDisconnect called (compatibility method)');
  }

  /**
   * 设置MessageGateway回调
   */
  private setupMessageGatewayCallbacks(): void {
    this.messageGateway.onMessage((message: TunnelMessage) => {
      this.handleMessage(message).catch(error => {
        this.logger.error(`处理接收到的消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      });
    });

    // 使用统一的类型判断函数
    const transportType = getTransportGatewayType(this.messageGateway);
    if (transportType === 'socket') {
      const socketGateway = this.messageGateway as ISocketTransportGateway;
      socketGateway.onConnectionChange((connected: boolean) => {
        if (connected) {
          this.logger.log('与网关连接已建立');
        } else {
          this.logger.warn('与网关连接已断开');
        }
      });
    }

    // onError是可选方法，需要检查是否存在
    if (this.messageGateway.onError) {
      this.messageGateway.onError((error: Error) => {
        this.logger.error(`MessageGateway错误: ${error.message}`);
      });
    }
  }

  /**
   * 处理入站消息
   */
  private async handleIncomeMessage(message: TunnelMessage, listener?: TunnelMessageListener): Promise<void> {
    await this.triggerListener(message);

    const handler = this.handlerRegistry.getIncomeHandler(message.type);
    if (!handler) {
      this.logger.error(`Cannot handle income message ${message.type}`);
      throw new UnknownMessageTypeError(message.type, 'income');
    }
    await handler.handleMessage(message);

    // 在最后添加监听器以避免自触发
    if (listener) {
      this.listeners.push(listener);
    }
  }

  /**
   * 处理出站消息
   */
  private async handleOutcomeMessage(message: TunnelMessage, listener?: TunnelMessageListener): Promise<void> {
    await this.triggerListener(message);

    const handler = this.handlerRegistry.getOutcomeHandler(message.type);
    if (!handler) {
      this.logger.error(`Cannot handle outcome message ${message.type}`);
      throw new UnknownMessageTypeError(message.type, 'outcome');
    }
    await handler.handleMessage(message);

    // 在最后添加监听器以避免自触发
    if (listener) {
      this.listeners.push(listener);
    }
  }

  /**
   * 触发监听器
   */
  private async triggerListener(message: TunnelMessage) {
    const remaining: TunnelMessageListener[] = [];

    for (const _listener of this.listeners) {
      const isMatch = _listener.match(message);

      if (isMatch) {
        _listener.callback(message);

        const shouldRemove = _listener.once?.(message) ?? false;
        if (!shouldRemove) {
          remaining.push(_listener);
        }
      } else {
        remaining.push(_listener);
      }
    }

    this.listeners = remaining;
  }
}

