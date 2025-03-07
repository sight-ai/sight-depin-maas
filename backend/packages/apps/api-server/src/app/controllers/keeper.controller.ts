import { Body, Controller, Inject, Logger, Post } from '@nestjs/common';
import {
  MemoryKeeperPipeline,
} from "@saito/keeper";
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class ExtractMemoryInput extends createZodDto(
  z.object({
    input: z.string(),
  }),
) {}

export class RetrieveMemoryInput extends createZodDto(
  z.object({
    input: z.string(),
    requester: z.string()
  }),
) {}

export class AuthorizeMemoryInput extends createZodDto(
  z.object({
    memory_id: z.string(),
    requester: z.string(),
    signature: z.string().optional()
  })
) {}

@Controller('/api/v1/keeper')
export class KeeperController {
  private readonly logger = new Logger(KeeperController.name);
  constructor(
    @Inject(MemoryKeeperPipeline)
    private readonly memoryKeeperPipeline: MemoryKeeperPipeline
  ) {}

  @Post('/extract')
  async extractMemory(@Body() tx: ExtractMemoryInput) {
    this.logger.log(`memorize: ${tx.input}`);
    const resolveMemoryResult = await this.memoryKeeperPipeline.extractMemory(
      tx.input,
    );
    return { resolveMemoryResult };
  }

  @Post('/retrieve')
  async retrieveMemory(@Body() args: RetrieveMemoryInput) {
    this.logger.log(`memorize: ${args.input}`);
    const resolveMemoryResult = await this.memoryKeeperPipeline.retrieveMemory(
      args.input,
      args.requester
    );
    return { resolveMemoryResult };
  }

  @Post('/authorize')
  async authorizeMemory(@Body() args: AuthorizeMemoryInput) {
    this.logger.log(`memorize: ${args.memory_id}`);
    const resolveMemoryResult = await this.memoryKeeperPipeline.authorizeMemory(
      args.memory_id,
      args.requester,
      args.signature
    );
    return { resolveMemoryResult };
  }
}
