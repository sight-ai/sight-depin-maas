import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceHeartbeatReportMessage, DeviceHeartbeatReportMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 心跳上报消息出站处理器
 *
 * 处理发送出去的心跳上报消息，用于记录和监控
 */
@MessageHandler({ type: 'device_heartbeat_report', direction: 'outcome' })
@Injectable()
export class OutcomeDeviceHeartbeatReportHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeDeviceHeartbeatReportHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    try {
      const heartbeatMessage = DeviceHeartbeatReportMessageSchema.parse(message) as DeviceHeartbeatReportMessage;

      this.logger.log(`Sending heartbeat report to ${heartbeatMessage.to}`);
      this.logger.debug(`Heartbeat payload:`, heartbeatMessage.payload);

      // 发送消息到tunnel
      await this.tunnel.sendMessage(heartbeatMessage);

      this.logger.log(`Heartbeat report sent successfully`);

    } catch (error) {
      this.logger.error('Error sending heartbeat report message:', error);
      throw error;
    }
  }
}
