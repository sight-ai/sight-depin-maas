import { MemoryMetadata, SaitoSessionContext } from "@saito/models";
import { SaitoRuntime } from "../../runtime";
import { makeRetrieveMemoryRequests, RetrieveMemoryFuncCallResult, RetrieveMemoryFuncCallResultSchema } from "../../memory";
import { createChatCompletionFromSchema } from "../create-chat-completion";
import _ from 'lodash';

/**
 * Retrieve relative memory by input
 */
export abstract class MemoryRetrieverService {
  abstract retrieveMemory(
    input: string,
    memoryCatalog: MemoryMetadata[],
    sessionContext: SaitoSessionContext,
    runtime: SaitoRuntime,
  ): Promise<RetrieveMemoryFuncCallResult>;
}


export class DefaultMemoryRetrieverService implements MemoryRetrieverService {
  constructor() {}

  /**
   * Extra potential memory from user input
   * @param input
   * @param memoryCatalog
   * @param sessionContext
   * @param runtime
   */
  async retrieveMemory(
    input: string,
    memoryCatalog: MemoryMetadata[],
    sessionContext: SaitoSessionContext,
    runtime: SaitoRuntime,
  ): Promise<RetrieveMemoryFuncCallResult> {
    const historyMessagesConcat = sessionContext.historyMessages
      .filter(message => ['user', 'assistant'].includes(message.role))
      .map(message => `${message.role}: ${message.content}`)
      .join('\n')

    const conversation =  `\n### HistoryMessages
  ${historyMessagesConcat}
  ### CurrentMessage
  user: ${input}
  `
    const memoryCatalogText = _.map(memoryCatalog, ({ owner, category, name, sensitivity }) => {
      return `${owner}:memory:${category}:${name}:${sensitivity}`;
    }).join('\n');

    const requestBody = makeRetrieveMemoryRequests(conversation, memoryCatalogText);
    const rs = await createChatCompletionFromSchema(
      requestBody,
      RetrieveMemoryFuncCallResultSchema,
      runtime.client);

    if (rs.status === 'failed') {
      throw new Error(
        `failed to retrieve memory logic for input:\n ${input} \n ${rs.reason}`,
      );
    }

    return rs.result.args as RetrieveMemoryFuncCallResult;
  }

}

const MemoryRetrieverServiceProvider = {
  provide: MemoryRetrieverService,
  useClass: DefaultMemoryRetrieverService,
};

export default MemoryRetrieverServiceProvider;
