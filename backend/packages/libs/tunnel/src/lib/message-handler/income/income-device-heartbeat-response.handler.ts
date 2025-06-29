import { Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceHeartbeatResponseMessage, DeviceHeartbeatResponseMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 设备心跳响应消息入站处理器
 *
 * 处理通过tunnel接收到的设备心跳响应，记录心跳状态
 */
@MessageHandler({ type: 'device_heartbeat_response', direction: 'income' })
@Injectable()
export class IncomeDeviceHeartbeatResponseHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeDeviceHeartbeatResponseHandler.name);

  constructor() {
    super();
  }

  /**
   * 处理入站设备心跳响应消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    try {
      // 验证消息格式
      const heartbeatResponse = DeviceHeartbeatResponseMessageSchema.parse(message) as DeviceHeartbeatResponseMessage;
      
      this.logger.debug(`收到设备心跳响应消息: ${JSON.stringify(heartbeatResponse)}`);

      if (heartbeatResponse.payload.success) {
        this.logger.log(`✅ 设备心跳响应成功 - DeviceID: ${heartbeatResponse.to}`);
        this.logger.debug(`心跳响应消息: ${heartbeatResponse.payload.message || 'Heartbeat acknowledged'}`);
      } else {
        this.logger.warn(`❌ 设备心跳响应失败 - DeviceID: ${heartbeatResponse.to}`);

        // 从payload中获取错误信息，支持多种字段名
        const errorMessage = heartbeatResponse.payload.message ||
                           (heartbeatResponse.payload as any).error ||
                           'Unknown error';
        this.logger.warn(`失败原因: ${errorMessage}`);

        // 如果是设备未找到错误，可能需要重新注册
        if (errorMessage.includes('Device not found')) {
          this.logger.warn(`🚨 设备未在网关找到，可能需要重新注册设备: ${heartbeatResponse.to}`);
        }
      }

      // 记录心跳响应时间
      this.logger.debug(`设备心跳响应时间: ${new Date().toISOString()}`);

    } catch (error) {
      this.logger.error(`处理设备心跳响应消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.logger.error(`原始消息: ${JSON.stringify(message)}`);
    }
  }
}
