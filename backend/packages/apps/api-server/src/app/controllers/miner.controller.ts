import { Body, Controller, Get, Inject, Logger, Post, Query } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class SummaryQueryDto extends createZodDto(
  z.object({
    page: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().refine((num) => !isNaN(num), {
        message: 'page must be a valid number',
      }),
    ),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().refine((num) => !isNaN(num), {
        message: 'limit must be a valid number',
      }),
    ),
  }),
) {}


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

  @Get('/history')
  async getHistroy(@Query() query: SummaryQueryDto) {
    return this.minerService.getTaskHistory(query.page, query.limit);
  }

}
