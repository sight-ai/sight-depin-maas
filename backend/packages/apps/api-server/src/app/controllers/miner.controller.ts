import { Body, Controller, Get, Inject, Logger, Post, Query } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { DeviceStatusService } from "@saito/device-status";
import { TaskSyncService, TASK_SYNC_SERVICE } from "@saito/task-sync";

import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class HistoryQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
  })
) {}

export class SendDeviceStatusDto extends createZodDto(
  z.object({
    deviceId: z.string(),
    name: z.string(),
  })
) {}

export class QueryDeviceStatusDto extends createZodDto(
  z.object({
    deviceId: z.string(),
  })
) {}

export class SummaryQueryDto extends createZodDto(
  z.object({
    timeRange: z.string().transform((val) => {
      try {
        return JSON.parse(val);
      } catch (e) {
        return { request_serials: 'daily', filteredTaskActivity: {} };
      }
    }).pipe(
      z.object({
        request_serials: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
        filteredTaskActivity: z.object({
          year: z.string().optional(),
          month: z.string().optional(),
          view: z.enum(['Month', 'Year']).optional()
        }).optional().default({})
      })
    ).default('{"request_serials":"daily","filteredTaskActivity":{}}')
  })
) {}

@Controller('/api/v1/miner')
export class MinerController {
  private readonly logger = new Logger(MinerController.name);
  constructor(
    @Inject(MinerService) private readonly minerService: MinerService,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
    @Inject(TASK_SYNC_SERVICE) private readonly taskSyncService: TaskSyncService,
  ) {}

  @Get('/summary')
  async getSummary(@Query() query: SummaryQueryDto = { timeRange: { request_serials: 'daily', filteredTaskActivity: {} } }) {
    this.logger.log(`Getting summary with timeRange: ${JSON.stringify(query.timeRange)}`);
    return this.minerService.getSummary(query.timeRange);
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: any) {
  }

  @Get('/history')
  async getHistory(@Query() query: HistoryQueryDto) {
    return this.minerService.getTaskHistory(query.page, query.limit);
  }
  
  @Get('deviceStatus')
  async getDeviceStatus(@Query() args:QueryDeviceStatusDto ) {
    return this.deviceStatusService.getDeviceStatus(args.deviceId);
  }

  @Get('deviceList')
  async getDeviceList() {
    return this.deviceStatusService.getDeviceList();
  }

  @Get('currentDevice')
  async getCurrentDevice() {
    return this.deviceStatusService.getCurrentDevice();
  }
}
