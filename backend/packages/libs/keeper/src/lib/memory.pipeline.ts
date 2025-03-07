import { Inject } from "@nestjs/common";
import { MemoryEthStorage } from "./memory.ethstorage";
import memoizee from "memoizee";
import OpenAI from "openpipe/openai";
import { env } from "../../env";
import { Memory } from "@saito/models";
import { SaitoRuntime } from "../runtime";
import { AuthorizeMemoryResult, MemoryKeeperPipeline, RetrieveMemoryResult } from "./keeper.interface";
import { MemoryExtractorService } from "./extract/extractor.service";
import { MemoryRetrieverService } from "./retireve/retriever.service";
import { MemoryAuthService } from "./authorize/auth.service";

// We mock this for standalone demo purpose
export const createMockSessionContext = () => {
  return {
    historyMessages: [],
    isDialogActive: false,
    // we mock here for demo purpose
    chatId: env().CHAIN_ID,
    sessionId: '0',
    userId: env().WALLET_ADDRESS, // extract from authorization header by SIWE in production env
    requesterId: env().REQUESTER_ADDRESS,
  }
}

//
export const createLocalRuntime = memoizee(() => {
  const runtime: SaitoRuntime = {
    client: new OpenAI({
      apiKey: env().OPENAI_API_KEY,
      organization: env().OPENAI_ORGANIZATION,
      openpipe: {
        apiKey: env().OPENPIPE_API_KEY
      }
    }),
  };

  return runtime;
});

export class DefaultMemoryKeeperPipeline implements MemoryKeeperPipeline {

  // we keep here for demo purpose
  private readonly runtime = createLocalRuntime();
  private readonly sessionContext = createMockSessionContext();

  constructor(
    @Inject(MemoryEthStorage) private readonly memoryEthStorage: MemoryEthStorage,
    @Inject(MemoryExtractorService) private readonly memoryExtractorService: MemoryExtractorService,
    @Inject(MemoryRetrieverService) private readonly memoryRetrieverService: MemoryRetrieverService,
    @Inject(MemoryAuthService) private readonly memoryAuthService: MemoryAuthService
  ) {
  }

  /**
   * Extracts memory from the user's conversation and saves it to the EthStorage.
   *
   * This method performs the following steps:
   * 1. Calls the memory extractor service with the current input, session context, and runtime
   *    to generate a memory extraction result from the conversation.
   * 2. Uploads the extracted memory record to EthStorage using the provided details
   *    (e.g., userId, category, name, content, sensitivity).
   * 3. Returns the newly created memory record.
   *
   * @param input - The user's current message.
   * @returns A promise that resolves with the created memory record.
   */
  async extractMemory(input: string): Promise<Memory> {

    // extract memory from user conversation
    const memoryExtractResult = await this.memoryExtractorService.extractMemory(
      input, this.sessionContext, this.runtime);

    // upload memory record to EthStorage
    const memory = await this.memoryEthStorage.createMemory(
      this.sessionContext.userId,
      memoryExtractResult.category,
      memoryExtractResult.name,
      memoryExtractResult.content,
      memoryExtractResult.sensitivity)

    return memory;
    }

  /**
   * Retrieves memory records that may help enhance the conversation based on the input.
   *
   * The process involves:
   * 1. Refreshing the memory catalog for the current user from EthStorage.
   * 2. Using the memory retriever service to obtain relevant memory IDs based on the input,
   *    session context, and runtime.
   * 3. Iterating over each memory ID:
   *    - For highly sensitive memory (i.e. 'extreme' or 'high'), verifying the requester's authorization
   *      before fetching the content.
   *    - For other memory items, directly fetching the memory content.
   *    - Marking the item with a message if the content is not found or unauthorized.
   * 4. Determining the final status:
   *    - 'partial' if any memory was found unauthorized,
   *    - 'failed' if no memory content was successfully retrieved,
   *    - 'succeeded' otherwise.
   *
   * @param input - The query or input based on which memory should be retrieved.
   * @param requesterId - Identifier for the requester, used to check authorization.
   * @returns A promise that resolves to an object containing the status and memory items.
   */
  async retrieveMemory(input: string, requesterId: string): Promise<RetrieveMemoryResult> {
    // Refresh memory catalog
    const memoryCatalog = await this.memoryEthStorage.getMemoryCatalog(this.sessionContext.userId);

    // Retrieve relevant memory IDs based on input
    const { memory_ids } = await this.memoryRetrieverService.retrieveMemory(
      input,
      memoryCatalog,
      this.sessionContext,
      this.runtime
    );

    const items: Array<{ id: string, content?: string, message?: string }> = [];
    let hasContent = false;
    let hasUnauthorized = false;

    for (const id of memory_ids) {
      const sensitivity = id.split(':').pop() || '';

      // For sensitive memories, check authorization first.
      if (['extreme', 'high'].includes(sensitivity)) {
        const authRecord = await this.memoryAuthService.checkMemoryAuth(id, requesterId);
        if (!authRecord.is_authorized) {
          items.push({ id, message: 'unauthorized' });
          hasUnauthorized = true;
          continue; // Skip fetching if unauthorized
        }
      }

      // Fetch memory content
      const memory = await this.memoryEthStorage.getMemory(id);
      if (memory) {
        items.push({ id, content: memory.content });
        hasContent = true;
      } else {
        items.push({ id, message: 'not-found' });
      }
    }

    // Determine final status:
    // - 'partial' if any unauthorized access occurred,
    // - 'failed' if no memory content was found,
    // - 'succeeded' otherwise.
    let status: 'succeeded' | 'partial' | 'failed' = 'succeeded';
    if (hasUnauthorized) status = 'partial';
    if (!hasContent) status = 'failed';

    return { status, items };
  }

  /**
   * Authorizes access to a specific memory record for a requester.
   *
   * This method performs two main actions:
   * 1. It constructs an EIP-712 compliant signature that serves as authorization for the requester.
   * 2. It uses the generated signature to grant on-chain access to the memory record.
   *
   * Optionally, users could also directly authorize on-chain using their own signature.
   *
   * @param memoryId - The unique identifier for the memory record.
   * @param requesterId - The address of the requester who seeks memory access.
   * @returns A promise that resolves to an authorization result indicating if access is granted.
   */
  async authorizeMemory(memoryId: string, requesterId: string, signature?: string) :Promise<AuthorizeMemoryResult> {
    let signature_input = signature || await this.memoryAuthService.constructGrantMemoryEIP712Signature(memoryId, requesterId);
    return await this.memoryAuthService.grantMemoryAccess(memoryId, requesterId, signature_input);
  }

}

const MemoryKeeperPipelineProvider = {
  provide: MemoryKeeperPipeline,
  useClass: DefaultMemoryKeeperPipeline,
};

export default MemoryKeeperPipelineProvider;
