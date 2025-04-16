/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

export const DeviceInfo = z.object({
  name: z.string(),
  status: z.enum(['connected', 'disconnected'])
})

export const EarningInfo = z.object({
  total_block_rewards: z.number(),
  total_job_rewards: z.number(),
})

export const Statistics = z.object({
  up_time_percentage: z.number(),
  earning_serials: z.array(z.number()),
  task_activity: z.array(z.number()),
  request_serials: z.array(z.number()),
})

export const Task = z.object({
  id: z.string(),
  model: z.string(),
  created_at: z.coerce.date().transform((date) => date.toISOString()),
  status: z.enum(['in-progress', 'failed', 'succeed']),
  total_duration: z.coerce.number().optional(),
  load_duration: z.coerce.number().optional(),
  prompt_eval_count: z.coerce.number().optional(),
  prompt_eval_duration: z.coerce.number().optional(),
  eval_count: z.coerce.number().optional(),
  eval_duration: z.coerce.number().optional(),
  updated_at: z.coerce.date().transform((date) => date.toISOString()),
  source: z.enum(['local', 'gateway']),
});

export const CreateTaskRequest = z.object({
  id: z.string().optional(),
  model: z.string(),
  created_at: z.coerce.date().transform((date) => date.toISOString()),
  status: z.enum(['in-progress', 'failed', 'succeed']),
  total_duration: z.coerce.number().optional(),
  load_duration: z.coerce.number().optional(),
  prompt_eval_count: z.coerce.number().optional(),
  prompt_eval_duration: z.coerce.number().optional(),
  eval_count: z.coerce.number().optional(),
  eval_duration: z.coerce.number().optional(),
  updated_at: z.coerce.date().transform((date) => date.toISOString()),
})

export const TaskHistoryResponse = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(), // Total number of tasks across all pages
  tasks: z.array(Task),
});

export const Summary = z.object({
  earning_info: EarningInfo,
  device_info: DeviceInfo,
  statistics: Statistics,
})


// 定义收益信息类型
const MinerEarningSchema = z.object({
  total_block_rewards: z.number(),
  total_job_rewards: z.number(),
});

// 定义设备状态类型
const MinerDeviceStatusSchema = z.object({
  name: z.string(),
  status: z.string(),
  up_time_start: z.number().nullable(),
  up_time_end: z.number().nullable(),
});

// 定义运行时间统计
const MinerUptimeSchema = z.object({
  uptime_percentage: z.number(),
});

// 定义收益记录
const MinerEarningsHistorySchema = z.object({
  daily_earning: z.number(),
});

// 定义任务活动记录
const MinerTaskActivitySchema = z.object({
  date: z.string(),
  task_count: z.number(),
});

// 定义任务请求
const MinerTaskSchema = z.object({
  id: z.string(),
  model: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  status: z.string(),
  total_duration: z.number(),
  load_duration: z.number(),
  prompt_eval_count: z.number(),
  prompt_eval_duration: z.number(),
  eval_count: z.number(),
  eval_duration: z.number(),
});

const TaskCountSchema = z.object({
  count: z.number(),
});

const MinerDailyRequestsSchema = z.object({
  request_count: z.number(),
});

export const MinerModel = {
  earning_info: EarningInfo,
  device_info: DeviceInfo,
  statistics: Statistics,
  task: Task,
  summary: Summary,
  minerEarning: MinerEarningSchema,
  minerDeviceStatus: MinerDeviceStatusSchema,
  minerUptime: MinerUptimeSchema,
  minerEarningsHistory: MinerEarningsHistorySchema,
  minerTaskActivity: MinerTaskActivitySchema,
  minerTask: MinerTaskSchema,
  taskCount: TaskCountSchema,
  minerDailyRequests: MinerDailyRequestsSchema,
  // API
  create_task_request: CreateTaskRequest,
  task_history_response: TaskHistoryResponse
};

/**
 * Utility type to extract the inferred type from the model.
 */
export type ModelOfMiner<T extends keyof typeof MinerModel> =
  (typeof MinerModel)[T] extends z.ZodType<infer O> ? O : never;
