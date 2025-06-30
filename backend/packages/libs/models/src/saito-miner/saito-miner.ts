import { z } from 'zod';

// Device Credentials
export const DeviceCredentials = z.object({
  code: z.string(),
  gateway_address: z.string(),
  reward_address: z.string(),
  basePath: z.string().optional()
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
  status: DeviceStatus.shape.status
});

// Miner schemas
export const MinerEarning = z.object({
  total_block_rewards: z.number(),
  total_job_rewards: z.number()
});

export const MinerDeviceStatus = z.object({
  name: z.string(),
  status: DeviceStatus.shape.status,
  up_time_start: z.number().nullable(),
  up_time_end: z.number().nullable()
});

export const MinerUptime = z.object({
  uptime_percentage: z.number()
});

export const MinerEarningsHistory = z.object({
  daily_earning: z.number(),
  date: z.string()
});

export const MinerDailyRequests = z.object({
  request_count: z.number(),
  date: z.string()
});

export const MinerTaskActivity = z.object({
  date: z.string(),
  task_count: z.number()
});

export const TaskCount = z.object({
  count: z.number()
});

export const Task = z.object({
  id: z.string().uuid(),
  model: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  total_duration: z.number().nullable(),
  load_duration: z.number().nullable(),
  prompt_eval_count: z.number().nullable(),
  prompt_eval_duration: z.number().nullable(),
  eval_count: z.number().nullable(),
  eval_duration: z.number().nullable(),
  source: z.enum(['local', 'gateway']).default('local'),
  device_id: z.string().uuid().nullable(),
  // 新增字段，用于处理任务收益
  earnings: z.number().optional(),
  block_rewards: z.number().optional(),
  job_rewards: z.number().optional()
});

export const Earning = z.object({
  id: z.string().uuid(),
  block_rewards: z.number(),
  job_rewards: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source: z.enum(['local', 'gateway']).default('local'),
  device_id: z.string().uuid().nullable(),
  task_id: z.string().uuid().nullable(),
  // 新增字段，用于处理收益详情
  amount: z.number().optional(),
  type: z.enum(['task', 'block', 'referral']).optional(),
  status: z.enum(['pending', 'confirmed', 'rejected']).optional(),
  transaction_hash: z.string().optional(),
  description: z.string().optional()
});

export const TaskResult = z.object({
  id: z.string().uuid(),
  model: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  total_duration: z.number().nullable(),
  load_duration: z.number().nullable(),
  prompt_eval_count: z.number().nullable(),
  prompt_eval_duration: z.number().nullable(),
  eval_count: z.number().nullable(),
  eval_duration: z.number().nullable(),
  source: z.enum(['local', 'gateway']).default('local'),
  device_id: z.string().uuid().nullable()
});

export const EarningResult = z.object({
  id: z.string().uuid(),
  block_rewards: z.number(),
  job_rewards: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source: z.enum(['local', 'gateway']).default('local'),
  device_id: z.string().uuid().nullable(),
  task_id: z.string().uuid().nullable()
});

// Request/Response schemas
export const CreateTaskRequest = z.object({
  model: z.string(),
  device_id: z.string().uuid().optional()
});

export const TaskHistoryResponse = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  tasks: z.array(Task)
});

export const Summary = z.object({
  earning_info: MinerEarning,
  device_info: z.object({
    name: z.string(),
    status: z.enum(['connected', 'disconnected'])
  }),
  statistics: z.object({
    up_time_percentage: z.number(),
    earning_serials: z.array(z.number()),
    request_serials: z.array(z.number()),
    task_activity: z.array(z.number())
  })
});

export const ConnectTaskListRequest = z.object({
  gateway_address: z.string(),
  key: z.string(),
  page: z.number(),
  limit: z.number()
});

export const ConnectTaskListResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: z.object({
    data: z.array(z.any()),
    total: z.number()
  }).optional()
});

// DeviceStatusModule types
export const DeviceStatusModule = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed']),
  reward_address: z.string().nullable(),
  gateway_address: z.string().nullable(),
  code: z.string().nullable(),
  up_time_start: z.string().nullable(),
  up_time_end: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const DeviceStatusList = z.array(DeviceStatusModule);

export const DeviceStatusResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: DeviceStatusModule.optional()
});

export const DeviceStatusListResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: DeviceStatusList.optional()
});

export const DeviceStatusUpdateRequest = z.object({
  name: z.string(),
  status: z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed']),
  reward_address: z.string(),
  gateway_address: z.string(),
  key: z.string(),
  code: z.string()
});

export const DeviceStatusUpdateResponse = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: DeviceStatusModule.optional()
});

// Database row types
export const DeviceStatusRow = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed']),
  reward_address: z.string().nullable(),
  gateway_address: z.string().nullable(),
  key: z.string().nullable(),
  code: z.string().nullable(),
  up_time_start: z.string().nullable(),
  up_time_end: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const TaskRow = z.object({
  id: z.string(),
  device_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  status: z.enum(['failed', 'pending', 'running', 'completed', 'cancelled']),
  model: z.string(),
  total_duration: z.number().nullable(),
  load_duration: z.number().nullable(),
  prompt_eval_count: z.number().nullable(),
  prompt_eval_duration: z.number().nullable(),
  eval_count: z.number().nullable(),
  eval_duration: z.number().nullable(),
  source: z.enum(['local', 'gateway']),
  activity: z.string()
});

export const EarningRow = z.object({
  id: z.string(),
  device_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  task_id: z.string().nullable(),
  source: z.enum(['local', 'gateway']),
  block_rewards: z.number(),
  job_rewards: z.number()
});

export const Miner = z.object({
  id: z.string(),
  device_id: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// Type inference
export type TDeviceStatus = z.infer<typeof DeviceStatus>;
export type TDeviceListItem = z.infer<typeof DeviceListItem>;
export type TDeviceCredentials = z.infer<typeof DeviceCredentials>;
export type TMinerEarning = z.infer<typeof MinerEarning>;
export type TMinerDeviceStatus = z.infer<typeof MinerDeviceStatus>;
export type TMinerUptime = z.infer<typeof MinerUptime>;
export type TMinerEarningsHistory = z.infer<typeof MinerEarningsHistory>;
export type TMinerDailyRequests = z.infer<typeof MinerDailyRequests>;
export type TMinerTaskActivity = z.infer<typeof MinerTaskActivity>;
export type TTask = z.infer<typeof Task>;
export type TEarning = z.infer<typeof Earning>;
export type TCreateTaskRequest = z.infer<typeof CreateTaskRequest>;
export type TTaskHistoryResponse = z.infer<typeof TaskHistoryResponse>;
export type TSummary = z.infer<typeof Summary>;
export type TConnectTaskListRequest = z.infer<typeof ConnectTaskListRequest>;
export type TConnectTaskListResponse = z.infer<typeof ConnectTaskListResponse>;
export type TTaskResult = z.infer<typeof TaskResult>;
export type TEarningResult = z.infer<typeof EarningResult>;
export type TDeviceStatusRow = z.infer<typeof DeviceStatusRow>;
export type TTaskRow = z.infer<typeof TaskRow>;
export type TEarningRow = z.infer<typeof EarningRow>;
export type TTaskCount = z.infer<typeof TaskCount>;
export type TMiner = z.infer<typeof Miner>;

// Export types for DeviceStatusModule
export type TDeviceStatusModule = z.infer<typeof DeviceStatusModule>;
export type TDeviceStatusList = z.infer<typeof DeviceStatusList>;
export type TDeviceStatusResponse = z.infer<typeof DeviceStatusResponse>;
export type TDeviceStatusListResponse = z.infer<typeof DeviceStatusListResponse>;
export type TDeviceStatusUpdateRequest = z.infer<typeof DeviceStatusUpdateRequest>;
export type TDeviceStatusUpdateResponse = z.infer<typeof DeviceStatusUpdateResponse>;

export const RegistrationResponse = z.object({
  success: z.boolean(),
  error: z.string(),
  node_id: z.string().optional(),
  name: z.string().optional()
});

// Registration Response Type
export type TRegistrationResponse = z.infer<typeof RegistrationResponse>;

// DeviceConfig types
export const DeviceConfig = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  rewardAddress: z.string(),
  gatewayAddress: z.string(),
  key: z.string(),
  code: z.string(),
  isRegistered: z.boolean()
});

export const HeartbeatData = z.object({
  cpuLoad: z.object({
    currentLoad: z.number()
  }),
  memoryInfo: z.object({
    used: z.number(),
    total: z.number()
  }),
  gpuInfo: z.object({
    controllers: z.array(z.object({
      utilizationGpu: z.number()
    }))
  }),
  ipAddress: z.string(),
  deviceType: z.string(),
  deviceModel: z.string(),
  deviceInfo: z.string(),
  deviceConfig: DeviceConfig
});

// Export types for DeviceConfig
export type TDeviceConfig = z.infer<typeof DeviceConfig>;
export type THeartbeatData = z.infer<typeof HeartbeatData>;

export const MinerModel = {
  DeviceStatus,
  DeviceListItem,
  DeviceCredentials,
  MinerEarning,
  MinerDeviceStatus,
  MinerUptime,
  MinerEarningsHistory,
  MinerDailyRequests,
  MinerTaskActivity,
  TaskCount,
  Task,
  Earning,
  TaskResult,
  EarningResult,
  CreateTaskRequest,
  TaskHistoryResponse,
  Summary,
  ConnectTaskListRequest,
  ConnectTaskListResponse,
  DeviceStatusModule,
  DeviceStatusList,
  DeviceStatusResponse,
  DeviceStatusListResponse,
  DeviceStatusUpdateRequest,
  DeviceStatusUpdateResponse,
  DeviceStatusRow,
  TaskRow,
  EarningRow,
  RegistrationResponse,
  HeartbeatData,
  DeviceConfig,
  Miner
} as const;