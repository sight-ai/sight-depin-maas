import { z } from 'zod';
import { Task, Earning } from "@saito/models";

export const TASK_SYNC_SERVICE = Symbol('TASK_SYNC_SERVICE');

export interface TaskSyncService {
  syncTasks(): Promise<void>;
  syncEarnings(): Promise<void>;
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