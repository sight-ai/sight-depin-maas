import { Inject, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io-client';
import { TunnelService, TunnelMessageListener } from './tunnel.interface';
import { TunnelMessage } from '@saito/models';
import { MessageHandlerRegistry } from './message-handler/message-handler.registry';
import { UnknownMessageTypeError } from './errors/unknown-message-type.error';
import { MessageGateway } from './message-gateway/message-gateway.interface';
import { ConnectionError, DeviceRegistrationError, MessageSendError } from './errors/connection.error';

/**
 * 隧道服务实现
 * 负责建立和管理与网关的WebSocket连接，处理消息传递
 *
 * 重构后的实现，遵循tunnel-gateway的设计格式和风格
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
    @Inject('MessageGateway') private readonly messageGateway: MessageGateway,
    @Inject('PEER_ID') private readonly peerId: string,
  ) {
    // 初始化socket为空对象，实际连接在createSocket中建立
    this.socket = {} as Socket;
    this.setupMessageGatewayCallbacks();
  }

  /**
   * 处理消息
   */
  async handleMessage(message: TunnelMessage, listener?: TunnelMessageListener): Promise<void> {
    this.logger.log("TunnelServiceImpl.handleMessage", message);

    if (message.from === message.to) {
      return;
    }

    // 使用注入的peerId
    if (message.to === this.peerId) {
      await this.handleIncomeMessage(message, listener);
    } else if (message.from === this.peerId) {
      await this.handleOutcomeMessage(message, listener);
    } else {
      this.logger.warn(`Ignore message not related to ${this.peerId}: ${message.from} -> ${message.to}`);
    }
  }

  /**
   * 发送消息到网关
   */
  async sendMessage(message: TunnelMessage): Promise<void> {
    try {
      await this.messageGateway.sendMessage(message);
    } catch (error) {
      this.logger.error(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw new MessageSendError('发送消息失败', message);
    }
  }

  /**
   * 创建Socket连接
   */
  async createSocket(gatewayAddress: string, key: string, code?: string, basePath?: string): Promise<void> {
    try {
      await this.messageGateway.connect(gatewayAddress, key, code, basePath);
      this.gatewayUrl = gatewayAddress;
      this.socket = {} as Socket; // 保持兼容性
    } catch (error) {
      this.logger.error(`创建Socket连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw new ConnectionError('创建Socket连接失败', error as Error);
    }
  }

  /**
   * 连接Socket
   */
  async connectSocket(node_id: string): Promise<void> {
    try {
      this.node_id = node_id;
      await this.messageGateway.registerDevice(node_id);
      this.logger.log(`发送设备注册请求，ID: ${node_id}`);
    } catch (error) {
      this.logger.error(`设备注册失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw new DeviceRegistrationError(node_id, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 断开Socket连接
   */
  async disconnectSocket(): Promise<void> {
    try {
      await this.messageGateway.disconnect();
      this.logger.log('Socket连接已断开');

      // 清理状态
      this.connectedDevices.clear();
      this.streamHandlers.clear();
      this.noStreamHandlers.clear();
      this.deviceTaskMap.clear();
      this.listeners = [];
    } catch (error) {
      this.logger.error(`断开连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 向设备发送消息
   */
  async handleSendToDevice(params: { deviceId: string; message: string }): Promise<void> {
    // TODO: 实现向设备发送消息的逻辑
    this.logger.debug(`向设备 ${params.deviceId} 发送消息: ${params.message}`);
  }

  /**
   * 为任务注册流式处理器
   */
  async handleRegisterStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<void>;
  }): Promise<void> {
    const { taskId, targetDeviceId, onMessage } = params;

    this.streamHandlers.set(taskId, onMessage);

    if (!this.deviceTaskMap.has(targetDeviceId)) {
      this.deviceTaskMap.set(targetDeviceId, new Set<string>());
    }
    this.deviceTaskMap.get(targetDeviceId)?.add(taskId);

    this.logger.debug(`为任务 ${taskId} 注册流式处理器，目标设备: ${targetDeviceId}`);
  }

  /**
   * 为任务注册非流式处理器
   */
  async handleRegisterNoStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<any>;
  }): Promise<void> {
    const { taskId, targetDeviceId, onMessage } = params;

    this.noStreamHandlers.set(taskId, onMessage);

    if (!this.deviceTaskMap.has(targetDeviceId)) {
      this.deviceTaskMap.set(targetDeviceId, new Set<string>());
    }
    this.deviceTaskMap.get(targetDeviceId)?.add(taskId);

    this.logger.debug(`为任务 ${taskId} 注册非流式处理器，目标设备: ${targetDeviceId}`);
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

    this.messageGateway.onConnectionChange((connected: boolean) => {
      if (connected) {
        this.logger.log('与网关连接已建立');
      } else {
        this.logger.warn('与网关连接已断开');
      }
    });

    this.messageGateway.onError((error: Error) => {
      this.logger.error(`MessageGateway错误: ${error.message}`);
    });
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