import { Database } from 'better-sqlite3';
import { DatabasePool, DatabaseTransactionConnection } from 'slonik';

export abstract class PersistentService {
  abstract get db(): Database;
  abstract query(sql: string, params?: any[]): any[];
  abstract exec(sql: string, params?: any[]): void;
  abstract get(sql: string, params?: any[]): any;
  abstract run(sql: string, params?: any[]): any;
  abstract transaction<T>(callback: (db: Database) => T): T;

  // For backward compatibility with existing code
  abstract get pgPool(): {
    transaction<T>(callback: (connection: DatabaseTransactionConnection) => Promise<T>): Promise<T>;
  };
}
