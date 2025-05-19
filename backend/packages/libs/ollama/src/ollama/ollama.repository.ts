import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { Database } from "better-sqlite3";

/**
 * OllamaRepository handles database operations for chat records
 */
export class OllamaRepository {
  private readonly logger = new Logger(OllamaRepository.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) {

  }

  /**
   * Create a database transaction
   */
  async transaction<T>(handler: (db: Database) => T): Promise<T> {
    try {
      return this.persistentService.transaction(handler);
    } catch (error: any) {
      this.logger.error(`Database transaction failed: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

}
