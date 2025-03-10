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
    page: number,
    limit: number
  ) {
    const offset = (page - 1) * limit;

    // Fetch the total count of tasks
    const total = await conn.one(SQL.type(z.number())`
      select count(*) as total
      from saito_miner.tasks;
    `);

    // Fetch the paginated tasks
    const result = await conn.query(SQL.type(
      m.miner('task'),
    )`
      select *
      from saito_miner.tasks
      order by created_at desc
      limit ${limit} offset ${offset};
    `);

    // Return the response in the specified format
    return m.miner('task_history_response').parse({
      page,
      limit,
      total, // Convert to number, since count returns a string
      tasks: result.rows,
    });
  }
}
