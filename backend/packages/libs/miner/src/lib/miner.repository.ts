import { Inject, Logger } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection, sql as SQL } from 'slonik';
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
    handler: (conn: DatabaseTransactionConnection) => Promise<T>,
  ) {
    return this.persistentService.pgPool.transaction(handler);
  }

  // 获取收益信息
  async getEarningInfo(conn: DatabaseTransactionConnection, deviceId: string, isRegistered: boolean) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.one(SQL.type(MinerEarning)`
      select 
        coalesce(sum(block_rewards::float), 0) as total_block_rewards,
        coalesce(sum(job_rewards::float), 0) as total_job_rewards
      from saito_miner.earnings 
      where source = ${source} and device_id = ${deviceId};
    `);
  }

  // 获取设备信息
  async getDeviceInfo(conn: DatabaseTransactionConnection, deviceId: string, isRegistered: boolean) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.maybeOne(SQL.type(MinerDeviceStatus)`
      select 
        name, 
        status, 
        extract(epoch from up_time_start)::bigint as up_time_start,
        extract(epoch from up_time_end)::bigint as up_time_end
      from saito_miner.device_status
      where id = ${deviceId}
      order by updated_at desc
      limit 1;
    `);
  }

  // 获取运行时间百分比
  async getUptimePercentage(conn: DatabaseTransactionConnection, deviceId: string, isRegistered: boolean) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.one(SQL.type(MinerUptime)`
      select 
        count(distinct date_trunc('day', created_at))::float / 30.0 * 100 as uptime_percentage
      from saito_miner.tasks
      where created_at >= now() - interval '30 days' and source = ${source} and device_id = ${deviceId};
    `);
  }

  // 获取收益历史数据
  async getEarningsHistory(conn: DatabaseTransactionConnection, deviceId: string, days: number = 31, isRegistered: boolean) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.any(SQL.type(MinerEarningsHistory)`
      with dates as (
        select generate_series(
          date_trunc('day', now()) - (${days}) * interval '1 day',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      )
      select 
        coalesce(sum(block_rewards::float + job_rewards::float), 0) as daily_earning,
        to_char(d.day, 'YYYY-MM-DD') as date
      from dates d
      left join saito_miner.earnings e
        on date_trunc('day', e.created_at) = d.day
        and e.source = ${source} 
        and e.device_id = ${deviceId}
      group by d.day
      order by d.day;
    `);
  }

  // 获取任务请求数据
  async getTaskRequestData(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    isRegistered: boolean
  ) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }

    // For daily: last 24 hours
    // For weekly: last 8 days
    // For monthly: last 31 days
    const intervalMap = {
      'daily': { unit: 'hour', value: '23 hours', points: 24 },
      'weekly': { unit: 'day', value: '7 days', points: 8 },
      'monthly': { unit: 'day', value: '30 days', points: 31 }
    } as const;

    const timeConfig = intervalMap[period];

    return conn.any(SQL.type(MinerDailyRequests)`
      with dates as (
        select generate_series(
          date_trunc(${timeConfig.unit}, now()) - ${SQL.fragment([`interval '${timeConfig.value}'`])},
          date_trunc(${timeConfig.unit}, now()),
          ${SQL.fragment([`interval '1 ${timeConfig.unit}'`])}
        ) as time_point
      )
      select 
        coalesce(count(t.id), 0) as request_count,
        to_char(d.time_point, 'YYYY-MM-DD HH24:MI:SS') as date
      from dates d
      left join saito_miner.tasks t
        on date_trunc(${timeConfig.unit}, t.created_at) = d.time_point 
        and t.device_id = ${deviceId} 
        and t.source = ${source}
      group by d.time_point
      order by d.time_point;
    `);
  }

  // 获取按月任务活动数据
  async getMonthlyTaskActivity(
    conn: DatabaseTransactionConnection,
    year: number,
    deviceId: string,
    isRegistered: boolean
  ) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.any(SQL.type(MinerTaskActivity)`
      with dates as (
        select generate_series(1, 12) as month
      )
      select 
        to_char(make_date(${year}, d.month, 1), 'YYYY-MM-DD') as date,
        coalesce(t.count, 0) as task_count
      from dates d
      left join (
        select 
          extract(month from created_at) as month,
          count(*) as count
        from saito_miner.tasks
        where extract(year from created_at) = ${year} and device_id = ${deviceId} and source = ${source}
        group by extract(month from created_at)
      ) t on d.month = t.month
      order by d.month;
    `);
  }

  // 获取按日任务活动数据
  async getDailyTaskActivity(
    conn: DatabaseTransactionConnection,
    month: number | null,
    deviceId: string,
    isRegistered: boolean
  ) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.any(SQL.type(MinerTaskActivity)`
      with dates as (
        select generate_series(
          date_trunc('month', make_date(extract(year from now())::int, ${month}, 1)),
          date_trunc('month', make_date(extract(year from now())::int, ${month}, 1)) + interval '1 month' - interval '1 day',
          interval '1 day'
        )::date as date
      )
      select 
        to_char(d.date, 'YYYY-MM-DD') as date,
        coalesce(count(t.id), 0) as task_count
      from dates d
      left join saito_miner.tasks t
        on date_trunc('day', t.created_at)::date = d.date 
        and extract(month from t.created_at) = ${month}
        and t.device_id = ${deviceId} 
        and t.source = ${source}
      group by d.date
      order by d.date;
    `);
  }

  // 获取任务列表（分页）
  async getTasks(
    conn: DatabaseTransactionConnection,
    page: number,
    limit: number,
    deviceId: string,
    isRegistered: boolean
  ) {
    const offset = (page - 1) * limit;
    const source = isRegistered ? 'gateway' : 'local';
    
    // Get total count
    const countResult = await conn.one(SQL.unsafe`
      select count(*) as count
      from saito_miner.tasks 
      where device_id = ${deviceId} and source = ${source};
    `);

    // Get paginated task list
    const tasksResult = await conn.any(SQL.unsafe`
      select *
      from saito_miner.tasks
      where device_id = ${deviceId} and source = ${source}
      order by created_at desc
      limit ${limit} offset ${offset};
    `);

    return {
      count: Number(countResult.count),
      tasks: tasksResult as ModelOfMiner<'Task'>[]
    };
  }

  // 根据设备ID获取任务
  async getTasksByDeviceId(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    isRegistered: boolean
  ): Promise<ModelOfMiner<'Task'>[]> {
    const source = isRegistered ? 'gateway' : 'local';
    const result = await conn.any(SQL.unsafe`
      SELECT * FROM saito_miner.tasks
      WHERE device_id = ${deviceId} AND source = ${source}
      ORDER BY created_at DESC;
    `);
    return result as ModelOfMiner<'Task'>[];
  }

  // 根据设备ID获取收益记录
  async getEarningsByDeviceId(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    isRegistered: boolean
  ): Promise<ModelOfMiner<'Earning'>[]> {
    const source = isRegistered ? 'gateway' : 'local';
    const result = await conn.any(SQL.unsafe`
      SELECT * FROM saito_miner.earnings
      WHERE device_id = ${deviceId} AND source = ${source}
      ORDER BY created_at DESC;
    `);
    return result as ModelOfMiner<'Earning'>[];
  }

  // 根据任务ID获取收益记录
  async getEarningsByTaskId(
    conn: DatabaseTransactionConnection,
    taskId: string
  ): Promise<ModelOfMiner<'Earning'>[]> {
    const result = await conn.any(SQL.unsafe`
      select *
      from saito_miner.earnings
      where task_id = ${taskId};
    `);
    return result as ModelOfMiner<'Earning'>[];
  }

  // 创建任务
  async createTask(
    conn: DatabaseTransactionConnection, 
    model: string, 
    deviceId: string
  ): Promise<ModelOfMiner<'Task'>> {
    this.logger.log(`Creating task for model: ${model}, deviceId: ${deviceId}`);
    const result = await conn.one(SQL.unsafe`
      insert into saito_miner.tasks (
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
      values (
        gen_random_uuid(),
        ${model},
        now(),
        now(),
        'pending',
        0,
        0,
        0,
        0,
        0,
        0,
        'local',
        ${deviceId}
      )
      returning *;
    `);
    return result as ModelOfMiner<'Task'>;
  }

  // 更新任务 - 直接接收SQL更新片段
  async updateTaskWithSql(
    conn: DatabaseTransactionConnection,
    id: string,
    updateSql: string
  ): Promise<ModelOfMiner<'Task'>> {
    const result = await conn.one(SQL.unsafe`
      update saito_miner.tasks
      set ${SQL.fragment([updateSql])}, updated_at = now()
      where id = ${id}
      returning *;
    `);
    return result as ModelOfMiner<'Task'>;
  }

  // 获取单个任务
  async getTaskById(
    conn: DatabaseTransactionConnection,
    taskId: string
  ): Promise<ModelOfMiner<'Task'> | null> {
    const result = await conn.maybeOne(SQL.unsafe`
      select *
      from saito_miner.tasks
      where id = ${taskId};
    `);
    return result as ModelOfMiner<'Task'> | null;
  }
}