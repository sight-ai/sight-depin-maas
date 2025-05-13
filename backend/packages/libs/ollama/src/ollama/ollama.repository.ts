import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";

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
  async transaction<T>(handler: (conn: DatabaseTransactionConnection) => Promise<T>): Promise<T> {
    try {
      return await this.persistentService.pgPool.transaction(handler);
    } catch (error: any) {
      this.logger.error(`Database transaction failed: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

}
