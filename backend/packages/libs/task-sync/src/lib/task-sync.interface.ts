import { ModelOfMiner } from "@saito/models";

export const TASK_SYNC_SERVICE = Symbol('TASK_SYNC_SERVICE');

export interface TaskSyncService {
  syncTasks(): Promise<void>;
  syncEarnings(): Promise<void>;
} 