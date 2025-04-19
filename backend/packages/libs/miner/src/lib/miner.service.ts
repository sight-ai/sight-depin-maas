import { DeviceInfo, EarningInfo, Statistics, Task, Summary, CreateTaskRequest } from "@saito/models";
import { MinerService } from "./miner.interface";
import { MinerRepository } from "./miner.repository";
import { Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceStatusService } from "@saito/device-status";
import * as R from 'ramda';
import got from "got-cjs";

// Define request time range types
type RequestTimeRange = 'daily' | 'weekly' | 'monthly';
type ViewType = 'Month' | 'Year';

// Maximum number of retries for database operations
const MAX_DB_RETRIES = 3;
// Delay between retries in milliseconds (exponential backoff)
const BASE_RETRY_DELAY = 500;

export class DefaultMinerService implements MinerService {
  private readonly logger = new Logger(DefaultMinerService.name);
  private readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
  ) {
    this.logger.log('MinerService initialized');
  }

  /**
   * Helper method to retry database operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_DB_RETRIES,
    operationName: string = 'database operation'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // Calculate delay with exponential backoff
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
          this.logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${error}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    this.logger.error(`${operationName} failed after ${maxRetries} attempts: ${lastError}`);
    throw lastError;
  }

  /**
   * Create a new task
   */
  async createTask(args: CreateTaskRequest): Promise<Task> {
    this.logger.log(`Creating task for model: ${args.model}`);
    
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        // Use current device ID (if not provided in args)
        const deviceId = args.device_id || await this.deviceStatusService.getDeviceId();
        
        // Create task
        const task = await this.repository.createTask(conn, args.model, deviceId);
        
        this.logger.log(`Created new task with ID ${task.id} for model ${task.model}`);
        return task;
      });
    }, MAX_DB_RETRIES, 'create task');
  }

  /**
   * Get summary information
   */
  async getSummary(timeRange?: { 
    request_serials?: RequestTimeRange,
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: ViewType 
    }
  }): Promise<Summary> {
    this.logger.log(`Getting summary with timeRange: ${JSON.stringify(timeRange || {})}`);
    
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        const deviceId = await this.deviceStatusService.getDeviceId();
        const isRegistered = await this.deviceStatusService.isRegistered();
        // Generate query parameters
        const requestTimeRange = R.propOr('daily', 'request_serials', timeRange || {}) as RequestTimeRange;
        
        // Task activity filters
        const filteredTaskActivity = timeRange?.filteredTaskActivity || {};
        const year = parseInt(R.propOr(new Date().getFullYear().toString(), 'year', filteredTaskActivity));
        const monthName = R.propOr(null, 'month', filteredTaskActivity) as string | null;
        const month = monthName ? this.months.indexOf(monthName) + 1 : null;
        const view = R.propOr('Month', 'view', filteredTaskActivity) as ViewType;
        
        // Date range parameters
        let startDate = '', endDate = '';
        if (month && month > 0) {
          const daysInMonth = new Date(year, month, 0).getDate();
          startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
          endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`;
        } else {
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
        }
        
        try {
          // Query all data in parallel
          const [earningData, deviceData, uptimeData, earningsHistory, dailyRequests, taskActivity] = await Promise.all([
            this.repository.getEarningInfo(conn, deviceId, isRegistered).catch(err => {
              this.logger.warn(`Failed to get earning info: ${err}`);
              return null;
            }),
            this.repository.getDeviceInfo(conn, deviceId, isRegistered).catch(err => {
              this.logger.warn(`Failed to get device info: ${err}`);
              return null;
            }),
            this.repository.getUptimePercentage(conn, deviceId, isRegistered).catch(err => {
              this.logger.warn(`Failed to get uptime percentage: ${err}`);
              return null;
            }),
            this.repository.getEarningsHistory(conn, deviceId,30, isRegistered).catch(err => {
              this.logger.warn(`Failed to get earnings history: ${err}`);
              return [];
            }),
            this.repository.getTaskRequestData(conn, deviceId, requestTimeRange, isRegistered).catch(err => {
              this.logger.warn(`Failed to get task request data: ${err}`);
              return [];
            }),
            view === 'Year' 
              ? this.repository.getMonthlyTaskActivity(conn, year, deviceId, isRegistered).catch(err => {
                  this.logger.warn(`Failed to get monthly task activity: ${err}`);
                  return [];
                })
              : this.repository.getDailyTaskActivity(conn,month, deviceId, isRegistered).catch(err => {
                  this.logger.warn(`Failed to get daily task activity: ${err}`);
                  return [];
                })
          ]);
          
          // Extract needed data, ensure each collection is safe
          const earningSerials = earningsHistory ? earningsHistory.map(item => Number(item.daily_earning)) : [];
          const requestSerials = dailyRequests ? dailyRequests.map(item => Number(item.request_count)) : [];
          const taskActivityCounts = taskActivity ? taskActivity.map(item => Number(item.task_count)) : [];
          
          // Build and return summary
          return {
            earning_info: earningData || { total_block_rewards: 0, total_job_rewards: 0 },
            device_info: {
              name: deviceData?.name || 'Unknown Device',
              status: (deviceData?.status as 'connected' | 'disconnected') || 'disconnected'
            },
            statistics: {
              up_time_percentage: uptimeData?.uptime_percentage || 0,
              earning_serials: earningSerials,
              request_serials: requestSerials,
              task_activity: taskActivityCounts
            }
          };
        } catch (error) {
          this.logger.error('Error fetching summary data', error);
          // Return a default summary object rather than throwing
          return {
            earning_info: { total_block_rewards: 0, total_job_rewards: 0 },
            device_info: {
              name: 'Unknown Device',
              status: 'disconnected'
            },
            statistics: {
              up_time_percentage: 0,
              earning_serials: [],
              request_serials: [],
              task_activity: []
            }
          };
        }
      });
    }, MAX_DB_RETRIES, 'get summary');
  }

  /**
   * Get task history
   */
  async getTaskHistory(page: number, limit: number) {
    this.logger.log(`Getting task history, page: ${page}, limit: ${limit}`);
    
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        try {
          const deviceId = await this.deviceStatusService.getDeviceId();
          const isRegistered = await this.deviceStatusService.isRegistered();
          const { count, tasks } = await this.repository.getTasks(conn, page, limit, deviceId, isRegistered);
          
          return {
            page,
            limit,
            total: count,
            tasks
          };
        } catch (error) {
          this.logger.error(`Failed to get task history: ${error}`);
          return {
            page,
            limit,
            total: 0,
            tasks: []
          };
        }
      });
    }, MAX_DB_RETRIES, 'get task history');
  }

  /**
   * Update task status
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    this.logger.log(`Updating task ${id} with status: ${updates.status || 'unchanged'}`);
    
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        // Build update fields
        const updateFields = R.pipe(
          R.pick(['status', 'total_duration', 'load_duration', 'prompt_eval_count', 'prompt_eval_duration', 'eval_count', 'eval_duration']),
          R.toPairs,
          R.filter(([_, value]) => value !== undefined),
          R.map(([key, value]) => {
            // Ensure key is a string
            const safeKey = String(key);
            const valueStr = typeof value === 'string' ? `'${value}'` : value;
            return `${safeKey} = ${valueStr}`;
          }),
          R.join(', ')
        )(updates);
        
        // If no fields to update, return current task
        if (R.isEmpty(updateFields)) {
          return this.repository.getTaskById(conn, id);
        }
        
        // Execute update
        const task = await this.repository.updateTaskWithSql(conn, id, updateFields);
        this.logger.log(`Updated task ${id} with status: ${updates.status || 'unchanged'}`);
        return task;
      });
    }, MAX_DB_RETRIES, `update task ${id}`);
  }

  /**
   * Create earnings record
   */
  async createEarnings(blockRewards: number, jobRewards: number, taskId: string, device_id: string) {
    this.logger.log(`Creating earnings: block=${blockRewards}, job=${jobRewards} for task ${taskId}`);
    
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        try {
          // Use current device ID (if not provided in args)
          const deviceId = device_id || await this.deviceStatusService.getDeviceId();
          return this.repository.createEarnings(conn, blockRewards, jobRewards, deviceId, taskId);
        } catch (error) {
          this.logger.error(`Failed to create earnings for task ${taskId}:`, error);
          throw error;
        }
      });
    }, MAX_DB_RETRIES, `create earnings for task ${taskId}`);
  }

  /**
   * Get specific device tasks
   */
  async getDeviceTasks(deviceId: string, limit: number = 10): Promise<Task[]> {
    this.logger.log(`Getting tasks for device ${deviceId}, limit: ${limit}`);
    const isRegistered = await this.deviceStatusService.isRegistered();
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        try {
          return this.repository.getTasksByDeviceId(conn, deviceId, limit, isRegistered);
        } catch (error) {
          this.logger.error(`Failed to get tasks for device ${deviceId}:`, error);
          return [];
        }
      });
    }, MAX_DB_RETRIES, `get device tasks for ${deviceId}`);
  }

  /**
   * Get specific device earnings
   */
  async getDeviceEarnings(deviceId: string, limit: number = 10) {
    this.logger.log(`Getting earnings for device ${deviceId}, limit: ${limit}`);
    const isRegistered = await this.deviceStatusService.isRegistered();
    return this.withRetry(async () => {
      return this.repository.transaction(async conn => {
        try {
          return this.repository.getEarningsByDeviceId(conn, deviceId, limit, isRegistered);
        } catch (error) {
          this.logger.error(`Failed to get earnings for device ${deviceId}:`, error);
          return [];
        }
      });
    }, MAX_DB_RETRIES, `get device earnings for ${deviceId}`);
  }

  /**
   * Scheduled task: Handle stale in-progress tasks
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleStaleInProgressTasks() {
    try {
      const updatedTasks = await this.withRetry(async () => {
        return this.repository.transaction(async conn => {
          return this.repository.updateStaleInProgressTasks(conn, 5);
        });
      }, MAX_DB_RETRIES, 'update stale tasks');
      
      const tasksCount = updatedTasks.length;
      if (tasksCount > 0) {
        this.logger.log(`Updated ${tasksCount} stale in-progress tasks to failed status`);
      }
    } catch (error) {
      this.logger.error('Failed to update stale tasks', error);
    }
  }

  async connectTaskList(body: {
    gateway_address: string;
    key: string;
    page: number;
    limit: number;
  }): Promise<{
    success: boolean;
    error?: string;
    data?: {
      data: any[];
      total: number;
    };
  }> {
      try {
          const queryString = new URLSearchParams({
              page: body.page.toString(),
              limit: body.limit.toString(),
              status: 'connected'
          }).toString();

          const response = await got.get(`${body.gateway_address}/node/connect-task-list?${queryString}`, {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${body.key}`
              },
          }).json() as {
              code: number;
              message: string;
              data: {
                  data: any[];
                  total: number;
              };
              success: boolean;
          };

          if (response.code === 200 && response.success) {
              return {
                  success: true,
                  data: response.data
              };
          } else {
              return {
                  success: false,
                  error: response.message || 'Failed to fetch connect task list'
              };
          }
      } catch (error) {
          this.logger.error('Failed to fetch connect task list:', error);
          return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error occurred'
          };
      }
  }

}

const MinerServiceProvider = {
  provide: MinerService,
  useClass: DefaultMinerService
}

export default MinerServiceProvider;

