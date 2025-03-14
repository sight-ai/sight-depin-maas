import { z } from "zod";

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

export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;

export const UpdateDeviceStatusSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  status: z.enum(["online", "offline"]),
  now: z.string()
});

export const FindDeviceStatusSchema = z.object({
  name: z.string(),
  status: z.enum(["online", "offline"]),
});

export const MarkDevicesOfflineSchema = z.object({
  thresholdTimeStr: z.string()
});

export const DeviceSchema = {
  DeviceStatusSchema,
  UpdateDeviceStatusSchema,
  FindDeviceStatusSchema,
  MarkDevicesOfflineSchema
}