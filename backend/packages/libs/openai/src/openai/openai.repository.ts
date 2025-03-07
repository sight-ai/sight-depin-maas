import { Inject } from '@nestjs/common';
import { PersistentService } from '@saito/persistent';

export class OpenaiRepository {
  constructor(
    @Inject(PersistentService)
    private readonly persistent: PersistentService,
  ) {}
}
