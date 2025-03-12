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
  earning_serials: z.array(z.number())
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
});

export const CreateTaskRequest = z.object({
  model: z.string(),
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

export const MinerModel = {
  earning_info: EarningInfo,
  device_info: DeviceInfo,
  statistics: Statistics,
  task: Task,
  summary: Summary,

  // API
  create_task_request: CreateTaskRequest,
  task_history_response: TaskHistoryResponse
};

/**
 * Utility type to extract the inferred type from the model.
 */
export type ModelOfMiner<T extends keyof typeof MinerModel> =
  (typeof MinerModel)[T] extends z.ZodType<infer O> ? O : never;
