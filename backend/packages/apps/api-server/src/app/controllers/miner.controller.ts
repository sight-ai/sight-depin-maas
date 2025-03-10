import { Body, Controller, Get, Inject, Logger, Post } from "@nestjs/common";
import { MinerService } from "@saito/miner";

@Controller('/api/v1/miner')
export class MinerController {
  private readonly logger = new Logger(MinerController.name);
  constructor(
    @Inject(MinerService) private readonly minerService: MinerService
  ) {}

  @Get('/summary')
  async getSummary(@Body() tx: any) {
    return this.minerService.getSummary();
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: any) {
  }

}
