import { Body, Controller, Get, Inject, Logger, Post, Query, Res } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { DeviceStatusService } from "@saito/device-status";
import { TaskSyncService, TASK_SYNC_SERVICE } from "@saito/task-sync";
import { OllamaService } from "@saito/ollama";
import { Response } from 'express';

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
    @Inject(OllamaService) private readonly ollamaService: OllamaService,
  ) {}

  @Get('/summary')
  async getSummary(@Query() query: SummaryQueryDto = { timeRange: { request_serials: 'daily', filteredTaskActivity: {} } }) {
    this.logger.log(`Getting summary with timeRange: ${JSON.stringify(query.timeRange)}`);
    try {
      return await this.minerService.getSummary(query.timeRange);
    } catch (error) {
      this.logger.error(`Error getting summary: ${error}`);
      throw error; // NestJS will convert this to a 500 response
    }
  }

  @Post('/chat')
  async generateChatResponse(@Body() args: any, @Res() res: Response) {
    try {
      await this.ollamaService.chat(args, res);
    } catch (error) {
      this.logger.error('Error during chat response in miner controller:', error);
      if (!res.headersSent) {
        // Using 400 status code for errors
        res.status(400).json({ 
          error: 'Error during chat response',
          details: error instanceof Error ? error.message : 'Unknown error',
          model: args.model || 'unknown',
          created_at: new Date().toISOString(),
          done: true
        });
      }
    }
  }

  @Get('/history')
  async getHistory(@Query() query: HistoryQueryDto) {
    try {
      return await this.minerService.getTaskHistory(query.page, query.limit);
    } catch (error) {
      this.logger.error(`Error getting task history: ${error}`);
      throw error; // NestJS will convert this to a 500 response
    }
  }
  
  @Get('deviceStatus')
  async getDeviceStatus(@Query() args: QueryDeviceStatusDto) {
    try {
      return await this.deviceStatusService.getDeviceStatus(args.deviceId);
    } catch (error) {
      this.logger.error(`Error getting device status: ${error}`);
      throw error; // NestJS will convert this to a 500 response
    }
  }

  @Get('deviceList')
  async getDeviceList() {
    try {
      return await this.deviceStatusService.getDeviceList();
    } catch (error) {
      this.logger.error(`Error getting device list: ${error}`);
      throw error; // NestJS will convert this to a 500 response
    }
  }

  @Get('currentDevice')
  async getCurrentDevice() {
    try {
      return await this.deviceStatusService.getCurrentDevice();
    } catch (error) {
      this.logger.error(`Error getting current device: ${error}`);
      throw error; // NestJS will convert this to a 500 response
    }
  }
}
