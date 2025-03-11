import { z } from 'zod';
import { task } from './task';

export const taskHistoryResponse = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  tasks: z.array(task)
});

export type TaskHistoryResponse = z.infer<typeof taskHistoryResponse>;
