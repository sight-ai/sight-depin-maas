import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceModelReportMessage, DeviceModelReportMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 模型上报消息出站处理器
 *
 * 处理发送出去的模型上报消息，用于记录和监控
 */
@MessageHandler({ type: 'device_model_report', direction: 'outcome' })
@Injectable()
export class OutcomeDeviceModelReportHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeDeviceModelReportHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    try {
      const reportMessage = DeviceModelReportMessageSchema.parse(message) as DeviceModelReportMessage;

      this.logger.log(`Sending model report to ${reportMessage.to}`);
      this.logger.debug(`Model report payload:`, reportMessage.payload);

      // 发送消息到tunnel
      await this.tunnel.sendMessage(reportMessage);

      this.logger.log(`Model report sent successfully`);

    } catch (error) {
      this.logger.error('Error sending model report message:', error);
      throw error;
    }
  }
}
