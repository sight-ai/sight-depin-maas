import { Level } from 'level';

// Device Status interfaces
export interface DeviceStatus {
  id: string;
  name: string;
  status: 'waiting' | 'in-progress' | 'connected' | 'disconnected' | 'failed';
  up_time_start?: string;
  up_time_end?: string;
  reward_address?: string;
  gateway_address?: string;
  key?: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

// Task interfaces
export interface Task {
  id: string;
  model: string;
  created_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  updated_at: string;
  source: 'local' | 'gateway';
  device_id: string;
}

// Earning interfaces
export interface Earning {
  id: string;
  block_rewards: number;
  job_rewards: number;
  created_at: string;
  updated_at: string;
  source: 'local' | 'gateway';
  device_id: string;
  task_id: string;
}

// Batch operation interfaces
export interface BatchOperation {
  type: 'put' | 'del';
  table: 'device_status' | 'tasks' | 'earnings';
  key: string;
  value?: DeviceStatus | Task | Earning;
}

// Level DB sublevel type
export type LevelSubLevel = ReturnType<Level['sublevel']>;

// Query result interfaces
export interface QueryResult {
  rows: unknown[];
}

export interface DatabaseConnection {
  query: (sql: string, values?: unknown[]) => Promise<QueryResult>;
  one: (sql: string) => Promise<unknown>;
  maybeOne: (sql: string) => Promise<unknown | null>;
  any: (sql: string) => Promise<unknown[]>;
  many: (sql: string) => Promise<unknown[]>;
}

// Schema metadata interfaces
export interface FieldSchema {
  type: string;
  primaryKey?: boolean;
  required?: boolean;
  defaultValue?: string | number;
  enum?: string[];
  foreignKey?: {
    table: string;
    field: string;
  };
}

export interface TableSchema {
  name: string;
  fields: Record<string, FieldSchema>;
}

export interface DatabaseMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}
