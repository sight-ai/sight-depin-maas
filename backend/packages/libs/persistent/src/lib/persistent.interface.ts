import { DatabasePool, DatabaseTransactionConnection } from 'slonik';

export abstract class PersistentService {
  abstract get db(): any;
  abstract get deviceStatusDb(): any;
  abstract get tasksDb(): any;
  abstract get earningsDb(): any;
  abstract query(sql: string, params?: any[]): any[];
  abstract exec(sql: string, params?: any[]): void;
  abstract queryOne(sql: string, params?: any[]): any;
  abstract run(sql: string, params?: any[]): any;
  abstract transaction<T>(callback: (db: any) => T): T;

  // For backward compatibility with existing code
  abstract get pgPool(): {
    transaction<T>(callback: (connection: DatabaseTransactionConnection) => Promise<T>): Promise<T>;
  };
}
