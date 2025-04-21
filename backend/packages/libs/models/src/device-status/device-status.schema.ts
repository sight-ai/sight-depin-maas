import { z } from "zod";

export const DeviceStatusSchema = z.object({
  device_id: z.string(),
  name: z.string(),
  status: z.enum(["online", "offline"]),
  up_time_start: z.string().nullable(),
  up_time_end: z.string().nullable(),
  reward_address: z.string().nullable(),
  gateway_address: z.string().nullable(),
  key: z.string().nullable(),
  code: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;

export const UpdateDeviceStatusSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  status: z.enum(["online", "offline"]),
  rewardAddress: z.string(),
  gatewayAddress: z.string(),
  key: z.string(),
  code: z.string(),
  upTimeStart: z.string().nullable(),
  upTimeEnd: z.string().nullable(),
  now: z.string()
});

export const FindDeviceStatusSchema = z.object({
  name: z.string(),
  status: z.enum(["online", "offline"]),
  rewardAddress: z.string(),
  gatewayAddress: z.string()
});

export const MarkDevicesOfflineSchema = z.object({
  thresholdTimeStr: z.string()
});

export const FindDeviceListSchema = z.object({  
  deviceId: z.string(),
  name: z.string(),
  status: z.enum(["online", "offline"]),
});

export type DeviceListItem = z.infer<typeof FindDeviceListSchema>;

export const FindCurrentDeviceSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  status: z.enum(["online", "offline"]),
  rewardAddress: z.string().nullable(),
  gatewayAddress: z.string().nullable()
});

export type CurrentDevice = z.infer<typeof FindCurrentDeviceSchema>;

// 用于结果查询的模式
export const TaskResultSchema = z.object({
  id: z.string(),
  model: z.string(),
  status: z.string(),
  createdAt: z.string()
});

export type TaskResult = z.infer<typeof TaskResultSchema>;

export const EarningResultSchema = z.object({
  id: z.string(),
  blockRewards: z.number(),
  jobRewards: z.number(),
  createdAt: z.string(),
  taskId: z.string().nullable()
});

export type EarningResult = z.infer<typeof EarningResultSchema>;

export const DeviceCredentialsSchema = z.object({
  key: z.string(),
  code: z.string(),
  gateway_address: z.string()
});

export type DeviceCredentials = z.infer<typeof DeviceCredentialsSchema>;

export const DeviceSchema = {
  DeviceStatusSchema,
  UpdateDeviceStatusSchema,
  FindDeviceStatusSchema,
  MarkDevicesOfflineSchema,
  FindDeviceListSchema,
  FindCurrentDeviceSchema,
  TaskResultSchema,
  EarningResultSchema,
  DeviceCredentialsSchema
};