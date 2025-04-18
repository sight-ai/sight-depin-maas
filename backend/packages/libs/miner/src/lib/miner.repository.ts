import { Inject } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import {
  MinerSchema,
  Task,
  Earning,
} from "@saito/models";

export class MinerRepository {
  constructor(
    @Inject(PersistentService)
    private readonly persistentService: PersistentService,
  ) { }

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
    return conn.one(SQL.type(MinerSchema.MinerEarningSchema)`
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
    return conn.maybeOne(SQL.type(MinerSchema.MinerDeviceStatusSchema)`
      select 
        name, 
        status, 
        extract(epoch from up_time_start)::bigint as up_time_start,
        extract(epoch from up_time_end)::bigint as up_time_end
      from saito_miner.device_status
      where device_id = ${deviceId} and source = ${source}
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
    return conn.one(SQL.type(MinerSchema.MinerUptimeSchema)`
      select 
        count(distinct date_trunc('day', created_at))::float / 30.0 * 100 as uptime_percentage
      from saito_miner.tasks
      where created_at >= now() - interval '30 days' and source = ${source} and device_id = ${deviceId};
    `);
  }

  // 获取收益历史数据
  async getEarningsHistory(conn: DatabaseTransactionConnection, deviceId: string, days: number = 30, isRegistered: boolean) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.any(SQL.type(MinerSchema.MinerEarningsHistorySchema)`
      with dates as (
        select generate_series(
          date_trunc('day', now()) - (${days} - 1) * interval '1 day',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      )
      select 
        coalesce(sum(block_rewards::float + job_rewards::float), 0) as daily_earning,
        d.day::date as date
      from dates d
      left join saito_miner.earnings e
        on date_trunc('day', e.created_at) = d.day
      where (e.id is null or (e.source = ${source} and e.device_id = ${deviceId}))
      group by d.day
      order by d.day;
    `);
  }

  // 获取任务请求数据
  async getTaskRequestData(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    period: string = 'daily',
    isRegistered: boolean
  ) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    const timeUnit = period === 'daily' ? 'hour' : 'day';
    const intervalValue = period === 'daily' ? '24 hours' : period === 'weekly' ? '7 days' : '30 days';
    const groupByUnit = period === 'daily' ? 'hour' : 'day';

    return conn.any(SQL.type(MinerSchema.MinerDailyRequestsSchema)`
      with dates as (
        select generate_series(
          date_trunc(${timeUnit}, now()) - ${SQL.fragment([`interval '${intervalValue}'`])},
          date_trunc(${timeUnit}, now()),
          ${SQL.fragment([`interval '1 ${timeUnit}'`])}
        ) as time_point
      )
      select 
        coalesce(count(t.id), 0) as request_count,
        d.time_point::timestamp as date
      from dates d
      left join saito_miner.tasks t
        on date_trunc(${groupByUnit}, t.created_at) = d.time_point and t.device_id = ${deviceId} and t.source = ${source}
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
    return conn.any(SQL.type(MinerSchema.MinerTaskActivitySchema)`
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
    deviceId: string,
    isRegistered: boolean
  ) {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    return conn.any(SQL.type(MinerSchema.MinerTaskActivitySchema)`
            with hours as (
        select generate_series(
          date_trunc('hour', now()) - interval '23 hours',
          date_trunc('hour', now()),
          interval '1 hour'
        ) as hour
      )
      select 
        to_char(h.hour, 'YYYY-MM-DD HH24:00:00') as datetime,
        coalesce(count(t.id), 0) as task_count
      from hours h
      left join saito_miner.tasks t
        on date_trunc('hour', t.created_at) = h.hour and t.device_id = ${deviceId}
      group by h.hour
      order by h.hour;
    `);
  }


  // 创建任务
  async createTask(conn: DatabaseTransactionConnection, model: string, deviceId: string): Promise<Task> {
    const result = await conn.one(SQL.type(MinerSchema.TaskSchema)`
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
        'in-progress',
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
    return result;
  }

  // 更新任务 - 直接接收SQL更新片段
  async updateTaskWithSql(
    conn: DatabaseTransactionConnection,
    id: string,
    updateSql: string
  ): Promise<Task> {
    const result = await conn.one(SQL.type(MinerSchema.TaskSchema)`
      update saito_miner.tasks
      set ${SQL.fragment([updateSql])}, updated_at = now()
      where id = ${id}
      returning *;
    `);
    return result;
  }

  // 获取单个任务
  async getTaskById(conn: DatabaseTransactionConnection, id: string): Promise<Task> {
    return conn.one(SQL.type(MinerSchema.TaskSchema)`
      select * from saito_miner.tasks where id = ${id};
    `);
  }

  // 更新过期任务
  async updateStaleInProgressTasks(
    conn: DatabaseTransactionConnection,
    timeoutMinutes: number
  ): Promise<Task[]> {
    const intervalString = `${timeoutMinutes} minutes`;
    const staleTasksResult = await conn.query(SQL.type(MinerSchema.TaskSchema)`
      update saito_miner.tasks
      set 
        status = 'failed',
        updated_at = now()
      where status = 'in-progress'
        and created_at < now() - ${SQL.fragment([`interval '${intervalString}'`])}
      returning *;
    `);

    return [...staleTasksResult.rows];
  }

  // 创建收益记录
  async createEarnings(
    conn: DatabaseTransactionConnection,
    blockRewards: number,
    jobRewards: number,
    deviceId: string,
    taskId: string | null
  ) {
    const result = await conn.one(SQL.type(MinerSchema.MinerEarningSchema)`
      INSERT INTO saito_miner.earnings (
        id, 
        block_rewards, 
        job_rewards, 
        device_id, 
        task_id, 
        created_at, 
        updated_at, 
        source
      )
      VALUES (
        gen_random_uuid(), 
        ${blockRewards}, 
        ${jobRewards}, 
        ${deviceId}, 
        ${taskId}, 
        now(), 
        now(), 
        'local'
      )
      RETURNING block_rewards as total_block_rewards, job_rewards as total_job_rewards;
    `);

    return result;
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
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    // 获取任务总数
    const countResult = await conn.one(SQL.type(MinerSchema.TaskCountSchema)`
      select count(*) as count
      from saito_miner.tasks 
      where device_id = ${deviceId} and source = ${source};
    `);

    // 获取分页任务列表
    const tasksResult = await conn.any(SQL.type(MinerSchema.TaskSchema)`
      select *
      from saito_miner.tasks
      where device_id = ${deviceId} and source = ${source}
      order by created_at desc
      limit ${limit} offset ${offset};
    `);

    return {
      count: countResult.count,
      tasks: [...tasksResult]
    };
  }

  // 根据设备ID获取任务
  async getTasksByDeviceId(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    limit: number,
    isRegistered: boolean
  ): Promise<Task[]> {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    const result = await conn.any(SQL.type(MinerSchema.TaskSchema)`
      SELECT * FROM saito_miner.tasks
      WHERE device_id = ${deviceId} and source = ${source}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `);

    return [...result];
  }

  // 根据设备ID获取收益记录
  async getEarningsByDeviceId(
    conn: DatabaseTransactionConnection,
    deviceId: string,
    limit: number,
    isRegistered: boolean
  ): Promise<Earning[]> {
    let source = 'local';
    if(isRegistered) {
      source = 'gateway';
    }
    const result = await conn.any(SQL.type(MinerSchema.EarningSchema)`
      SELECT * FROM saito_miner.earnings
      WHERE device_id = ${deviceId} and source = ${source}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `);

    return [...result];
  }

  // 根据任务ID获取收益记录
  async getEarningsByTaskId(
    conn: DatabaseTransactionConnection,
    taskId: string
  ): Promise<Earning[]> {
    const result = await conn.any(SQL.type(MinerSchema.EarningSchema)`
      SELECT * FROM saito_miner.earnings
      WHERE task_id = ${taskId}
      ORDER BY created_at DESC;
    `);

    return [...result];
  }
}
