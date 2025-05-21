import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";

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

}
