import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { Database } from 'better-sqlite3';
import crypto from 'crypto';
import {
  MinerEarning,
  MinerDeviceStatus,
  MinerUptime,
  MinerEarningsHistory,
  MinerDailyRequests,
  MinerTaskActivity,
  ModelOfMiner
} from "@saito/models";

export class MinerRepository {
  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { }
  private readonly logger = new Logger(MinerRepository.name);
  async transaction<T>(
    handler: (db: Database) => T,
  ) {
    return this.persistentService.transaction(handler);
  }

  // 获取收益信息
  async getEarningInfo(db: Database, deviceId: string, isRegistered: boolean) {
    const source = isRegistered ? 'gateway' : 'local';

    const result = db.prepare(`
      SELECT
        COALESCE(SUM(block_rewards), 0) AS total_block_rewards,
        COALESCE(SUM(job_rewards), 0) AS total_job_rewards
      FROM saito_miner_earnings
      WHERE device_id = ? AND source = ?
    `).get(deviceId, source) as ModelOfMiner<'MinerEarning'>;

    return result;
  }

  // 获取设备信息
  async getDeviceInfo(db: Database, deviceId: string, isRegistered: boolean) {
    const source = isRegistered ? 'gateway' : 'local';

    const result = db.prepare(`
      SELECT
        name,
        status,
        up_time_start,
        up_time_end
      FROM saito_miner_device_status
      WHERE id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(deviceId) as ModelOfMiner<'MinerDeviceStatus'>;

    return result;
  }

  // 获取运行时间百分比
  async getUptimePercentage(db: Database, deviceId: string, isRegistered: boolean) {
    const source = isRegistered ? 'gateway' : 'local';

    // SQLite不支持date_trunc函数，我们需要使用strftime
    const result = db.prepare(`
      SELECT
        (COUNT(DISTINCT strftime('%Y-%m-%d', created_at)) * 100.0 / 30.0) AS uptime_percentage
      FROM saito_miner_tasks
      WHERE created_at >= datetime('now', '-30 days')
        AND source = ?
        AND device_id = ?
    `).get(source, deviceId) as ModelOfMiner<'MinerUptime'>;

    return result;
  }

  // 获取收益历史数据
  async getEarningsHistory(db: Database, deviceId: string, days: number = 31, isRegistered: boolean) {
    const source = isRegistered ? 'gateway' : 'local';

    // SQLite不支持generate_series，我们需要使用一个不同的方法来生成日期序列
    // 创建一个临时表来存储日期
    const result = [];

    // 获取当前日期
    const now = new Date();

    // 生成过去days天的日期
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // 格式: YYYY-MM-DD

      // 查询该日期的收益
      const dayEarning = db.prepare(`
        SELECT
          COALESCE(SUM(block_rewards + job_rewards), 0) AS daily_earning
        FROM saito_miner_earnings
        WHERE strftime('%Y-%m-%d', created_at) = ?
          AND source = ?
          AND device_id = ?
      `).get(dateStr, source, deviceId) as { daily_earning: number } | undefined;

      result.push({
        daily_earning: dayEarning ? dayEarning.daily_earning : 0,
        date: dateStr
      });
    }

    return result as ModelOfMiner<'MinerEarningsHistory'>[];
  }

  // 获取任务请求数据
  async getTaskRequestData(
    db: Database,
    deviceId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    isRegistered: boolean
  ) {
    const source = isRegistered ? 'gateway' : 'local';

    // For daily: last 24 hours
    // For weekly: last 8 days
    // For monthly: last 31 days
    const intervalMap = {
      'daily': { unit: 'hour', value: '-23 hours', points: 24, format: '%Y-%m-%d %H:00:00' },
      'weekly': { unit: 'day', value: '-7 days', points: 8, format: '%Y-%m-%d 00:00:00' },
      'monthly': { unit: 'day', value: '-30 days', points: 31, format: '%Y-%m-%d 00:00:00' }
    } as const;

    const timeConfig = intervalMap[period];
    const result = [];

    // 获取当前时间
    const now = new Date();

    // 根据时间单位生成时间点
    for (let i = timeConfig.points - 1; i >= 0; i--) {
      let date = new Date(now);

      if (timeConfig.unit === 'hour') {
        date.setHours(date.getHours() - i);
        // 设置分钟和秒为0
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
      } else {
        date.setDate(date.getDate() - i);
        // 设置小时、分钟和秒为0
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
      }

      // 格式化日期
      const dateStr = date.toISOString().replace('T', ' ').split('.')[0];

      // 根据时间单位构建查询条件
      let timeCondition;
      if (timeConfig.unit === 'hour') {
        timeCondition = `strftime('%Y-%m-%d %H', created_at) = strftime('%Y-%m-%d %H', ?)`;
      } else {
        timeCondition = `strftime('%Y-%m-%d', created_at) = strftime('%Y-%m-%d', ?)`;
      }

      // 查询该时间点的任务数量
      const countResult = db.prepare(`
        SELECT
          COUNT(id) AS request_count
        FROM saito_miner_tasks
        WHERE ${timeCondition}
          AND device_id = ?
          AND source = ?
      `).get(dateStr, deviceId, source) as { request_count: number } | undefined;

      result.push({
        request_count: countResult ? countResult.request_count : 0,
        date: dateStr
      });
    }

    return result as ModelOfMiner<'MinerDailyRequests'>[];
  }

  // 获取按月任务活动数据
  async getMonthlyTaskActivity(
    db: Database,
    year: number,
    deviceId: string,
    isRegistered: boolean
  ) {
    const source = isRegistered ? 'gateway' : 'local';
    const result = [];

    // 生成1-12月的数据
    for (let month = 1; month <= 12; month++) {
      // 格式化月份为两位数
      const monthStr = month.toString().padStart(2, '0');
      const dateStr = `${year}-${monthStr}-01`;

      // 查询该月的任务数量
      const countResult = db.prepare(`
        SELECT
          COUNT(*) AS task_count
        FROM saito_miner_tasks
        WHERE strftime('%Y', created_at) = ?
          AND strftime('%m', created_at) = ?
          AND device_id = ?
          AND source = ?
      `).get(year.toString(), monthStr, deviceId, source) as { task_count: number } | undefined;

      result.push({
        date: dateStr,
        task_count: countResult ? countResult.task_count : 0
      });
    }

    return result as ModelOfMiner<'MinerTaskActivity'>[];
  }

  // 获取按日任务活动数据
  async getDailyTaskActivity(
    db: Database,
    month: number | null,
    deviceId: string,
    isRegistered: boolean
  ) {
    const source = isRegistered ? 'gateway' : 'local';
    const result = [];

    if (month === null) {
      // 如果没有提供月份，使用当前月份
      month = new Date().getMonth() + 1; // JavaScript月份从0开始
    }

    // 获取当前年份
    const year = new Date().getFullYear();

    // 获取该月的天数
    const daysInMonth = new Date(year, month, 0).getDate();

    // 格式化月份为两位数
    const monthStr = month.toString().padStart(2, '0');

    // 生成该月每一天的数据
    for (let day = 1; day <= daysInMonth; day++) {
      // 格式化日期为两位数
      const dayStr = day.toString().padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      // 查询该日的任务数量
      const countResult = db.prepare(`
        SELECT
          COUNT(*) AS task_count
        FROM saito_miner_tasks
        WHERE strftime('%Y-%m-%d', created_at) = ?
          AND device_id = ?
          AND source = ?
      `).get(dateStr, deviceId, source) as { task_count: number } | undefined;

      result.push({
        date: dateStr,
        task_count: countResult ? countResult.task_count : 0
      });
    }

    return result as ModelOfMiner<'MinerTaskActivity'>[];
  }

  // 获取任务列表（分页）
  async getTasks(
    db: Database,
    page: number,
    limit: number,
    deviceId: string,
    isRegistered: boolean
  ) {
    const offset = (page - 1) * limit;
    const source = isRegistered ? 'gateway' : 'local';

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) AS count
      FROM saito_miner_tasks
      WHERE device_id = ? AND source = ?
    `).get(deviceId, source) as { count: number };

    // Get paginated task list
    const tasksResult = db.prepare(`
      SELECT *
      FROM saito_miner_tasks
      WHERE device_id = ? AND source = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(deviceId, source, limit, offset);

    return {
      count: Number(countResult.count),
      tasks: tasksResult as ModelOfMiner<'Task'>[]
    };
  }

  // 根据设备ID获取任务
  async getTasksByDeviceId(
    db: Database,
    deviceId: string,
    isRegistered: boolean
  ): Promise<ModelOfMiner<'Task'>[]> {
    const source = isRegistered ? 'gateway' : 'local';
    const result = db.prepare(`
      SELECT * FROM saito_miner_tasks
      WHERE device_id = ? AND source = ?
      ORDER BY created_at DESC
    `).all(deviceId, source);
    return result as ModelOfMiner<'Task'>[];
  }

  // 根据设备ID获取收益记录
  async getEarningsByDeviceId(
    db: Database,
    deviceId: string,
    isRegistered: boolean
  ): Promise<ModelOfMiner<'Earning'>[]> {
    const source = isRegistered ? 'gateway' : 'local';
    const result = db.prepare(`
      SELECT * FROM saito_miner_earnings
      WHERE device_id = ? AND source = ?
      ORDER BY created_at DESC
    `).all(deviceId, source);
    return result as ModelOfMiner<'Earning'>[];
  }

  // 根据任务ID获取收益记录
  async getEarningsByTaskId(
    db: Database,
    taskId: string
  ): Promise<ModelOfMiner<'Earning'>[]> {
    const result = db.prepare(`
      SELECT *
      FROM saito_miner_earnings
      WHERE task_id = ?
    `).all(taskId);
    return result as ModelOfMiner<'Earning'>[];
  }

  // 创建任务
  async createTask(
    db: Database,
    model: string,
    deviceId: string
  ): Promise<ModelOfMiner<'Task'>> {
    // 生成UUID
    const id = crypto.randomUUID();

    // 插入任务
    db.prepare(`
      INSERT INTO saito_miner_tasks (
        id,
        model,
        created_at,
        updated_at,
        status,
        total_duration,
        load_duration,
        prompt_eval_count,
        prompt_eval_duration,
        eval_count,
        eval_duration,
        source,
        device_id
      )
      VALUES (?, ?, datetime('now'), datetime('now'), 'pending', 0, 0, 0, 0, 0, 0, 'local', ?)
    `).run(id, model, deviceId);

    // 获取插入的任务
    const result = db.prepare(`
      SELECT * FROM saito_miner_tasks WHERE id = ?
    `).get(id);

    return result as ModelOfMiner<'Task'>;
  }

  // 更新任务 - 直接接收SQL更新片段
  async updateTaskWithSql(
    db: Database,
    id: string,
    updateSql: string
  ): Promise<ModelOfMiner<'Task'>> {
    // 执行更新
    db.prepare(`
      UPDATE saito_miner_tasks
      SET ${updateSql}, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    // 获取更新后的任务
    const result = db.prepare(`
      SELECT * FROM saito_miner_tasks WHERE id = ?
    `).get(id);

    return result as ModelOfMiner<'Task'>;
  }

  // 获取单个任务
  async getTaskById(
    db: Database,
    taskId: string
  ): Promise<ModelOfMiner<'Task'> | null> {
    const result = db.prepare(`
      SELECT *
      FROM saito_miner_tasks
      WHERE id = ?
    `).get(taskId);
    return result as ModelOfMiner<'Task'> | null;
  }
}