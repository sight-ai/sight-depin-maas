import { Inject } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { m, ModelOfMiner } from "@saito/models";
import { z } from "zod";

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

  async getSummary(conn: DatabaseTransactionConnection): Promise<ModelOfMiner<'summary'>> {
    // 获取收益信息
    const { total_block_rewards, total_job_rewards } = await conn.one(SQL.type(
      m.miner('minerEarning')
    )`
      select 
        coalesce(sum(block_rewards::float), 0) as total_block_rewards,
        coalesce(sum(job_rewards::float), 0) as total_job_rewards
      from saito_miner.earnings;
    `);

    // 获取设备状态
    const device = await conn.maybeOne(SQL.type(
      m.miner('minerDeviceStatus')
    )`
      select 
        name, 
        status, 
        extract(epoch from up_time_start)::bigint as up_time_start,
        extract(epoch from up_time_end)::bigint as up_time_end
      from saito_miner.device_status
      order by updated_at desc
      limit 1;
    `);

    // 计算运行时间百分比
    const { uptime_percentage } = await conn.one(SQL.type(
      m.miner('minerUptime')
    )`
      select 
        count(distinct date_trunc('day', created_at))::float / 30.0 * 100 as uptime_percentage
      from saito_miner.tasks
      where created_at >= now() - interval '30 days';
    `);

    // 获取最近30天的收益数据
    const earnings = await conn.any(SQL.type(
      m.miner('minerEarningsHistory')
    )`
      with dates as (
        select generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      )
      select 
        coalesce(sum(block_rewards::float + job_rewards::float), 0) as daily_earning
      from dates d
      left join saito_miner.earnings e
        on date_trunc('day', e.created_at) = d.day
      group by d.day
      order by d.day;
    `);

    const taskActivity = await conn.any(SQL.type(
      m.miner('minerTaskActivity')
    )`
      with dates as (
        select generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        )::date as day
      )
      select 
        to_char(d.day, 'YYYY-MM-DD') as date,
        count(t.id) as task_count
      from dates d
      left join saito_miner.tasks t
        on date_trunc('day', t.created_at) = d.day
      group by d.day
      order by d.day;
    `);

    return {
      earning_info: {
        total_block_rewards,
        total_job_rewards
      },
      device_info: {
        name: device?.name || 'Unknown Device',
        status: (device?.status || 'disconnected') as 'connected' | 'disconnected'
      },
      statistics: {
        up_time_percentage: uptime_percentage,
        earning_serials: earnings.map(e => e.daily_earning),
        task_activity: taskActivity.map(t => t.task_count)
      }
    };
  }

  async createTask(conn: DatabaseTransactionConnection, input: ModelOfMiner<'create_task_request'>) {
    const task = await conn.one(SQL.type(
      m.miner('task'),
    )`
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
      eval_duration
    )
    values (
      gen_random_uuid(),
      ${input.model},
      now(),
      now(),
      'in-progress',
      0,
      0,
      0,
      0,
      0,
      0
    )
    returning *;
  `);
    return task;
  }

  async getTask(
    conn: DatabaseTransactionConnection,
    id: string
  ) {
    const task = await conn.one(SQL.type(
      m.miner('task'),
    )`
    select *
    from saito_miner.tasks
    where id = ${id}
  `);
    return task;
  }

  async updateTask(
    conn: DatabaseTransactionConnection,
    id: string,
    updates: Partial<ModelOfMiner<'task'>>
  ) {
    const task = await conn.one(SQL.type(
      m.miner('task')
    )`
      update saito_miner.tasks
      set 
        status = coalesce(${updates.status || ''}::text, status),
        total_duration = coalesce(${updates.total_duration || 0}, total_duration),
        load_duration = coalesce(${updates.load_duration || 0}, load_duration),
        prompt_eval_count = coalesce(${updates.prompt_eval_count || 0}, prompt_eval_count),
        prompt_eval_duration = coalesce(${updates.prompt_eval_duration || 0}, prompt_eval_duration),
        eval_count = coalesce(${updates.eval_count || 0}, eval_count),
        eval_duration = coalesce(${updates.eval_duration || 0}, eval_duration),
        updated_at = now()
      where id = ${id}
      returning *;
    `);
    return task;
  }

  async getTasks(
    conn: DatabaseTransactionConnection,
    page: number,
    limit: number
  ) {
    const offset = (page - 1) * limit;

    // Retrieve total count of tasks
    const { count } = await conn.one(SQL.type(
      m.miner('taskCount')
    )`
    select count(*) as count
    from saito_miner.tasks;
  `);

    // Fetch tasks without using to_char for date formatting
    const tasks = await conn.any(SQL.type(
      m.miner('task')
    )`
    select
      id,
      model,
      created_at,
      status,
      total_duration,
      load_duration,
      prompt_eval_count,
      prompt_eval_duration,
      eval_count,
      eval_duration,
      updated_at
    from saito_miner.tasks
    order by created_at desc
    limit ${limit} offset ${offset};
  `);

    // Parse and transform the data with the defined Zod schemas
    return m.miner('task_history_response').parse({
      page,
      limit,
      total: count,
      tasks,
    });
  }

}
