import { Inject, Injectable } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, PingMessage, PingMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

@MessageHandler({ type: 'ping', direction: 'outcome' })
@Injectable()
export class OutcomePingHandler extends OutcomeBaseMessageHandler {

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
  ) {
    super();
  }

  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    const pingMessage = PingMessageSchema.parse(message) as PingMessage;
    
    await this.tunnel.sendMessage(pingMessage);
  }
}
