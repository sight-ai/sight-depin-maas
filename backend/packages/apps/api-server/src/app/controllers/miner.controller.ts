import { Body, Controller, Get, Inject, Logger, Post, Query } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class HistoryQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
  })
) {}

@Controller('/api/v1/miner')
export class MinerController {
  private readonly logger = new Logger(MinerController.name);
  constructor(
    @Inject(MinerService) private readonly minerService: MinerService
  ) {}

  @Get('/summary')
  async getSummary() {
    return this.minerService.getSummary();
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: any) {
  }

  @Get('/history')
  async getHistory(@Query() query: HistoryQueryDto) {
    return this.minerService.getTaskHistory(query.page, query.limit);
  }
}
