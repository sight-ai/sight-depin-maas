import { z } from 'zod';
import { ModelOfOpenAI } from '..';
import { OpenAIModel } from '../openai/openai.schema';
import {coerce} from "zod/lib/types";

export const SaitoSessionContextSchema = z.object({
  userId: z.coerce.string(),
  chatId: z.coerce.string(),
  sessionId: z.coerce.string(),
  isDialogActive: z.coerce.boolean(),
  historyMessages: z.array(OpenAIModel.request_message),
  agentId: z.coerce.string().optional()
});

export type SaitoSessionContext = z.infer<typeof SaitoSessionContextSchema>;

export function makeSaitoSessionContext(
  userId: string,
  chatId: string,
  sessionId: string,
  isDialogActive: boolean,
  historyMessages: ModelOfOpenAI<'request_message'>[],
  agentId?: string,
): SaitoSessionContext {
  return { userId, sessionId, chatId, isDialogActive, historyMessages, agentId };
}

export function makeDefaultSaitoSessionContext(): SaitoSessionContext {
  return makeSaitoSessionContext('', '', '', false, []);
}
