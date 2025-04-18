/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

/**
 * Gateway API响应结构
 */
export const GatewayResponseSchema = z.object({
  data: z.array(z.any()).optional(),
  code: z.number(),
  message: z.string()
});

/**
 * 任务类型定义
 */
export const TaskSchema = z.object({
  id: z.string(),
  model: z.string(),
  created_at: z.string(),
  status: z.string(),
  total_duration: z.number(),
  load_duration: z.number(),
  prompt_eval_count: z.number(),
  prompt_eval_duration: z.number(),
  eval_count: z.number(),
  eval_duration: z.number(),
  updated_at: z.string(),
  device_id: z.string(),
});

/**
 * 收益类型定义
 */
export const EarningSchema = z.object({
  id: z.string(),
  block_rewards: z.number(),
  job_rewards: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  device_id: z.string(),
  task_id: z.string(),
});

/**
 * 同步状态定义
 */
export const SyncStatusSchema = z.object({
  lastSyncTime: z.string().nullable(),
  syncedItems: z.number(),
  status: z.enum(['success', 'error', 'pending']),
  message: z.string().optional()
});

/**
 * 设备在线状态
 */
export const DeviceStatusSchema = z.object({
  isRegistered: z.boolean(),
  isOnline: z.boolean(),
  lastSeen: z.string().nullable(),
});

/**
 * 导出所有Schema
 */
export const TaskSyncSchema = {
  GatewayResponse: GatewayResponseSchema,
  Task: TaskSchema,
  Earning: EarningSchema,
  SyncStatus: SyncStatusSchema,
  DeviceStatus: DeviceStatusSchema,
};

/**
 * 使用Schema获取类型的工具类型
 */
export type ModelOfTaskSync<T extends keyof typeof TaskSyncSchema> =
  (typeof TaskSyncSchema)[T] extends z.ZodType<infer O> ? O : never; 