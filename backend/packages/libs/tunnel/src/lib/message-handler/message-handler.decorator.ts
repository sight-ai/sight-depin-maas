import { SetMetadata } from '@nestjs/common';

export const MESSAGE_HANDLER_META = 'message_handler';

export type MessageHandlerMeta = {
  type: string;
  direction: 'income' | 'outcome';
};

export const MessageHandler = (meta: MessageHandlerMeta) =>
  SetMetadata(MESSAGE_HANDLER_META, meta);
