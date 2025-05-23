import {
  TTask,
  TSummary,
  TCreateTaskRequest,
  TConnectTaskListRequest,
  TConnectTaskListResponse,
  TEarning,
  Earning,
  TMinerEarning,
  MinerEarning,
  ModelOfMiner
} from "@saito/models";
import { MinerService } from "./miner.interface";
import { MinerRepository } from "./miner.repository";
import { Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceStatusService } from "@saito/device-status";
import * as R from 'ramda';
import got from "got-cjs";
import crypto from 'crypto';

// Constants
const MAX_DB_RETRIES = 3;
const BASE_RETRY_DELAY = 500;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Utility functions
const getMonthIndex = R.pipe(
  R.prop('month'),
  R.when(
    R.is(String),
    R.flip(R.indexOf)(MONTHS)
  ),
  R.add(1)
);

const formatNumber = R.pipe(
  R.defaultTo(0),
  Number,
  (n: number) => n.toFixed(2),
  Number
);

const safeArrayMap = R.curry((fn: (x: any) => any, arr: any[]): number[] =>
  Array.isArray(arr) ? R.map(fn, arr).map(Number) : []
);

type ApiResponse = {
  code: number;
  message: string;
  data: {
    data: any[];
    total: number;
  };
  success: boolean;
};

export class DefaultMinerService implements MinerService {
  private readonly logger = new Logger(DefaultMinerService.name);

  constructor(
    @Inject(MinerRepository) private readonly repository: MinerRepository,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
  ) {

  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_DB_RETRIES,
    operationName: string = 'database operation'
  ): Promise<T> {
    const retryWithDelay = async (attempt: number): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        if (attempt >= maxRetries) {
          this.logger.error(`${operationName} failed after ${maxRetries} attempts: ${error}`);
          throw error;
        }
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);

        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithDelay(attempt + 1);
      }
    };
    return retryWithDelay(0);
  }

  async createTask(args: ModelOfMiner<'CreateTaskRequest'>): Promise<ModelOfMiner<'Task'>> {


    return this.withRetry(async () => {
      return this.repository.transaction(async db => {
        const deviceId = R.pathOr(
          await this.deviceStatusService.getDeviceId(),
          ['device_id'],
          args
        );
        return this.repository.createTask(db, args.model, deviceId);
      });
    }, MAX_DB_RETRIES, 'create task');
  }

  async getSummary(timeRange?: {
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: {
      year?: string;
      month?: string;
      view?: 'Month' | 'Year'
    }
  }): Promise<ModelOfMiner<'Summary'>> {


    return this.withRetry(async () => {
      return this.repository.transaction(async db => {
        const deviceId = await this.deviceStatusService.getDeviceId();
        const isRegistered = await this.deviceStatusService.isRegistered();

        const requestTimeRange = R.pathOr('daily', ['request_serials'], timeRange);
        const filteredTaskActivity = R.pathOr({}, ['filteredTaskActivity'], timeRange);

        const year = parseInt(R.propOr(new Date().getFullYear().toString(), 'year', filteredTaskActivity));
        const month = getMonthIndex(filteredTaskActivity);
        const view = R.propOr('Month', 'view', filteredTaskActivity);

        const [
          earningData,
          deviceData,
          uptimeData,
          earningsHistory,
          dailyRequests,
          taskActivity
        ] = await Promise.all([
          this.repository.getEarningInfo(db, deviceId, isRegistered).catch(R.always(null)),
          this.repository.getDeviceInfo(db, deviceId, isRegistered).catch(R.always(null)),
          this.repository.getUptimePercentage(db, deviceId, isRegistered).catch(R.always(null)),
          this.repository.getEarningsHistory(db, deviceId, 30, isRegistered).catch(R.always([])),
          this.repository.getTaskRequestData(db, deviceId, requestTimeRange, isRegistered).catch(R.always([])),
          view === 'Year'
            ? this.repository.getMonthlyTaskActivity(db, year, deviceId, isRegistered).catch(R.always([]))
            : this.repository.getDailyTaskActivity(db, month, deviceId, isRegistered).catch(R.always([]))
        ]);

        const earningSerials = safeArrayMap(R.pipe(R.prop('daily_earning'), formatNumber), [...earningsHistory]);
        const requestSerials = safeArrayMap(R.pipe(R.prop('request_count'), formatNumber), [...dailyRequests]);
        const taskActivityData = safeArrayMap(R.pipe(R.prop('task_count'), formatNumber), [...taskActivity]);

        return {
          earning_info: earningData || { total_block_rewards: 0, total_job_rewards: 0 },
          device_info: {
            name: R.pathOr('Unknown Device', ['name'], deviceData),
            status: R.pathOr('disconnected', ['status'], deviceData) as 'connected' | 'disconnected'
          },
          statistics: {
            up_time_percentage: R.pathOr(0, ['uptime_percentage'], uptimeData),
            earning_serials: earningSerials,
            request_serials: requestSerials,
            task_activity: taskActivityData
          }
        };
      });
    }, MAX_DB_RETRIES, 'get summary');
  }

  async getTaskHistory(page: number, limit: number) {


    return this.withRetry(async () => {
      return this.repository.transaction(async db => {
        const deviceId = await this.deviceStatusService.getDeviceId();
        const isRegistered = await this.deviceStatusService.isRegistered();
        const { count, tasks } = await this.repository.getTasks(db, page, limit, deviceId, isRegistered);

        return { page, limit, total: count, tasks };
      });
    }, MAX_DB_RETRIES, 'get task history');
  }

  async updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>> {


    return this.withRetry(async () => {
      return this.repository.transaction(async db => {
        const updateFields = R.pipe(
          R.pick(['status', 'total_duration', 'load_duration', 'prompt_eval_count', 'prompt_eval_duration', 'eval_count', 'eval_duration']),
          R.toPairs,
          R.reject(([_, value]) => R.isNil(value)),
          R.map(([key, value]) => `${String(key)} = ${typeof value === 'string' ? `'${value}'` : value}`),
          R.join(', ')
        )(updates);

        const task = R.isEmpty(updateFields)
          ? await this.repository.getTaskById(db, id)
          : await this.repository.updateTaskWithSql(db, id, updateFields);

        if (!task) {
          throw new Error(`Task ${id} not found`);
        }

        return task;
      });
    }, MAX_DB_RETRIES, `update task ${id}`);
  }

  async createEarnings(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): Promise<{ total_block_rewards: number; total_job_rewards: number }> {


    return this.withRetry(async () => {
      return this.repository.transaction(async db => {
        // 使用 repository 的 createEarning 方法创建收益记录
        await this.repository.createEarning(db, blockRewards, jobRewards, deviceId, taskId);

        // 获取设备的总收益
        const isRegistered = await this.deviceStatusService.isRegistered();
        const earningInfo = await this.repository.getEarningInfo(db, deviceId, isRegistered);

        return {
          total_block_rewards: earningInfo.total_block_rewards,
          total_job_rewards: earningInfo.total_job_rewards
        };
      });
    }, MAX_DB_RETRIES, `create earnings for task ${taskId}`);
  }

  async getDeviceTasks(deviceId: string): Promise<ModelOfMiner<'Task'>[]> {


    return this.withRetry(async () => {
      const isRegistered = await this.deviceStatusService.isRegistered();
      return this.repository.transaction(async db =>
        this.repository.getTasksByDeviceId(db, deviceId, isRegistered)
      );
    }, MAX_DB_RETRIES, `get device tasks for ${deviceId}`);
  }

  async getDeviceEarnings(deviceId: string): Promise<ModelOfMiner<'Earning'>[]> {


    return this.withRetry(async () => {
      const isRegistered = await this.deviceStatusService.isRegistered();
      return this.repository.transaction(async db =>
        this.repository.getEarningsByDeviceId(db, deviceId, isRegistered)
      );
    }, MAX_DB_RETRIES, `get device earnings for ${deviceId}`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleStaleInProgressTasks() {
    await this.withRetry(async () => {
      return this.repository.transaction(async db => {
        const tasks = await this.repository.getTasksByDeviceId(db, await this.deviceStatusService.getDeviceId(), false);
        const staleTasks = tasks.filter(task =>
          task.status === 'running' &&
          new Date().getTime() - new Date(task.created_at).getTime() > 5 * 60 * 1000
        );

        for (const task of staleTasks) {
          await this.updateTask(task.id, { status: 'failed' });
        }

        if (staleTasks.length > 0) {
          this.logger.log(`Updated ${staleTasks.length} stale tasks to failed status`);
        }
      });
    }, MAX_DB_RETRIES, 'update stale tasks').catch(error => {
      this.logger.error('Failed to update stale tasks', error);
    });
  }

  async connectTaskList(body: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>> {
    const buildQueryString = R.pipe(
      R.pick(['page', 'limit']),
      R.assoc('status', 'connected'),
      R.toPairs,
      R.map(([key, value]) => `${String(key)}=${value}`),
      R.join('&')
    );

    try {
      const queryString = buildQueryString(body);
      const response = await got.get(`${body.gateway_address}/node/connect-task-list?${queryString}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${body.key}`
        },
      }).json() as ApiResponse;

      if (response.code === 200 && response.success) {
        return {
          success: true,
          data: response.data
        };
      }

      return {
        success: false,
        error: response.message || 'Failed to fetch connect task list'
      };
    } catch (error) {
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
};

export default MinerServiceProvider;
