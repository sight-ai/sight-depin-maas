/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

// 设备信息
export const DeviceInfoSchema = z.object({
  name: z.string(),
  status: z.enum(['connected', 'disconnected'])
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

// 收益信息
export const EarningInfoSchema = z.object({
  total_block_rewards: z.number(),
  total_job_rewards: z.number(),
});

export type EarningInfo = z.infer<typeof EarningInfoSchema>;

// 统计数据
export const StatisticsSchema = z.object({
  up_time_percentage: z.number(),
  earning_serials: z.array(z.number()),
  task_activity: z.array(z.number()),
  request_serials: z.array(z.number()),
});

export type Statistics = z.infer<typeof StatisticsSchema>;

// 任务模式
export const TaskSchema = z.object({
  id: z.string(),
  model: z.string(),
  created_at: z.coerce.date().transform((date) => date.toISOString()),
  status: z.enum(['pending','in-progress', 'running', 'succeed', 'completed', 'failed', 'cancelled']),
  total_duration: z.coerce.number().nullable(),
  load_duration: z.coerce.number().nullable(),
  prompt_eval_count: z.coerce.number().nullable(),
  prompt_eval_duration: z.coerce.number().nullable(),
  eval_count: z.coerce.number().nullable(),
  eval_duration: z.coerce.number().nullable(),
  updated_at: z.coerce.date().transform((date) => date.toISOString()),
  source: z.enum(['local', 'gateway']),
  device_id: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

// 创建任务请求
export const CreateTaskRequestSchema = z.object({
  model: z.string(),
  device_id: z.string().optional(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

// 任务历史响应
export const TaskHistoryResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(), 
  tasks: z.array(TaskSchema),
});

export type TaskHistoryResponse = z.infer<typeof TaskHistoryResponseSchema>;

// 收益模式
export const EarningSchema = z.object({
  id: z.string(),
  block_rewards: z.number(),
  job_rewards: z.number(),
  device_id: z.string(),
  task_id: z.string().nullable(),
  created_at: z.coerce.date().transform(date => date.toISOString()),
  updated_at: z.coerce.date().transform(date => date.toISOString()),
  source: z.enum(["local", "gateway"]),
});

export type Earning = z.infer<typeof EarningSchema>;

// 摘要模式
export const SummarySchema = z.object({
  earning_info: EarningInfoSchema,
  device_info: DeviceInfoSchema,
  statistics: StatisticsSchema,
});

export type Summary = z.infer<typeof SummarySchema>;

// 用于数据库查询的模式
export const MinerEarningSchema = z.object({
  total_block_rewards: z.number(),
  total_job_rewards: z.number(),
});

export type MinerEarning = z.infer<typeof MinerEarningSchema>;

export const MinerDeviceStatusSchema = z.object({
  name: z.string(),
  status: z.string(),
  up_time_start: z.number().nullable(),
  up_time_end: z.number().nullable(),
});

export type MinerDeviceStatus = z.infer<typeof MinerDeviceStatusSchema>;

export const MinerUptimeSchema = z.object({
  uptime_percentage: z.number(),
});

export type MinerUptime = z.infer<typeof MinerUptimeSchema>;

export const MinerEarningsHistorySchema = z.object({
  daily_earning: z.number(),
});

export type MinerEarningsHistory = z.infer<typeof MinerEarningsHistorySchema>;

export const MinerTaskActivitySchema = z.object({
  date: z.string(),
  task_count: z.number(),
});

export type MinerTaskActivity = z.infer<typeof MinerTaskActivitySchema>;

export const TaskCountSchema = z.object({
  count: z.number(),
});

export type TaskCount = z.infer<typeof TaskCountSchema>;

export const MinerDailyRequestsSchema = z.object({
  request_count: z.number(),
});

export type MinerDailyRequests = z.infer<typeof MinerDailyRequestsSchema>;

// 导出所有Schema
export const MinerSchema = {
  DeviceInfoSchema,
  EarningInfoSchema,
  StatisticsSchema,
  TaskSchema,
  CreateTaskRequestSchema,
  TaskHistoryResponseSchema,
  EarningSchema,
  SummarySchema,
  MinerEarningSchema,
  MinerDeviceStatusSchema,
  MinerUptimeSchema,
  MinerEarningsHistorySchema,
  MinerTaskActivitySchema,
  TaskCountSchema,
  MinerDailyRequestsSchema
};

/**
 * 用于从schema中提取类型的工具类型
 */
export type ModelOfMiner<T extends keyof typeof MinerSchema> =
  (typeof MinerSchema)[T] extends z.ZodType<infer O> ? O : never;
