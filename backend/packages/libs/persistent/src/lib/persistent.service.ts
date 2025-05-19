import { OnModuleDestroy, Logger } from '@nestjs/common';
import BetterSqlite3, { Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from '../env';
import { PersistentService } from './persistent.interface';
import { DatabaseTransactionConnection } from 'slonik';

export class DefaultPersistentService
  extends PersistentService
  implements OnModuleDestroy
{
  private readonly logger = new Logger(DefaultPersistentService.name);
  private _db: Database | null = null;
  private _isClosing: boolean = false;

  get db(): Database {
    if (this._db === null) {
      throw new Error('SQLite database is not initialized');
    }
    return this._db;
  }

  // For backward compatibility with existing code
  get pgPool() {
    return {
      transaction: async <T>(callback: (connection: DatabaseTransactionConnection) => Promise<T>): Promise<T> => {
        // Create a proxy object that will adapt SQLite operations to the expected interface
        const connectionProxy = {
          query: async (sql: any, values?: any[]) => {
            this.logger.debug(`SQLite query: ${sql}`);
            // Extract SQL from Slonik query objects
            const sqlText = typeof sql === 'string'
              ? sql
              : sql.sql || (sql.type === 'SLONIK_TOKEN_SQL' ? sql.sql : String(sql));

            // Convert PostgreSQL schema references to SQLite table names
            let convertedSql = sqlText.replace(/saito_miner\./g, 'saito_miner_');

            // Extract and reorder parameters for positional placeholders
            const params: any[] = [];
            if (values && values.length > 0) {
              // Convert PostgreSQL placeholders ($1, $2) to SQLite placeholders (?)
              convertedSql = convertedSql.replace(/\$(\d+)/g, (_match: string, num: string) => {
                const index = parseInt(num, 10) - 1;
                if (index >= 0 && index < values.length) {
                  params.push(values[index]);
                }
                return '?';
              });
            } else {
              // Just replace $1, $2, etc. with ? if no values provided
              convertedSql = convertedSql.replace(/\$(\d+)/g, '?');
            }

            // Convert PostgreSQL-specific functions to SQLite equivalents
            convertedSql = convertedSql
              .replace(/NOW\(\)/gi, "datetime('now')")
              .replace(/gen_random_uuid\(\)/gi, "lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))");

            // Execute the query
            try {
              // Check if this is a SELECT query or a modification query
              const isSelectQuery = /^\s*SELECT\s+/i.test(convertedSql);

              if (isSelectQuery) {
                // For SELECT queries, use query() which returns rows
                const result = this.query(convertedSql, params);
                return { rows: result };
              } else {
                // For INSERT, UPDATE, DELETE queries, use run() which doesn't return data
                this.run(convertedSql, params);
                return { rows: [] };
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.error(`SQLite query error: ${errorMessage}`);
              throw error;
            }
          },

          one: async (sql: any) => {
            const { rows } = await connectionProxy.query(sql);
            if (rows.length === 0) {
              throw new Error('No rows returned');
            }
            if (rows.length > 1) {
              throw new Error(`Expected 1 row, got ${rows.length}`);
            }
            return rows[0];
          },

          maybeOne: async (sql: any) => {
            const { rows } = await connectionProxy.query(sql);
            if (rows.length === 0) {
              return null;
            }
            if (rows.length > 1) {
              throw new Error(`Expected 0 or 1 rows, got ${rows.length}`);
            }
            return rows[0];
          },

          any: async (sql: any) => {
            const { rows } = await connectionProxy.query(sql);
            return rows;
          },

          many: async (sql: any) => {
            const { rows } = await connectionProxy.query(sql);
            if (rows.length === 0) {
              throw new Error('No rows returned');
            }
            return rows;
          }
        };

        // Execute the callback with our proxy
        return callback(connectionProxy as any);
      }
    };
  }

  query(sql: string, params: any[] = []): any[] {
    return this.db.prepare(sql).all(...params);
  }

  exec(sql: string, params: any[] = []): void {
    this.db.prepare(sql).run(...params);
  }

  get(sql: string, params: any[] = []): any {
    return this.db.prepare(sql).get(...params);
  }

  run(sql: string, params: any[] = []): any {
    return this.db.prepare(sql).run(...params);
  }

  transaction<T>(callback: (db: Database) => T): T {
    // 处理同步回调
    if (callback.constructor.name !== 'AsyncFunction') {
      return this.db.transaction(callback)(this.db);
    }

    // 处理异步回调
    const asyncWrapper = (db: Database): T => {
      try {
        // 执行异步回调，但不等待Promise
        const result = callback(db) as any;

        // 如果返回的是Promise，我们需要处理它
        if (result && typeof result.then === 'function') {
          // 返回一个非Promise值，SQLite事务会正常提交
          // 实际的Promise会在事务外部被处理
          return {} as T;
        }

        return result;
      } catch (error) {
        this.logger.error('Transaction error:', error);
        throw error;
      }
    };

    // 执行事务
    const txResult = this.db.transaction(asyncWrapper)(this.db);

    // 如果原始回调是异步的，我们需要手动执行它并返回Promise
    const asyncResult = callback(this.db) as any;
    if (asyncResult && typeof asyncResult.then === 'function') {
      return asyncResult;
    }

    return txResult;
  }

  async connectDatabase() {
    const dbPath = env().SQLITE_DATABASE_PATH;

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.logger.log(`Connecting to SQLite database at ${dbPath}`);

    // Open the database
    this._db = new BetterSqlite3(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? undefined: undefined
    });

    // Enable foreign keys
    this._db.pragma('foreign_keys = ON');

    // Create schema if it doesn't exist
    this.initializeDatabase();

    this.logger.log('SQLite database connected successfully');
  }

  private initializeDatabase() {
    // Create the device_status table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS saito_miner_device_status (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('waiting', 'in-progress', 'connected', 'disconnected', 'failed')),
        up_time_start TEXT,
        up_time_end TEXT,
        reward_address TEXT,
        gateway_address TEXT,
        key TEXT,
        code TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    // Create the tasks table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS saito_miner_tasks (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        total_duration REAL,
        load_duration REAL,
        prompt_eval_count INTEGER,
        prompt_eval_duration REAL,
        eval_count INTEGER,
        eval_duration REAL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'gateway')),
        device_id TEXT,
        FOREIGN KEY (device_id) REFERENCES saito_miner_device_status(id)
      )
    `).run();

    // Create the earnings table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS saito_miner_earnings (
        id TEXT PRIMARY KEY,
        block_rewards REAL NOT NULL DEFAULT 0,
        job_rewards REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'gateway')),
        device_id TEXT,
        task_id TEXT,
        FOREIGN KEY (device_id) REFERENCES saito_miner_device_status(id),
        FOREIGN KEY (task_id) REFERENCES saito_miner_tasks(id)
      )
    `).run();

    // Create triggers to update the updated_at timestamp
    // SQLite doesn't support BEFORE UPDATE triggers like PostgreSQL,
    // so we'll use the SQLite-specific way to handle this

    // For tasks table
    this.db.prepare(`
      CREATE TRIGGER IF NOT EXISTS set_timestamp_tasks
      AFTER UPDATE ON saito_miner_tasks
      FOR EACH ROW
      BEGIN
        UPDATE saito_miner_tasks SET updated_at = datetime('now')
        WHERE id = NEW.id;
      END;
    `).run();

    // For earnings table
    this.db.prepare(`
      CREATE TRIGGER IF NOT EXISTS set_timestamp_earnings
      AFTER UPDATE ON saito_miner_earnings
      FOR EACH ROW
      BEGIN
        UPDATE saito_miner_earnings SET updated_at = datetime('now')
        WHERE id = NEW.id;
      END;
    `).run();

    // For device_status table
    this.db.prepare(`
      CREATE TRIGGER IF NOT EXISTS set_timestamp_device_status
      AFTER UPDATE ON saito_miner_device_status
      FOR EACH ROW
      BEGIN
        UPDATE saito_miner_device_status SET updated_at = datetime('now')
        WHERE id = NEW.id;
      END;
    `).run();
  }

  async onModuleDestroy() {
    if (this._isClosing || this._db === null) {
      return;
    }

    this._isClosing = true;
    try {
      this._db.close();
    } catch (error) {
      console.error('Error closing database connection:', error);
    } finally {
      this._db = null;
      this._isClosing = false;
    }
  }
}

const PersistentServiceProvider = {
  provide: PersistentService,
  useFactory: async () => {
    const service = new DefaultPersistentService();
    await service.connectDatabase();
    return service;
  },
};

export default PersistentServiceProvider;
