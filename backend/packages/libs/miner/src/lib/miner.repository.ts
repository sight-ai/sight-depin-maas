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
  ) {}

  async transaction<T>(
    handler: (conn: DatabaseTransactionConnection) => Promise<T>,
  ) {
    return this.persistentService.pgPool.transaction(handler);
  }

  async getSummary(conn: DatabaseTransactionConnection): Promise<ModelOfMiner<'summary'>> {
    // 获取收益信息
    const { total_block_rewards, total_job_rewards } = await conn.one(SQL.type(
      z.object({
        total_block_rewards: z.number(),
        total_job_rewards: z.number()
      })
    )`
      select 
        cast(coalesce(sum(cast(block_rewards as FLOAT)), 0) as FLOAT) as total_block_rewards,
        cast(coalesce(sum(cast(job_rewards as FLOAT)), 0) as FLOAT) as total_job_rewards
      from saito_miner.earnings;
    `);
    console.log(total_block_rewards.toString(), total_job_rewards.toString())
    // 获取设备状态
    const device = await conn.maybeOne(SQL.type(
      z.object({
        name: z.string(),
        status: z.string(),
        up_time_start: z.number().nullable(), // 期望 number 类型
        up_time_end: z.number().nullable()
      })
    )`
      select 
        name, 
        status, 
        extract(epoch from created_at) as up_time_start,
        extract(epoch from updated_at) as up_time_end
      from saito_miner.device_status
      order by updated_at desc
      limit 1;
    `);

    // 计算运行时间百分比 - 基于每天是否有任务来统计
    const { uptime_percentage } = await conn.one(SQL.type(
      z.object({
        uptime_percentage: z.number()
      })
    )`
      select 
        cast(
          coalesce(
            count(distinct date_trunc('day', created_at)) /
            30.0 * 100,
            0
          ) as double precision
        ) as uptime_percentage
      from saito_miner.tasks
      where created_at >= now() - interval '30 days';
    `);
    console.log(uptime_percentage.toString())
    // 获取最近30天的收益数据
    const earnings = await conn.any(SQL.type(
      z.object({
        daily_earning: z.number()
      })
    )`
      with dates as (
        select generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as day
      )
      select 
        cast(coalesce(sum(cast(e.block_rewards as double precision) + cast(e.job_rewards as double precision)), 0) as double precision) as daily_earning
      from dates d
      left join saito_miner.earnings e
        on date_trunc('day', e.created_at) = d.day
      group by d.day
      order by d.day;
    `);

    const taskActivity = await conn.any(SQL.type(
      z.object({
        date: z.string(),
        task_count: z.number()
      })
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
        cast(count(t.id) as integer) as task_count
      from dates d
      left join saito_miner.tasks t
        on date_trunc('day', t.created_at) = d.day
      group by d.day
      order by d.day;
    `);

    console.log(earnings.toString())
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
      model,
      created_at,
      status
    )
    values (
      ${input.model},
      now(),
      'in-progress'
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
      z.object({ count: z.number() })
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
