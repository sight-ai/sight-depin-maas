import { Inject, Logger } from '@nestjs/common';
import { m } from '@saito/models';
import { EthStorageService } from "@saito/ethstorage";
import { Memory, MemoryMetadata } from "@saito/models";
import _ from 'lodash';

export class MemoryEthStorage {
  private readonly logger = new Logger(MemoryEthStorage.name);

  constructor(
    @Inject(EthStorageService)
    private readonly ethStorageService: EthStorageService,
  ) {}

  /**
   * Retrieves the memory catalog for a given user.
   *
   * This function reads the catalog data from EthStorage using a key derived from the user ID.
   * It decodes the stored bytes into a UTF-8 string, parses it as JSON, and validates it against
   * the 'memory_metadata_collection' schema. In case no data is found or an error occurs, it returns an empty array.
   *
   * @param userId - The identifier of the user whose memory catalog is being retrieved.
   * @returns A promise that resolves to an array of MemoryMetadata objects.
   */
  async getMemoryCatalog(userId: string): Promise<MemoryMetadata[]> {
    try{
      const data = await this.ethStorageService.read(`${userId}:memory`);
      if(data.length == 0) {
        return [];
      } else {
        return m.memory('memory_metadata_collection').parse(JSON.parse(new TextDecoder('utf-8').decode(data)));
      }
    } catch (e) {
      this.logger.warn(e);
      return []
    }
  }

  /**
   * Updates the memory catalog for a given user.
   *
   * Before updating, the function validates the provided catalog against the expected schema.
   * It then converts the catalog to a JSON string, encodes it into a Uint8Array, and writes it to EthStorage.
   *
   * @param userId - The identifier of the user whose memory catalog is being updated.
   * @param catalog - An array of MemoryMetadata objects representing the updated catalog.
   * @returns A promise that resolves when the update operation is complete.
   */
  async updateMemoryCatalog(userId: string, catalog: MemoryMetadata[]): Promise<void> {
    m.memory('memory_metadata_collection').parse(catalog);
    const data = new TextEncoder().encode(JSON.stringify(catalog));
    await this.ethStorageService.write(`${userId}:memory`, data);
  }

  /**
   * Creates a new memory record and updates the user's memory catalog accordingly.
   *
   * The function first retrieves the current memory catalog for the user. It then checks whether
   * the memory metadata (owner, category, name, sensitivity) already exists in the catalog.
   * If not, it adds the new metadata to the catalog and updates the storage.
   * Afterward, it validates and encodes the complete memory record (including content) before
   * writing it to EthStorage under a key that uniquely identifies the memory.
   *
   * @param userId - The identifier of the user creating the memory.
   * @param category - The category of the memory.
   * @param name - The name of the memory.
   * @param content - The content of the memory.
   * @param sensitivity - The sensitivity level of the memory.
   * @returns A promise that resolves to the created Memory object.
   */
  async createMemory(userId: string, category: string, name: string, content: string, sensitivity: string): Promise<Memory> {
    // update catalog
    const memoryCatalog = await this.getMemoryCatalog(userId);
    const memoryMetadata = { owner: userId, category, name, sensitivity};
    const exists = _.some(memoryCatalog, memoryMetadata);
    if(!exists) {
      memoryCatalog.push(memoryMetadata);
      this.logger.log(`Updating memory catalog: ${JSON.stringify(memoryCatalog)}`)
      await this.updateMemoryCatalog(userId, memoryCatalog)
    }

    // update memory
    const memoryKey = `${userId}:memory:${category}:${name}:${sensitivity}`;
    const memory: Memory = m.memory('memory').parse({owner: userId, category, name, sensitivity, content});
    const data = new TextEncoder().encode(JSON.stringify(memory));
    await this.ethStorageService.write(memoryKey, data);
    return memory;
  }

  /**
   * Retrieves a memory record using its unique memory ID.
   *
   * This function reads the stored memory data from EthStorage, decodes it from a Uint8Array
   * into a UTF-8 string, and then parses the JSON string into a Memory object.
   *
   * @param memoryId - The unique identifier of the memory record.
   * @returns A promise that resolves to the Memory object.
   */
  async getMemory(memoryId: string): Promise<Memory> {
    const data = await this.ethStorageService.read(memoryId);
    return JSON.parse(new TextDecoder().decode(data));
  }

}
