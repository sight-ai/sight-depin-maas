import { Body, Controller, Get, Inject, Logger, Post, Query } from "@nestjs/common";
import { MinerService } from "@saito/miner";
import { DeviceStatusService } from "@saito/device-status";
import { TaskSyncService, TASK_SYNC_SERVICE } from "@saito/task-sync";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const HistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10)
});

const DeviceStatusSchema = z.object({
  deviceId: z.string()
});

const SummaryQuerySchema = z.object({
  timeRange: z.string()
    .transform((val) => {
      try {
        return JSON.parse(val);
      } catch (e) {
        return { request_serials: 'daily', filteredTaskActivity: {} };
      }
    })
    .pipe(
      z.object({
        request_serials: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
        filteredTaskActivity: z.object({
          year: z.string().optional(),
          month: z.string().optional(),
          view: z.enum(['Month', 'Year']).optional()
        }).optional().default({})
      })
    )
    .default('{"request_serials":"daily","filteredTaskActivity":{}}')
});

const ConnectTaskListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.string().optional()
});

export class HistoryQueryDto extends createZodDto(HistoryQuerySchema) {}
export class DeviceStatusDto extends createZodDto(DeviceStatusSchema) {}
export class SummaryQueryDto extends createZodDto(SummaryQuerySchema) {}
export class ConnectTaskListQueryDto extends createZodDto(ConnectTaskListQuerySchema) {}

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
    
    try {
      return await this.minerService.getSummary(query.timeRange);
    } catch (error) {
      this.logger.error(`Error getting summary: ${error}`);
      throw error;
    }
  }

  @Get('/history')
  async getHistory(@Query() query: HistoryQueryDto) {
    try {
      return await this.minerService.getTaskHistory(query.page, query.limit);
    } catch (error) {
      this.logger.error(`Error getting task history: ${error}`);
      throw error;
    }
  }
  
  @Get('deviceStatus')
  async getDeviceStatus(@Query() args: DeviceStatusDto) {
    try {
      return await this.deviceStatusService.getDeviceStatus(args.deviceId);
    } catch (error) {
      this.logger.error(`Error getting device status: ${error}`);
      throw error;
    }
  }

  @Get('deviceList')
  async getDeviceList() {
    try {
      return await this.deviceStatusService.getDeviceList();
    } catch (error) {
      this.logger.error(`Error getting device list: ${error}`);
      throw error;
    }
  }

  @Get('currentDevice')
  async getCurrentDevice() {
    try {
      return await this.deviceStatusService.getCurrentDevice();
    } catch (error) {
      this.logger.error(`Error getting current device: ${error}`);
      throw error;
    }
  }

  @Get('/connect-task-list')
  async getConnectTaskList(@Query() query: ConnectTaskListQueryDto) {
    const handleError = (error: unknown) => ({
      code: 500,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      data: { data: [], total: 0 },
      success: false
    });

    const buildErrorResponse = (code: number, message: string) => ({
      code,
      message,
      data: { data: [], total: 0 },
      success: false
    });

    const buildSuccessResponse = (data: unknown) => ({
      code: 200,
      message: 'success',
      data,
      success: true
    });

    try {
      const deviceStatus = await this.deviceStatusService.getCurrentDevice();
      if (!deviceStatus) {
        return buildErrorResponse(400, 'Device not found');
      }

      const gatewayAddress = await this.deviceStatusService.getGatewayAddress();
      const key = await this.deviceStatusService.getKey();

      if (!gatewayAddress || !key) {
        return buildErrorResponse(400, 'Device not properly configured');
      }

      const result = await this.minerService.connectTaskList({
        gateway_address: gatewayAddress,
        key,
        page: query.page,
        limit: query.limit
      });

      if (result.success && result.data) {
        return buildSuccessResponse(result.data);
      } else {
        return buildErrorResponse(500, result.error || 'Failed to fetch connect task list');
      }
    } catch (error) {
      return handleError(error);
    }
  }
}
