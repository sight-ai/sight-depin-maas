import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ModelOfMiner } from '@saito/models';
import {
  IMinerService,
  ITaskManager,
  IEarningsManager,
  IStatisticsAnalyzer,
  IGatewayConnector,
  TASK_MANAGER,
  EARNINGS_MANAGER,
  STATISTICS_ANALYZER,
  GATEWAY_CONNECTOR,
  MinerConfig,
  MinerError
} from '../abstracts/miner-core.interface';
import {
  TDeviceConfig,
  DEVICE_CONFIG_SERVICE
} from '@saito/device-status';

/**
 * 统一矿工服务实现
 * 组合各个专门的管理器来提供完整的矿工功能
 */
@Injectable()
export class UnifiedMinerService implements IMinerService {
  private readonly logger = new Logger(UnifiedMinerService.name);

  constructor(
    @Inject(TASK_MANAGER)
    private readonly taskManager: ITaskManager,
    
    @Inject(EARNINGS_MANAGER)
    private readonly earningsManager: IEarningsManager,
    
    @Inject(STATISTICS_ANALYZER)
    private readonly statisticsAnalyzer: IStatisticsAnalyzer,
    
    @Inject(GATEWAY_CONNECTOR)
    private readonly gatewayConnector: IGatewayConnector,

    @Inject('MINER_CONFIG')
    private readonly config: MinerConfig,

    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly deviceConfigService: TDeviceConfig
  ) {
    this.logger.log('UnifiedMinerService initialized with modular architecture');
  }

  // =============================================================================
  // 任务管理功能
  // =============================================================================

  async createTask(args: ModelOfMiner<'CreateTaskRequest'>): Promise<ModelOfMiner<'Task'>> {
    try {
      this.logger.debug('Creating task through task manager', { model: args.model });
      return await this.taskManager.createTask(args);
    } catch (error) {
      this.logger.error(`Failed to create task: ${error}`);
      throw new MinerError('Task creation failed', 'TASK_CREATION_ERROR', { args, error });
    }
  }

  async updateTask(id: string, updates: Partial<ModelOfMiner<'Task'>>): Promise<ModelOfMiner<'Task'>> {
    try {
      this.logger.debug(`Updating task ${id} through task manager`);
      return await this.taskManager.updateTask(id, updates);
    } catch (error) {
      this.logger.error(`Failed to update task ${id}: ${error}`);
      throw new MinerError('Task update failed', 'TASK_UPDATE_ERROR', { id, updates, error });
    }
  }

  async getTaskHistory(page: number, limit: number): Promise<{
    page: number;
    limit: number;
    total: number;
    tasks: ModelOfMiner<'Task'>[];
  }> {
    try {
      this.logger.debug(`Getting task history through task manager: page=${page}, limit=${limit}`);
      return await this.taskManager.getTaskHistory(page, limit);
    } catch (error) {
      this.logger.error(`Failed to get task history: ${error}`);
      throw new MinerError('Task history retrieval failed', 'TASK_HISTORY_ERROR', { page, limit, error });
    }
  }

  async getDeviceTasks(deviceId: string, limit?: number): Promise<ModelOfMiner<'Task'>[]> {
    try {
      this.logger.debug(`Getting device tasks through task manager: device=${deviceId}, limit=${limit}`);
      return await this.taskManager.getDeviceTasks(deviceId, limit);
    } catch (error) {
      this.logger.error(`Failed to get device tasks: ${error}`);
      throw new MinerError('Device tasks retrieval failed', 'DEVICE_TASKS_ERROR', { deviceId, limit, error });
    }
  }

  // =============================================================================
  // 收益管理功能
  // =============================================================================

  async createEarnings(
    blockRewards: number,
    jobRewards: number,
    taskId: string,
    deviceId: string
  ): Promise<{
    total_block_rewards: number;
    total_job_rewards: number;
  }> {
    try {
      this.logger.debug(`Creating earnings through earnings manager: block=${blockRewards}, job=${jobRewards}, task=${taskId}`);
      return await this.earningsManager.createEarnings(blockRewards, jobRewards, taskId, deviceId);
    } catch (error) {
      this.logger.error(`Failed to create earnings: ${error}`);
      throw new MinerError('Earnings creation failed', 'EARNINGS_CREATION_ERROR', { 
        blockRewards, 
        jobRewards, 
        taskId, 
        deviceId, 
        error 
      });
    }
  }

  async getDeviceEarnings(deviceId: string, limit?: number): Promise<ModelOfMiner<'Earning'>[]> {
    try {
      this.logger.debug(`Getting device earnings through earnings manager: device=${deviceId}, limit=${limit}`);
      return await this.earningsManager.getDeviceEarnings(deviceId, limit);
    } catch (error) {
      this.logger.error(`Failed to get device earnings: ${error}`);
      throw new MinerError('Device earnings retrieval failed', 'DEVICE_EARNINGS_ERROR', { deviceId, limit, error });
    }
  }

  // =============================================================================
  // 统计分析功能
  // =============================================================================

  async getSummary(timeRange?: {
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: {
      year?: string;
      month?: string;
      view?: 'Month' | 'Year'
    }
  }): Promise<ModelOfMiner<'Summary'>> {
    try {
      this.logger.debug('Getting summary through statistics analyzer', timeRange);
      return await this.statisticsAnalyzer.getSummary(timeRange);
    } catch (error) {
      this.logger.error(`Failed to get summary: ${error}`);
      throw new MinerError('Summary retrieval failed', 'SUMMARY_ERROR', { timeRange, error });
    }
  }

  // =============================================================================
  // 网关连接功能
  // =============================================================================

  async connectTaskList(body: ModelOfMiner<'ConnectTaskListRequest'>): Promise<ModelOfMiner<'ConnectTaskListResponse'>> {
    try {
      this.logger.debug('Connecting to task list through gateway connector', { gateway: body.gateway_address });
      return await this.gatewayConnector.connectTaskList(body);
    } catch (error) {
      this.logger.error(`Failed to connect to task list: ${error}`);
      throw new MinerError('Gateway connection failed', 'GATEWAY_CONNECTION_ERROR', { body, error });
    }
  }

  // =============================================================================
  // 定时任务
  // =============================================================================

  @Cron(CronExpression.EVERY_MINUTE)
  async handleStaleInProgressTasks(): Promise<void> {
    if (!this.config.enableAutoCleanup) {
      return;
    }

    try {
      this.logger.debug('Running stale task cleanup');
      await this.taskManager.handleStaleInProgressTasks();
    } catch (error) {
      this.logger.error(`Stale task cleanup failed: ${error}`);
      // 不抛出错误，因为这是定时任务
    }
  }

  // =============================================================================
  // 扩展功能方法
  // =============================================================================

  /**
   * 获取完整的矿工状态
   */
  async getMinerStatus(): Promise<{
    tasks: {
      total: number;
      running: number;
      completed: number;
      failed: number;
    };
    earnings: {
      totalBlockRewards: number;
      totalJobRewards: number;
      todayEarnings: number;
    };
    performance: {
      uptimePercentage: number;
      averageTaskTime: number;
      successRate: number;
    };
    lastActivity: Date;
  }> {
    try {
      this.logger.debug('Getting comprehensive miner status');

      // 获取当前设备ID
      const deviceId = await this.getCurrentDeviceId();

      // 并行获取各种统计信息
      const [summary, tasks, earnings] = await Promise.all([
        this.getSummary(),
        this.getDeviceTasks(deviceId),
        this.getDeviceEarnings(deviceId)
      ]);

      // 计算任务统计
      const taskStats = {
        total: tasks.length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      };

      // 计算收益统计
      const totalBlockRewards = earnings.reduce((sum, e) => sum + e.block_rewards, 0);
      const totalJobRewards = earnings.reduce((sum, e) => sum + e.job_rewards, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEarnings = earnings
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + e.block_rewards + e.job_rewards, 0);

      // 计算性能指标
      const successRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const averageTaskTime = completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            const start = new Date(t.created_at).getTime();
            const end = new Date(t.updated_at).getTime();
            return sum + (end - start);
          }, 0) / completedTasks.length
        : 0;

      const lastActivity = tasks.length > 0
        ? new Date(Math.max(...tasks.map(t => new Date(t.created_at).getTime())))
        : new Date();

      const status = {
        tasks: taskStats,
        earnings: {
          totalBlockRewards,
          totalJobRewards,
          todayEarnings
        },
        performance: {
          uptimePercentage: summary.statistics.up_time_percentage,
          averageTaskTime: Math.round(averageTaskTime),
          successRate: Math.round(successRate * 100) / 100
        },
        lastActivity
      };

      this.logger.debug('Miner status retrieved successfully', status);
      return status;
    } catch (error) {
      this.logger.error(`Failed to get miner status: ${error}`);
      throw new MinerError('Miner status retrieval failed', 'MINER_STATUS_ERROR', { error });
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      taskManager: boolean;
      earningsManager: boolean;
      statisticsAnalyzer: boolean;
      gatewayConnector: boolean;
    };
    timestamp: Date;
  }> {
    try {
      const components = {
        taskManager: false,
        earningsManager: false,
        statisticsAnalyzer: false,
        gatewayConnector: false
      };

      // 测试各个组件
      try {
        await this.taskManager.getTaskHistory(1, 1);
        components.taskManager = true;
      } catch (error) {
        this.logger.warn(`Task manager health check failed: ${error}`);
      }

      try {
        const deviceId = await this.getCurrentDeviceId();
        await this.earningsManager.getDeviceEarnings(deviceId, 1);
        components.earningsManager = true;
      } catch (error) {
        this.logger.warn(`Earnings manager health check failed: ${error}`);
      }

      try {
        await this.statisticsAnalyzer.getSummary();
        components.statisticsAnalyzer = true;
      } catch (error) {
        this.logger.warn(`Statistics analyzer health check failed: ${error}`);
      }

      // Gateway connector 是可选的，不影响整体健康状态
      components.gatewayConnector = true;

      const healthyComponents = Object.values(components).filter(Boolean).length;
      const totalComponents = Object.keys(components).length - 1; // 排除 gateway connector

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyComponents === totalComponents) {
        status = 'healthy';
      } else if (healthyComponents >= totalComponents / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        components,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
      return {
        status: 'unhealthy',
        components: {
          taskManager: false,
          earningsManager: false,
          statisticsAnalyzer: false,
          gatewayConnector: false
        },
        timestamp: new Date()
      };
    }
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  private async getCurrentDeviceId(): Promise<string> {
    try {
      // 优先从设备配置服务获取设备ID
      const config = this.deviceConfigService.getCurrentConfig();
      if (config.deviceId) {
        return config.deviceId;
      }
    } catch (error) {
      this.logger.warn('Failed to get device ID from config service:', error);
    }

    // 回退到环境变量
    const deviceId = process.env['DEVICE_ID'] || process.env['MINER_DEVICE_ID'];

    if (deviceId) {
      return deviceId;
    }

    // 如果都没有，生成一个默认的设备ID
    const defaultDeviceId = `device_${Date.now()}`;
    this.logger.warn(`No device ID configured, using generated ID: ${defaultDeviceId}`);
    return defaultDeviceId;
  }
}
