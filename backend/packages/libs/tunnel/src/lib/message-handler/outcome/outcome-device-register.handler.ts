import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceRegisterRequestMessage, DeviceRegisterRequestMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

/**
 * 设备注册请求消息出站处理器
 *
 * 处理发送出去的设备注册请求消息，用于记录和监控
 */
@MessageHandler({ type: 'device_register_request', direction: 'outcome' })
@Injectable()
export class OutcomeDeviceRegisterRequestHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeDeviceRegisterRequestHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    try {
      const registerMessage = DeviceRegisterRequestMessageSchema.parse(message) as DeviceRegisterRequestMessage;

      this.logger.log(`Sending device register request to ${registerMessage.to}`);
      this.logger.debug(`Register payload:`, registerMessage.payload);

      // 发送消息到tunnel
      await this.tunnel.sendMessage(registerMessage);

      this.logger.log(`Device register request sent successfully`);

    } catch (error) {
      this.logger.error('Error sending device register message:', error);
      throw error;
    }
  }
}
