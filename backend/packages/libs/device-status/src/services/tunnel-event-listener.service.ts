import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TUNNEL_EVENTS,
  TunnelConnectionEstablishedEvent,
  TunnelConnectionLostEvent,
  TunnelDeviceRegisteredEvent,
  TunnelMessageReceivedEvent,
  TunnelHeartbeatReceivedEvent,
  TunnelModelReportReceivedEvent,
  TunnelChatRequestReceivedEvent,
  TunnelErrorEvent,
  TunnelDeviceStatusUpdateRequestEvent
} from '@saito/tunnel';
import {
  TDeviceConfig,
  TDeviceSystem,
  DEVICE_CONFIG_SERVICE,
  DEVICE_SYSTEM_SERVICE
} from '../device-status.interface';
import { DeviceStatusManagerService } from './device-status-manager.service';
import { RegistrationStatus } from '../registration-storage';

/**
 * Tunnel 事件监听器服务
 * 
 * 负责监听来自 tunnel 模块的事件，并执行相应的设备状态管理操作
 * 这样可以避免 tunnel 模块直接依赖 device-status 模块
 */
@Injectable()
export class TunnelEventListenerService {
  private readonly logger = new Logger(TunnelEventListenerService.name);

  constructor(
    @Optional() @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig | null,
    
    @Optional() @Inject(DEVICE_SYSTEM_SERVICE)
    private readonly systemService: TDeviceSystem | null,
    
    private readonly deviceStatusManager: DeviceStatusManagerService
  ) {}

  /**
   * 监听连接建立事件
   */
  @OnEvent(TUNNEL_EVENTS.CONNECTION_ESTABLISHED)
  async handleConnectionEstablished(event: TunnelConnectionEstablishedEvent): Promise<void> {
    this.logger.log(`🔗 Tunnel连接已建立: ${event.deviceId} -> ${event.gatewayUrl}`);
    
    try {
      // 更新设备状态为在线
      await this.deviceStatusManager.updateDeviceStatus('online', 'Tunnel connection established');
      
      // 可以在这里触发其他需要在连接建立后执行的操作
      // 例如：发送设备注册请求、开始心跳等
      
    } catch (error) {
      this.logger.error('处理连接建立事件失败:', error);
    }
  }

  /**
   * 监听连接断开事件
   */
  @OnEvent(TUNNEL_EVENTS.CONNECTION_LOST)
  async handleConnectionLost(event: TunnelConnectionLostEvent): Promise<void> {
    this.logger.warn(`❌ Tunnel连接已断开: ${event.deviceId}, 原因: ${event.reason}`);
    
    try {
      // 更新设备状态为离线
      await this.deviceStatusManager.updateDeviceStatus('offline', `Connection lost: ${event.reason}`);
      
      // 可以在这里触发重连逻辑或其他清理操作
      
    } catch (error) {
      this.logger.error('处理连接断开事件失败:', error);
    }
  }

  /**
   * 监听设备注册事件
   */
  @OnEvent(TUNNEL_EVENTS.DEVICE_REGISTERED)
  async handleDeviceRegistered(event: TunnelDeviceRegisteredEvent): Promise<void> {
    this.logger.log(`✅ 设备注册成功: ${event.deviceId} (PeerID: ${event.peerId})`);

    try {
      // 更新设备状态
      await this.deviceStatusManager.updateDeviceStatus('online', 'Device registered successfully');

      // 更新注册状态为成功
      if (this.configService && typeof this.configService.updateRegistrationStatus === 'function') {
        this.configService.updateRegistrationStatus(
          RegistrationStatus.SUCCESS,
          undefined
        );
        this.logger.log('✅ 注册状态已更新为SUCCESS');
      } else {
        this.logger.warn('⚠️ 无法更新注册状态：configService不可用');
      }

      // 可以在这里触发注册后的初始化操作
      // 例如：发送模型报告、开始定时心跳等

    } catch (error) {
      this.logger.error('处理设备注册事件失败:', error);
    }
  }

  /**
   * 监听心跳接收事件
   */
  @OnEvent(TUNNEL_EVENTS.HEARTBEAT_RECEIVED)
  async handleHeartbeatReceived(event: TunnelHeartbeatReceivedEvent): Promise<void> {
    this.logger.debug(`💓 收到心跳: 来自设备 ${event.fromDeviceId}`);
    
    try {
      // 记录心跳接收时间，更新设备活跃状态
      // 这里可以实现心跳响应逻辑
      
    } catch (error) {
      this.logger.error('处理心跳接收事件失败:', error);
    }
  }

  /**
   * 监听模型报告接收事件
   */
  @OnEvent(TUNNEL_EVENTS.MODEL_REPORT_RECEIVED)
  async handleModelReportReceived(event: TunnelModelReportReceivedEvent): Promise<void> {
    this.logger.log(`📊 收到模型报告: 来自设备 ${event.fromDeviceId}, 模型数量: ${event.models.length}`);
    
    try {
      // 处理模型报告，更新本地模型信息
      // 可以在这里实现模型信息的存储和管理
      
    } catch (error) {
      this.logger.error('处理模型报告接收事件失败:', error);
    }
  }

  /**
   * 监听聊天请求接收事件
   */
  @OnEvent(TUNNEL_EVENTS.CHAT_REQUEST_RECEIVED)
  async handleChatRequestReceived(event: TunnelChatRequestReceivedEvent): Promise<void> {
    this.logger.log(`💬 收到聊天请求: ${event.requestId} 来自设备 ${event.fromDeviceId} (流式: ${event.isStream})`);
    
    try {
      // 记录API调用统计
      // 可以在这里实现请求计数、负载监控等
      
    } catch (error) {
      this.logger.error('处理聊天请求接收事件失败:', error);
    }
  }

  /**
   * 监听错误事件
   */
  @OnEvent(TUNNEL_EVENTS.ERROR)
  async handleTunnelError(event: TunnelErrorEvent): Promise<void> {
    this.logger.error(`🚨 Tunnel错误: ${event.context} - ${event.error.message}`, event.error.stack);
    
    try {
      // 根据错误类型更新设备状态
      if (event.context.includes('connect') || event.context.includes('socket')) {
        await this.deviceStatusManager.updateDeviceStatus('error', `Connection error: ${event.error.message}`);
      }
      
      // 可以在这里实现错误恢复逻辑
      
    } catch (error) {
      this.logger.error('处理Tunnel错误事件失败:', error);
    }
  }

  /**
   * 监听消息接收事件（通用）
   */
  @OnEvent(TUNNEL_EVENTS.MESSAGE_RECEIVED)
  async handleMessageReceived(event: TunnelMessageReceivedEvent): Promise<void> {
    this.logger.debug(`📨 收到消息: ${event.message.type} 从 ${event.message.from} 到 ${event.message.to}`);

    try {
      // 可以在这里实现消息统计、日志记录等通用逻辑

    } catch (error) {
      this.logger.error('处理消息接收事件失败:', error);
    }
  }

  /**
   * 监听设备状态更新请求事件
   */
  @OnEvent(TUNNEL_EVENTS.DEVICE_STATUS_UPDATE_REQUEST)
  async handleDeviceStatusUpdateRequest(event: TunnelDeviceStatusUpdateRequestEvent): Promise<void> {
    this.logger.log(`🔄 收到设备状态更新请求: ${event.deviceId} -> ${event.status} (${event.reason})`);

    try {
      // 更新设备状态
      await this.deviceStatusManager.updateDeviceStatus(event.status as any, event.reason || 'Status update requested');

      this.logger.log(`✅ 设备状态更新成功: ${event.deviceId} -> ${event.status}`);

    } catch (error) {
      this.logger.error('处理设备状态更新请求失败:', error);
    }
  }
}
