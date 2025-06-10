import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutcomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, TaskResponseMessage, TaskResponseMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';
import { TunnelService } from '../../tunnel.interface';

@MessageHandler({ type: 'task_response', direction: 'outcome' })
@Injectable()
export class OutcomeTaskResponseHandler extends OutcomeBaseMessageHandler {
  private readonly logger = new Logger(OutcomeTaskResponseHandler.name);

  constructor(
    @Inject('TunnelService') private readonly tunnel: TunnelService,
    @Inject('PEER_ID') protected override readonly peerId: string
  ) {
    super(peerId);
  }

  async handleOutcomeMessage(message: TunnelMessage): Promise<void> {
    const taskResponseMessage = TaskResponseMessageSchema.parse(message) as TaskResponseMessage;
    
    this.logger.debug(`发送任务响应: ${taskResponseMessage.payload.taskId}`);

    // 发送消息到网关
    await this.tunnel.sendMessage(taskResponseMessage);
  }
}
