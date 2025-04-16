import { Inject } from "@nestjs/common";
import { PersistentService } from "@saito/persistent";
import { DatabaseTransactionConnection } from "slonik";
import { SQL } from "@saito/common";
import { m, ModelOfMiner } from "@saito/models";

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  async getSummary(conn: DatabaseTransactionConnection, timeRange?: { 
    request_serials?: 'daily' | 'weekly' | 'monthly',
    filteredTaskActivity?: { 
      year?: string; 
      month?: string; 
      view?: 'Month' | 'Year' 
    },
  }, device_id?: string): Promise<ModelOfMiner<'summary'>> {
    // Calculate the interval based on timeRange
    const requestTimeRange = timeRange?.request_serials || 'daily';

    // 获取收益信息
    const { total_block_rewards, total_job_rewards } = await conn.one(SQL.type(
      m.miner('minerEarning')
    )`
      select 
        coalesce(sum(block_rewards::float), 0) as total_block_rewards,
        coalesce(sum(job_rewards::float), 0) as total_job_rewards
      from saito_miner.earnings where source = 'gateway' and device_id = ${device_id || 'default_device'};
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
      where device_id = ${device_id || 'default_device'}
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
      where created_at >= now() - interval '30 days' and source = 'gateway' and device_id = ${device_id || 'default_device'};
    `);

    // 获取收益数据
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
      where e.source = 'gateway' and e.device_id = ${device_id || 'default_device'}
      group by d.day
      order by d.day;
    `);
    // 获取请求数量统计
    const timeUnit = requestTimeRange === 'daily' ? 'hour' : 'day';
    const intervalValue = requestTimeRange === 'daily' ? '24 hours' : requestTimeRange === 'weekly' ? '7 days' : '30 days';
    const groupByUnit = requestTimeRange === 'daily' ? 'hour' : 'day';
    
    const dailyRequests = await conn.any(SQL.type(
      m.miner('minerDailyRequests')
    )`
      with dates as (
        select generate_series(
          date_trunc(${timeUnit}, now()) - ${SQL.fragment([`interval '${intervalValue}'`])},
          date_trunc(${timeUnit}, now()),
          ${SQL.fragment([`interval '1 ${timeUnit}'`])}
        ) as time_point
      )
      select 
        coalesce(count(t.id), 0) as request_count
      from dates d
      left join saito_miner.tasks t
        on date_trunc(${groupByUnit}, t.created_at) = d.time_point and t.source = 'gateway' and t.device_id = ${device_id || 'default_device'}
      group by d.time_point
      order by d.time_point;
    `);

    // 获取任务活动数据
    const year = timeRange?.filteredTaskActivity?.year ? parseInt(timeRange.filteredTaskActivity.year) : 2025;
    const month = timeRange?.filteredTaskActivity?.month ? months.indexOf(timeRange.filteredTaskActivity.month) + 1 : null;
    
    let dateRange;
    if (month) {
      // If month is specified, generate dates for that specific month
      const daysInMonth = new Date(year, month, 0).getDate();
      dateRange = SQL.fragment`
        select generate_series(
          date '${SQL.fragment([`${year}-${month.toString().padStart(2, '0')}-01`])}',
          date '${SQL.fragment([`${year}-${month.toString().padStart(2, '0')}-${daysInMonth}`])}',
          interval '1 day'
        )::date as day
      `;
    } else {
      // If only year is specified, generate dates for all days in the year
      dateRange = SQL.fragment`
        select generate_series(
          date '${SQL.fragment([`${year}-01-01`])}',
          date '${SQL.fragment([`${year}-12-31`])}',
          interval '1 day'
        )::date as day
      `;
    }
    
    let taskActivityQuery;
    if (timeRange?.filteredTaskActivity?.view === 'Year') {
      // For Year view, aggregate by month
      taskActivityQuery = SQL.type(m.miner('minerTaskActivity'))`
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
          where extract(year from created_at) = ${year} and device_id = ${device_id || 'default_device'}
          group by extract(month from created_at)
        ) t on d.month = t.month
        order by d.month;
      `;
    } else {
      // For Month view, use daily data
      taskActivityQuery = SQL.type(m.miner('minerTaskActivity'))`
        with dates as (${dateRange})
        select 
          to_char(d.day, 'YYYY-MM-DD') as date,
          coalesce(count(t.id), 0) as task_count
        from dates d
        left join saito_miner.tasks t
          on date_trunc('day', t.created_at) = d.day and t.device_id = ${device_id || 'default_device'}
        ${month 
          ? SQL.fragment`where (t.id is null or (extract(year from t.created_at) = ${year} and extract(month from t.created_at) = ${month}))`
          : SQL.fragment`where (t.id is null or extract(year from t.created_at) = ${year})`}
        group by d.day
        order by d.day;
      `;
    }
    
    const taskActivity = await conn.any(taskActivityQuery);

    // Similar fix for earnings and daily requests
    const earningsData = earnings.length === 30 ? earnings : Array(30).fill({ daily_earning: 0 });
    // const requestsData = dailyRequests.length === dataPoints ? dailyRequests : Array(dataPoints).fill({ request_count: 0 });

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
        earning_serials: earningsData.map(e => e.daily_earning),
        request_serials: dailyRequests.map(r => r.request_count),
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
      eval_duration,
      device_id
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
      0,
      ${input.device_id || 'default_device'}
    )
    returning *;
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

  async updateStaleInProgressTasks(
    conn: DatabaseTransactionConnection,
    timeoutMinutes: number = 5
  ) {
    const intervalString = `${timeoutMinutes} minutes`;
    const staleTasksResult = await conn.query(SQL.type(
      m.miner('task')
    )`
      update saito_miner.tasks
      set 
        status = 'failed',
        updated_at = now()
      where status = 'in-progress'
        and created_at < now() - ${SQL.fragment([`interval '${intervalString}'`])}
      returning *;
    `);
    
    return staleTasksResult.rows;
  }

  async createEarnings(
    conn: DatabaseTransactionConnection,
    blockRewards: number,
    jobRewards: number,
    device_id: string = 'default_device'
  ) {
    const earnings = await conn.one(SQL.type(
      m.miner('minerEarning')
    )`
      INSERT INTO saito_miner.earnings (id, block_rewards, job_rewards, device_id)
      VALUES (gen_random_uuid(), ${blockRewards}, ${jobRewards}, ${device_id})
      RETURNING block_rewards as total_block_rewards, job_rewards as total_job_rewards;
    `);
    return earnings;
  }

  async getTasks(
    conn: DatabaseTransactionConnection,
    page: number,
    limit: number,
    device_id: string = 'default_device'
  ) {
    const offset = (page - 1) * limit;

    // Retrieve total count of tasks
    const { count } = await conn.one(SQL.type(
      m.miner('taskCount')
    )`
    select count(*) as count
    from saito_miner.tasks where device_id = ${device_id || 'default_device'};
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
      updated_at,
      source,
      device_id
    from saito_miner.tasks
    where device_id = ${device_id || 'default_device'}
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
