import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TunnelMessageService, TunnelService, TunnelServiceImpl, TUNNEL_EVENTS, TunnelMessageReceivedEvent } from '@saito/tunnel';
import {
  DeviceRegisterRequestPayload,
  DeviceModelReportPayload,
  DeviceHeartbeatReportPayload,
  TunnelMessage
} from '@saito/models';

/**
 * Tunnel通信服务
 *
 * 负责通过tunnel发送设备注册、模型上报和心跳上报消息
 */
@Injectable()
export class TunnelCommunicationService {
  private readonly logger = new Logger(TunnelCommunicationService.name);

  constructor(
    @Inject('TunnelService') private readonly tunnelService: TunnelServiceImpl,
    private readonly tunnelMessageService: TunnelMessageService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 通过tunnel发送设备注册请求并等待响应
   */
  async sendDeviceRegistration(
    fromPeerId: string,
    toPeerId: string,
    registrationData: {
      code: string;
      gateway_address: string;
      reward_address: string;
      device_type?: string;
      gpu_type?: string;
      ip?: string;
      basePath?: string;
      device_id?: string; // 添加DID设备ID字段
      device_name?: string; // 添加设备名称字段
      local_models?: Array<{
        name: string;
        size: number;
        digest: string;
      }>;
      did_document?: any; // 添加DID文档字段
    }
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      this.logger.log(`Sending device registration from ${fromPeerId} to ${toPeerId}`);

      // 检查连接状态，如果未连接则建立连接
      if (!this.tunnelService.isConnected()) {
        this.logger.log(`🔗 WebSocket未连接，正在建立连接...`);
        await this.tunnelService.createConnection(
          registrationData.gateway_address,
          registrationData.code,
          registrationData.basePath || ''
        );
        // await this.tunnelService.connect(fromPeerId);
        this.logger.log(`✅ WebSocket连接已建立`);
      } else {
        // await this.tunnelService.connect(fromPeerId);
        this.logger.log(`✅ WebSocket已连接，直接发送消息`);
      }

      // 构造设备注册payload，包含DID文档
      const payload: DeviceRegisterRequestPayload = {
        code: registrationData.code,
        gateway_address: registrationData.gateway_address,
        reward_address: registrationData.reward_address,
        device_type: registrationData.device_type,
        gpu_type: registrationData.gpu_type,
        device_id: registrationData.device_id, // 添加DID设备ID
        device_name: registrationData.device_name, // 添加设备名称
        local_models: registrationData.local_models,
        ip: registrationData.ip,
        did_document: registrationData.did_document // 添加DID文档
      };

      // 记录DID文档集成信息
      if (registrationData.did_document) {
        this.logger.log(`📄 注册请求包含DID文档: ${registrationData.did_document.id}`);
      }

      // 发送设备注册消息并等待响应
      const response = await this.sendDeviceRegistrationWithResponse(
        fromPeerId,
        toPeerId,
        payload
      );

      this.logger.log(`Device registration completed via tunnel`);
      return response;

    } catch (error) {
      this.logger.error('Failed to send device registration via tunnel:');
      this.logger.error(error);

      // 如果是连接错误，尝试重连一次
      if (error instanceof Error && error.message && error.message.includes('连接')) {
        this.logger.log(`🔄 检测到连接错误，尝试重新连接...`);
        try {
          await this.tunnelService.createConnection(
            registrationData.gateway_address,
            registrationData.code,
            registrationData.basePath || ''
          );

          // 重新发送消息
          const payload: DeviceRegisterRequestPayload = {
            code: registrationData.code,
            gateway_address: registrationData.gateway_address,
            reward_address: registrationData.reward_address,
            device_type: registrationData.device_type,
            gpu_type: registrationData.gpu_type,
            device_id: registrationData.device_id,
            device_name: registrationData.device_name,
            local_models: registrationData.local_models,
            ip: registrationData.ip,
            did_document: registrationData.did_document
          };

          const retryResponse = await this.sendDeviceRegistrationWithResponse(
            fromPeerId,
            toPeerId,
            payload
          );

          this.logger.log(`✅ 重连后设备注册完成`);
          return retryResponse;
        } catch (retryError) {
          this.logger.error('重连尝试失败:', retryError);
          return {
            success: false,
            error: retryError instanceof Error ? retryError.message : 'Retry failed'
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * 发送设备注册消息并等待响应
   */
  private async sendDeviceRegistrationWithResponse(
    fromPeerId: string,
    toPeerId: string,
    payload: DeviceRegisterRequestPayload
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    return new Promise(async (resolve) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.logger.warn('Device registration response timeout');
          // 移除监听器
          this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
          resolve({ success: false, error: 'Registration timeout' });
        }
      }, 30000); // 30秒超时

      // 设置响应监听器 - 使用EventEmitter2监听TUNNEL_EVENTS
      const responseListener = (event: TunnelMessageReceivedEvent) => {
        try {
          const message = event.message;

          if (message.type === 'device_register_response' && message.from === toPeerId) {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              // 移除监听器
              this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);

              if (message.payload && message.payload.status === 'connected') {
                this.logger.log('✅ Device registration confirmed by gateway');
                resolve({
                  success: true,
                  data: message.payload
                });
              } else {
                this.logger.error('❌ Device registration rejected by gateway:', message.payload?.error);
                resolve({
                  success: false,
                  error: message.payload?.error || 'Registration rejected'
                });
              }
            }
          }
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            // 移除监听器
            this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
            this.logger.error('Error processing registration response:', error);
            resolve({
              success: false,
              error: 'Failed to process response'
            });
          }
        }
      };

      try {
        // 注册响应监听器 - 在发送消息之前注册
        this.eventEmitter.on(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);

        // 发送注册消息
        await this.tunnelMessageService.sendDeviceRegisterMessage(
          fromPeerId,
          toPeerId,
          payload
        );

        this.logger.log('✅ Device registration message sent, waiting for response...');

      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          // 移除监听器
          this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
          this.logger.error('Failed to send registration message:', error);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Send failed'
          });
        }
      }
    });
  }

  /**
   * 通过tunnel发送模型上报请求
   */
  async sendModelReport(
    fromPeerId: string,
    toPeerId: string,
    reportData: {
      device_id: string;
      models: Array<{
        name: string;
        modified_at: string;
        size: number;
        digest: string;
        details: {
          format: string;
          family: string;
          families: string[];
          parameter_size: string;
          quantization_level: string;
        };
      }>;
    }
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending model report from ${fromPeerId} to ${toPeerId}`);

      // 构造模型上报payload
      const payload: DeviceModelReportPayload = {
        device_id: reportData.device_id,
        models: reportData.models
      };

      // 发送模型上报消息
      await this.tunnelMessageService.sendModelReportMessage(
        fromPeerId,
        toPeerId,
        payload
      );

      // 等待模型上报响应
      const responseReceived = await this.waitForModelReportResponse(fromPeerId);

      if (responseReceived) {
        this.logger.log(`Model report sent successfully via tunnel`);
        return true;
      } else {
        this.logger.warn(`Model report sent but no response received`);
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to send model report via tunnel:', error);
      return false;
    }
  }

  /**
   * 通过tunnel发送心跳上报请求
   */
  async sendHeartbeatReport(
    fromPeerId: string,
    toPeerId: string,
    heartbeatData: {
      code: string;
      cpu_usage?: number;
      memory_usage?: number;
      gpu_usage?: number;
      ip?: string;
      timestamp?: string;
      type?: string;
      model?: string;
      device_info?: {
        cpu_model?: string;
        cpu_cores?: number;
        cpu_threads?: number;
        ram_total?: number;
        gpu_model?: string;
        gpu_count?: number;
        gpu_memory?: number;
        disk_total?: number;
        os_info?: string;
      };
    }
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending heartbeat report from ${fromPeerId} to ${toPeerId}`);

      // 构造心跳上报payload
      const payload: DeviceHeartbeatReportPayload = {
        code: heartbeatData.code,
        cpu_usage: heartbeatData.cpu_usage,
        memory_usage: heartbeatData.memory_usage,
        gpu_usage: heartbeatData.gpu_usage,
        ip: heartbeatData.ip,
        timestamp: heartbeatData.timestamp,
        type: heartbeatData.type,
        model: heartbeatData.model,
        device_info: heartbeatData.device_info
      };

      // 发送心跳上报消息
      await this.tunnelMessageService.sendHeartbeatReportMessage(
        fromPeerId,
        toPeerId,
        payload
      );

      // 等待心跳上报响应
      const responseReceived = await this.waitForHeartbeatResponse(fromPeerId);

      if (responseReceived) {
        this.logger.log(`Heartbeat report sent successfully via tunnel`);
        return true;
      } else {
        this.logger.warn(`Heartbeat report sent but no response received`);
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to send heartbeat report via tunnel:', error);
      return false;
    }
  }



  /**
   * 等待模型上报响应
   * 监听 device_model_report_response 消息
   */
  private async waitForModelReportResponse(deviceId: string): Promise<boolean> {
    return new Promise((resolve) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.logger.warn('Model report response timeout');
          this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
          resolve(false);
        }
      }, 30000); // 30秒超时

      // 创建响应监听器 - 使用EventEmitter2监听TUNNEL_EVENTS
      const responseListener = (event: TunnelMessageReceivedEvent) => {
        try {
          const message = event.message;

          if (message.type === 'device_model_report_response' && message.to === deviceId) {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);

              if (message.payload?.success) {
                this.logger.log('Model report response received: success');
                resolve(true);
              } else {
                this.logger.warn('Model report response received: failed', message.payload?.message);
                resolve(false);
              }
            }
          }
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
            this.logger.error('Error processing model report response:', error);
            resolve(false);
          }
        }
      };

      // 注册监听器
      this.eventEmitter.on(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
    });
  }

  /**
   * 等待心跳上报响应
   * 监听 device_heartbeat_response 消息
   */
  private async waitForHeartbeatResponse(deviceId: string): Promise<boolean> {
    return new Promise((resolve) => {
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.logger.warn('Heartbeat response timeout');
          this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
          resolve(false);
        }
      }, 30000); // 30秒超时

      // 创建响应监听器 - 使用EventEmitter2监听TUNNEL_EVENTS
      const responseListener = (event: TunnelMessageReceivedEvent) => {
        try {
          const message = event.message;

          if (message.type === 'device_heartbeat_response' && message.to === deviceId) {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);

              if (message.payload?.success) {
                this.logger.log('Heartbeat response received: success');
                resolve(true);
              } else {
                this.logger.warn('Heartbeat response received: failed', message.payload?.message);
                resolve(false);
              }
            }
          }
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            this.eventEmitter.off(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
            this.logger.error('Error processing heartbeat response:', error);
            resolve(false);
          }
        }
      };

      // 注册监听器
      this.eventEmitter.on(TUNNEL_EVENTS.MESSAGE_RECEIVED, responseListener);
    });
  }

}

export const TunnelCommunicationServiceProvider = {
  provide: TunnelCommunicationService,
  useClass: TunnelCommunicationService,
};

export default TunnelCommunicationServiceProvider;
