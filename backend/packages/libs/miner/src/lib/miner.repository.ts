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

  async createTask(conn: DatabaseTransactionConnection, input: ModelOfMiner<'create_task_request'>) {
    const task = await conn.one(SQL.type(
      m.miner('task'),
    )`
    insert into saito_miner.tasks (
      model,
      created_at,
      status,
    )
    values (
      ${input.model},
      new Date().toISOString(),
      'in-progress',
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

  async getTasks(
    conn: DatabaseTransactionConnection,
    page: number | string,
    limit: number | string
  ) {
    // 确保参数为数字类型
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    
    if (isNaN(parsedPage) || isNaN(parsedLimit)) {
      throw new Error('Invalid page or limit parameter');
    }

    const offset = (parsedPage - 1) * parsedLimit;

    const { count } = await conn.one(SQL.type(
      z.object({ count: z.number() })
    )`
      select cast(count(*) as integer) as count
      from saito_miner.tasks;
    `);

    const tasks = await conn.any(SQL.type(
      m.miner('task')
    )`
      select 
        id,
        model,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        status,
        cast(total_duration as integer) as total_duration,
        cast(load_duration as integer) as load_duration,
        cast(prompt_eval_count as integer) as prompt_eval_count,
        cast(prompt_eval_duration as integer) as prompt_eval_duration,
        cast(eval_count as integer) as eval_count,
        cast(eval_duration as integer) as eval_duration,
        to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
      from saito_miner.tasks
      order by created_at desc
      limit ${parsedLimit} offset ${offset};
    `);

    return m.miner('task_history_response').parse({
      page: parsedPage,
      limit: parsedLimit,
      total: count,
      tasks,
    });
  }
}
