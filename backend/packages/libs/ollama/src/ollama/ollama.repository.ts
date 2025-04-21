import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { m } from "@saito/models";
import * as R from 'ramda';

/**
 * OllamaRepository handles database operations for chat records
 */
export class OllamaRepository {
  private readonly logger = new Logger(OllamaRepository.name);

  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { 
    this.logger.log('OllamaRepository initialized');
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

  /**
   * Validate that required fields exist in data object
   */
  validateRequiredFields(data: any, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        this.logger.warn(`Missing required field: ${field}`);
        return false;
      }
    }
    return true;
  }
}
