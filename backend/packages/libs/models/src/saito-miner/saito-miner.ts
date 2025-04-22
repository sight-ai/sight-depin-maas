import { z } from 'zod';

// Device Credentials
export const DeviceCredentials = z.object({
  code: z.string(),
  gateway_address: z.string(),
  reward_address: z.string(),
  key: z.string()
});

// Base DeviceStatus schema
export const DeviceStatus = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed']),
  up_time_start: z.string().datetime().nullable(),
  up_time_end: z.string().datetime().nullable(),
  reward_address: z.string().nullable(),
  gateway_address: z.string().nullable(),
  key: z.string().nullable(),
  code: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Device List Item
export const DeviceListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed'])
});

// Task Result
export const TaskResult = z.object({
  id: z.string().uuid(),
  model: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  created_at: z.string().datetime()
});

// Earning Result
export const EarningResult = z.object({
  id: z.string().uuid(),
  block_rewards: z.number(),
  job_rewards: z.number(),
  created_at: z.string().datetime(),
  task_id: z.string().uuid().nullable()
});

// Base Tasks schema
export const Task = z.object({
  id: z.string().uuid(),
  model: z.string(),
  created_at: z.string().datetime(),
  status: z.string(),
  total_duration: z.number().nullable(),
  load_duration: z.number().nullable(),
  prompt_eval_count: z.number().nullable(),
  prompt_eval_duration: z.number().nullable(),
  eval_count: z.number().nullable(),
  eval_duration: z.number().nullable(),
  updated_at: z.string().datetime(),
  source: z.enum(['local', 'gateway']).default('local'),
  device_id: z.string().uuid().nullable(),
});

// Base Earnings schema
export const Earning = z.object({
  id: z.string().uuid(),
  block_rewards: z.number().default(0),
  job_rewards: z.number().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source: z.enum(['local', 'gateway']).default('local'),
  device_id: z.string().uuid().nullable(),
  task_id: z.string().uuid().nullable(),
});

// Create requests
export const CreateDeviceStatusRequest = DeviceStatus.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const CreateTaskRequest = Task.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const CreateEarningRequest = Earning.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

// Update requests
export const UpdateDeviceStatusRequest = CreateDeviceStatusRequest.partial();
export const UpdateTaskRequest = CreateTaskRequest.partial();
export const UpdateEarningRequest = CreateEarningRequest.partial();

// List responses
export const DeviceStatusList = z.array(DeviceStatus);
export const TaskList = z.array(Task);
export const EarningList = z.array(Earning);

// Query filters
export const DeviceStatusFilter = z.object({
  status: z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed']).optional(),
  name: z.string().optional(),
  reward_address: z.string().optional(),
  gateway_address: z.string().optional(),
});

export const TaskFilter = z.object({
  model: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  source: z.enum(['local', 'gateway']).optional(),
  device_id: z.string().uuid().optional(),
});

export const EarningFilter = z.object({
  source: z.enum(['local', 'gateway']).optional(),
  device_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
});

// Delete responses
export const DeleteResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Type inference helpers
export type TDeviceStatus = z.infer<typeof DeviceStatus>;
export type TDeviceListItem = z.infer<typeof DeviceListItem>;
export type TDeviceCredentials = z.infer<typeof DeviceCredentials>;
export type TTaskResult = z.infer<typeof TaskResult>;
export type TEarningResult = z.infer<typeof EarningResult>;
export type TTask = z.infer<typeof Task>;
export type TEarning = z.infer<typeof Earning>;

// Registration Response Type
export type TRegistrationResponse = {
  success: boolean;
  error: string;
  node_id?: string;
  name?: string;
}; 