import { Body, Controller, Get, Inject, Logger, Post } from "@nestjs/common";
import {
  MemoryKeeperPipeline,
} from "@saito/keeper";
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

@Controller('/api/v1/mining')
export class MiningController {
  private readonly logger = new Logger(MiningController.name);
  constructor(
  ) {}

  @Get('/')
  async getSummary(@Body() tx: any) {
    this.logger.log(`generate response: ${tx.prompt}`);
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: any) {
  }

}
