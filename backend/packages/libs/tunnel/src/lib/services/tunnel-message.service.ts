import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  DeviceRegisterRequestMessage,
  DeviceModelReportMessage,
  DeviceHeartbeatReportMessage,
  DeviceRegisterRequestPayload,
  DeviceModelReportPayload,
  DeviceHeartbeatReportPayload
} from '@saito/models';
import { MessageHandlerRegistry } from '../message-handler/message-handler.registry';
import { TunnelService } from '../tunnel.interface';

/**
 * Tunnel消息发送服务
 * 
 * 提供便捷的方法来发送各种类型的tunnel消息
 */
@Injectable()
export class TunnelMessageService {
  private readonly logger = new Logger(TunnelMessageService.name);

  constructor(
    private readonly messageHandlerRegistry: MessageHandlerRegistry,
    @Inject('TunnelService') private readonly tunnelService: TunnelService
  ) {}

  /**
   * 检查连接状态，如果未连接则抛出错误
   */
  private async ensureConnection(): Promise<void> {
    if (!this.tunnelService.isConnected()) {
      throw new Error('WebSocket连接未建立，请先调用 TunnelService.createSocket() 建立连接');
    }
  }

  /**
   * 发送设备注册请求消息
   */
  async sendDeviceRegisterMessage(
    from: string,
    to: string,
    payload: DeviceRegisterRequestPayload
  ): Promise<void> {
    // 检查连接状态
    await this.ensureConnection();

    const message: DeviceRegisterRequestMessage = {
      type: 'device_register_request',
      from,
      to,
      timestamp: Date.now(),
      payload
    };

    this.logger.log(`Sending device register message from ${from} to ${to}`);
    this.logger.log(message)
    // 通过outcome处理器发送消息
    await this.messageHandlerRegistry.handleOutcomeMessage(message);
  }

  /**
   * 发送模型上报消息
   */
  async sendModelReportMessage(
    from: string,
    to: string,
    payload: DeviceModelReportPayload
  ): Promise<void> {
    // 检查连接状态
    await this.ensureConnection();

    const message: DeviceModelReportMessage = {
      type: 'device_model_report',
      from,
      to,
      timestamp: Date.now(),
      payload
    };

    this.logger.log(`Sending model report message from ${from} to ${to}`);

    // 通过outcome处理器发送消息
    await this.messageHandlerRegistry.handleOutcomeMessage(message);
  }

  /**
   * 发送心跳上报消息
   */
  async sendHeartbeatReportMessage(
    from: string,
    to: string,
    payload: DeviceHeartbeatReportPayload
  ): Promise<void> {
    // 检查连接状态
    await this.ensureConnection();

    const message: DeviceHeartbeatReportMessage = {
      type: 'device_heartbeat_report',
      from,
      to,
      timestamp: Date.now(),
      payload
    };

    this.logger.log(`Sending heartbeat report message from ${from} to ${to}`);

    // 通过outcome处理器发送消息
    await this.messageHandlerRegistry.handleOutcomeMessage(message);
  }

  /**
   * 批量发送设备注册请求（支持多个目标）
   */
  async broadcastDeviceRegisterMessage(
    from: string,
    targets: string[],
    payload: DeviceRegisterRequestPayload
  ): Promise<void> {
    const promises = targets.map(to =>
      this.sendDeviceRegisterMessage(from, to, payload)
    );

    await Promise.all(promises);
    this.logger.log(`Broadcasted device register message to ${targets.length} targets`);
  }

  /**
   * 批量发送模型上报消息（支持多个目标）
   */
  async broadcastModelReportMessage(
    from: string,
    targets: string[],
    payload: DeviceModelReportPayload
  ): Promise<void> {
    const promises = targets.map(to =>
      this.sendModelReportMessage(from, to, payload)
    );

    await Promise.all(promises);
    this.logger.log(`Broadcasted model report message to ${targets.length} targets`);
  }

  /**
   * 批量发送心跳上报消息（支持多个目标）
   */
  async broadcastHeartbeatReportMessage(
    from: string,
    targets: string[],
    payload: DeviceHeartbeatReportPayload
  ): Promise<void> {
    const promises = targets.map(to =>
      this.sendHeartbeatReportMessage(from, to, payload)
    );

    await Promise.all(promises);
    this.logger.log(`Broadcasted heartbeat report message to ${targets.length} targets`);
  }
}
