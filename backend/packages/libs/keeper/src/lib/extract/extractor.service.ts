import { SaitoSessionContext } from "@saito/models";
import { SaitoRuntime } from "../../runtime";
import { ExtractMemoryFuncCallResult, ExtractMemoryFuncCallResultSchema, makeExtractMemoryRequests } from "../../memory";
import { createChatCompletionFromSchema } from "../create-chat-completion";
import { MemoryEthStorage } from "../memory.ethstorage";
import { Inject } from "@nestjs/common";

/**
 * Abstract service for extracting memory related to a given user input.
 * This abstraction allows for different implementations of memory extraction logic and test purpose  .
 */
export abstract class MemoryExtractorService {
  abstract extractMemory(
    input: string,
    sessionContext: SaitoSessionContext,
    runtime: SaitoRuntime,
  ): Promise<ExtractMemoryFuncCallResult>;
}

/**
 * Extracts additional context (memory) based on the current user input and session history.
 *
 * @param input - The current message from the user.
 * @param sessionContext - Context of the ongoing session, including historical messages.
 * @param runtime - Runtime environment containing configurations and client details.
 * @returns A promise that resolves to the extracted memory result.
 */
export class DefaultMemoryExtractorService implements MemoryExtractorService {
  constructor(@Inject(MemoryEthStorage) private readonly memoryEthStorage: MemoryEthStorage) {}

  /**
   * Extracts potential memory from user input by leveraging conversation history.
   *
   * The method performs the following steps:
   * 1. Filters the session history to include only messages from the user and the assistant.
   * 2. Concatenates these messages into a formatted string.
   * 3. Constructs a conversation context that includes both the history and the current input.
   * 4. Creates a request payload using the conversation context to extract memory.
   * 5. Calls a chat completion API with the generated request and validates the response
   *    against the expected schema.
   * 6. If the extraction fails, it throws an error with the input and failure reason.
   * 7. Otherwise, it returns the extracted memory result.
   *
   * @param input - The user's current message.
   * @param sessionContext - The session context containing historical conversation data.
   * @param runtime - The runtime environment with client details and configuration.
   * @returns A promise that resolves to the extracted memory function call result.
   */
  async extractMemory(
    input: string,
    sessionContext: SaitoSessionContext,
    runtime: SaitoRuntime,
  ): Promise<ExtractMemoryFuncCallResult> {
    const historyMessagesConcat = sessionContext.historyMessages
      .filter(message => ['user', 'assistant'].includes(message.role))
      .map(message => `${message.role}: ${message.content}`)
      .join('\n')

    const conversation =  `\n### HistoryMessages
  ${historyMessagesConcat}
  ### CurrentMessage
  user: ${input}
  `
    const requestBody = makeExtractMemoryRequests(conversation);
    const rs = await createChatCompletionFromSchema(
      requestBody,
      ExtractMemoryFuncCallResultSchema,
      runtime.client);

    if (rs.status === 'failed') {
      throw new Error(
        `failed to resolve memory logic for input:\n ${input} \n ${rs.reason}`,
      );
    }

    return rs.result.args as ExtractMemoryFuncCallResult;
  }

}

const MemoryExtractorServiceProvider = {
  provide: MemoryExtractorService,
  useClass: DefaultMemoryExtractorService,
};

export default MemoryExtractorServiceProvider;
