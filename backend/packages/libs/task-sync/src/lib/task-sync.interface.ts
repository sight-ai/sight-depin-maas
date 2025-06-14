import { z } from 'zod';
import { Task, Earning } from "@saito/models";

// Service Tokens
export const TASK_SYNC_SERVICE = Symbol('TASK_SYNC_SERVICE');
export const TASK_MANAGER_SERVICE = Symbol('TASK_MANAGER_SERVICE');
export const EARNINGS_MANAGER_SERVICE = Symbol('EARNINGS_MANAGER_SERVICE');
export const GATEWAY_CLIENT_SERVICE = Symbol('GATEWAY_CLIENT_SERVICE');

// Core Types
export type TaskType = z.infer<typeof Task>;
export type EarningType = z.infer<typeof Earning>;

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  message?: string;
}

export interface SyncRequestParams {
  deviceId: string;
  gatewayAddress: string;
  authKey: string;
  page?: number;
  pageSize?: number;
}

export interface GatewayResponse<T> {
  success: boolean;
  error?: string;
  data?: {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}

// Abstract Interfaces
export interface TTaskManager {
  createTask(task: TaskType): Promise<void>;
  updateTask(taskId: string, updates: Partial<TaskType>): Promise<void>;
  findTask(taskId: string): Promise<TaskType | null>;
  getAllTaskIds(): Promise<Set<string>>;
  updateTaskStatuses(): Promise<void>;
}

export interface TEarningsManager {
  createEarning(earning: EarningType): Promise<void>;
  updateEarning(earningId: string, updates: Partial<EarningType>): Promise<void>;
  findEarning(earningId: string): Promise<EarningType | null>;
  validateTaskReference(taskId: string): Promise<boolean>;
}

export interface TGatewayClient {
  fetchTasks(params: SyncRequestParams): Promise<TaskType[]>;
  fetchEarnings(params: SyncRequestParams): Promise<EarningType[]>;
}

export interface TTaskSyncService {
  syncTasks(): Promise<SyncResult>;
  syncEarnings(): Promise<SyncResult>;
}