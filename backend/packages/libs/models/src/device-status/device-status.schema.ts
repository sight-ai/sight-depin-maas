import { z } from "zod";

// 定义设备状态数据结构
export const DeviceStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["online", "offline"]),
  deviceId: z.string(),
  up_time_start: z.number().nullable(),
  up_time_end: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// 设备状态类型
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;