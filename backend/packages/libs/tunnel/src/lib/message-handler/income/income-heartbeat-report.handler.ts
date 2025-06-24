import { Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceHeartbeatReportMessage, DeviceHeartbeatReportMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 心跳上报消息入站处理器
 *
 * 处理通过tunnel接收到的心跳上报请求，记录日志并可以触发事件
 * 注意：为避免循环依赖，此处理器不直接调用DeviceStatusService
 */
@MessageHandler({ type: 'device_heartbeat_report', direction: 'income' })
@Injectable()
export class IncomeDeviceHeartbeatReportHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeDeviceHeartbeatReportHandler.name);

  constructor() {
    super();
  }

  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    try {
      const heartbeatMessage = DeviceHeartbeatReportMessageSchema.parse(message) as DeviceHeartbeatReportMessage;

      this.logger.log(`Processing heartbeat report request from ${heartbeatMessage.from}`);
      this.logger.debug(`Heartbeat payload:`, heartbeatMessage.payload);

      // 记录心跳上报请求信息
      this.logger.log(`Heartbeat report request details:`, {
        code: heartbeatMessage.payload.code,
        cpu_usage: heartbeatMessage.payload.cpu_usage,
        memory_usage: heartbeatMessage.payload.memory_usage,
        gpu_usage: heartbeatMessage.payload.gpu_usage,
        ip: heartbeatMessage.payload.ip,
        timestamp: heartbeatMessage.payload.timestamp,
        type: heartbeatMessage.payload.type,
        model: heartbeatMessage.payload.model,
        device_info: heartbeatMessage.payload.device_info ? 'provided' : 'not provided'
      });

      // TODO: 这里可以发送事件或者通过其他方式通知心跳服务
      // 避免直接依赖DeviceStatusService以防止循环依赖

      // 这里可以发送响应消息回给发送方
      // 或者触发其他后续处理逻辑

    } catch (error) {
      this.logger.error('Error processing heartbeat report message:', error);
      
      // 这里可以发送错误响应消息
    }
  }
}
