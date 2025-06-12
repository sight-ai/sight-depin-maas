import { Inject, Injectable } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, PingMessage, PongMessage, PingMessageSchema, PongMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

@MessageHandler({ type: 'ping', direction: 'income' })
@Injectable()
export class IncomePingHandler extends IncomeBaseMessageHandler {

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService
  ) {
    super();
  }

  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    const pingMessage = PingMessageSchema.parse(message) as PingMessage;

    const pongMessage: PongMessage = PongMessageSchema.parse({
      type: 'pong',
      from: this.peerId,
      to: pingMessage.from,
      payload: { 
        message: pingMessage.payload.message, 
        timestamp: Date.now() 
      },
    });

    await this.tunnel.handleMessage(pongMessage);
  }
}
