import { Controller, Get, Inject, Logger, Query } from "@nestjs/common";
import { MinerService, TaskAggregationService, EarningsAggregationService } from "@saito/miner";
import { DeviceStatusService } from "@saito/device-status";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const DashboardQuerySchema = z.object({
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

const DateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['today', 'week', 'month', 'all']).default('today')
});

export class DashboardQueryDto extends createZodDto(DashboardQuerySchema) {}
export class DateRangeQueryDto extends createZodDto(DateRangeQuerySchema) {}

@Controller('/api/v1/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);
  
  constructor(
    @Inject(MinerService) private readonly minerService: MinerService,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
    @Inject(TaskAggregationService) private readonly taskAggregationService: TaskAggregationService,
    @Inject(EarningsAggregationService) private readonly earningsAggregationService: EarningsAggregationService,
  ) {}

  @Get('/statistics')
  async getDashboardStatistics(@Query() query: DashboardQueryDto = { timeRange: { request_serials: 'daily', filteredTaskActivity: {} } }) {
    try {
      const deviceId = await this.deviceStatusService.getDeviceId();
      const isRegistered = await this.deviceStatusService.isRegistered();

      // Get task aggregation data
      const taskAggregation = await this.taskAggregationService.getTaskCountAggregation();

      // Get earnings aggregation data
      const earningsAggregation = await this.earningsAggregationService.getEarningsAggregation();

      // Get summary data from miner service for device info
      const summaryData = await this.minerService.getSummary(query.timeRange);

      // Format earnings data
      const todayEarnings = {
        totalBlockRewards: 0, // Will be calculated from earningsAggregation
        totalJobRewards: 0,
        totalEarnings: earningsAggregation.todayEarnings
      };

      const cumulativeEarnings = {
        totalBlockRewards: earningsAggregation.totalBlockRewards,
        totalJobRewards: earningsAggregation.totalJobRewards,
        totalEarnings: earningsAggregation.totalEarnings
      };

      return {
        success: true,
        data: {
          // Task statistics
          totalTasks: taskAggregation.totalTasks,
          todayTasks: taskAggregation.todayTasks,
          weekTasks: taskAggregation.weekTasks,
          monthTasks: taskAggregation.monthTasks,
          taskStatusBreakdown: taskAggregation.statusBreakdown,
          taskSourceBreakdown: taskAggregation.sourceBreakdown,
          taskModelBreakdown: taskAggregation.modelBreakdown,

          // Earnings statistics
          todayEarnings,
          weekEarnings: earningsAggregation.weekEarnings,
          monthEarnings: earningsAggregation.monthEarnings,
          cumulativeEarnings,
          averageEarningsPerDay: earningsAggregation.averageEarningsPerDay,
          earningsHistory: earningsAggregation.earningsHistory,

          // Device and system info
          deviceInfo: summaryData.device_info,
          statistics: summaryData.statistics
        }
      };
    } catch (error) {
      this.logger.error(`Error getting dashboard statistics: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard statistics',
        data: {
          totalTasks: 0,
          todayTasks: 0,
          weekTasks: 0,
          monthTasks: 0,
          taskStatusBreakdown: {},
          taskSourceBreakdown: {},
          taskModelBreakdown: {},
          todayEarnings: { totalBlockRewards: 0, totalJobRewards: 0, totalEarnings: 0 },
          cumulativeEarnings: { totalBlockRewards: 0, totalJobRewards: 0, totalEarnings: 0 }
        }
      };
    }
  }

  @Get('/task-count')
  async getTotalTaskCount(@Query() query: DateRangeQueryDto) {
    try {
      // Use TaskAggregationService for more efficient task counting
      const taskCountData = await this.taskAggregationService.getTaskCountByPeriod(query.period);

      return {
        success: true,
        data: {
          totalCount: taskCountData.count,
          period: taskCountData.period,
          breakdown: taskCountData.breakdown,
          models: taskCountData.models
        }
      };
    } catch (error) {
      this.logger.error(`Error getting task count: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task count',
        data: { totalCount: 0, period: query.period, breakdown: {}, models: {} }
      };
    }
  }

  @Get('/task-activity')
  async getTaskActivity() {
    try {
      const taskActivity = await this.taskAggregationService.getTaskActivitySummary();

      return {
        success: true,
        data: taskActivity
      };
    } catch (error) {
      this.logger.error(`Error getting task activity: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task activity',
        data: {
          totalTasks: 0,
          recentActivity: { last24Hours: 0, last7Days: 0, last30Days: 0 },
          averageTasksPerDay: 0,
          peakDay: { date: '', count: 0 },
          statusDistribution: {}
        }
      };
    }
  }

  @Get('/task-trends')
  async getTaskTrends(@Query('days') days: string = '30') {
    try {
      const daysNum = parseInt(days) || 30;
      const trends = await this.taskAggregationService.getTaskTrends(daysNum);

      return {
        success: true,
        data: {
          days: daysNum,
          trends
        }
      };
    } catch (error) {
      this.logger.error(`Error getting task trends: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task trends',
        data: { days: parseInt(days) || 30, trends: [] }
      };
    }
  }

  @Get('/earnings')
  async getEarnings(@Query() query: DateRangeQueryDto) {
    try {
      // Use EarningsAggregationService for more accurate earnings data
      const earningsData = await this.earningsAggregationService.getEarningsByPeriod(query.period);

      return {
        success: true,
        data: {
          period: earningsData.period,
          totalBlockRewards: earningsData.totalBlockRewards,
          totalJobRewards: earningsData.totalJobRewards,
          totalEarnings: earningsData.totalEarnings,
          count: earningsData.count,
          averagePerTask: earningsData.averagePerTask,
          dailyBreakdown: earningsData.dailyBreakdown,
          breakdown: {
            blockRewards: earningsData.totalBlockRewards,
            jobRewards: earningsData.totalJobRewards
          }
        }
      };
    } catch (error) {
      this.logger.error(`Error getting earnings: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get earnings',
        data: {
          period: query.period,
          totalBlockRewards: 0,
          totalJobRewards: 0,
          totalEarnings: 0,
          count: 0,
          averagePerTask: 0,
          dailyBreakdown: [],
          breakdown: { blockRewards: 0, jobRewards: 0 }
        }
      };
    }
  }

  private async getTodayEarnings(deviceId: string, isRegistered: boolean) {
    try {
      // This is a simplified implementation
      // In a real scenario, you would query earnings with date filtering
      const summaryData = await this.minerService.getSummary({
        request_serials: 'daily',
        filteredTaskActivity: {}
      });
      
      // For now, we'll use a portion of total earnings as "today's" earnings
      // This should be replaced with actual date-filtered earnings query
      const totalBlockRewards = summaryData.earning_info?.total_block_rewards || 0;
      const totalJobRewards = summaryData.earning_info?.total_job_rewards || 0;
      
      // Simplified: assume 10% of total earnings happened today
      // This should be replaced with actual date filtering
      const todayBlockRewards = totalBlockRewards * 0.1;
      const todayJobRewards = totalJobRewards * 0.1;
      
      return {
        totalBlockRewards: Number(todayBlockRewards.toFixed(2)),
        totalJobRewards: Number(todayJobRewards.toFixed(2)),
        totalEarnings: Number((todayBlockRewards + todayJobRewards).toFixed(2))
      };
    } catch (error) {
      this.logger.error(`Error getting today's earnings: ${error}`);
      return {
        totalBlockRewards: 0,
        totalJobRewards: 0,
        totalEarnings: 0
      };
    }
  }
}
