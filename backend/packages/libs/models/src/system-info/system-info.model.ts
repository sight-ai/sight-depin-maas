import { z } from 'zod';

/**
 * 系统信息相关的 Zod 模型定义
 *
 * 包含：
 * 1. SystemInfo - 完整的系统信息 Schema
 * 2. HeartbeatData - 心跳数据 Schema
 * 3. 各种子组件的 Schema 定义
 */

/**
 * CPU 信息 Schema
 */
export const CpuInfoSchema = z.object({
  model: z.string().describe('CPU 型号'),
  cores: z.number().int().positive().describe('CPU 核心数'),
  threads: z.number().int().positive().describe('CPU 线程数'),
  usage: z.number().min(0).max(100).describe('CPU 使用率百分比'),
  temperature: z.number().optional().describe('CPU 温度（摄氏度）')
});

/**
 * 内存信息 Schema
 */
export const MemoryInfoSchema = z.object({
  total: z.number().positive().describe('总内存 (GB)'),
  used: z.number().min(0).describe('已使用内存 (GB)'),
  usage: z.number().min(0).max(100).describe('内存使用率百分比')
});

/**
 * GPU 信息 Schema
 */
export const GpuInfoSchema = z.object({
  model: z.string().describe('GPU 型号'),
  vendor: z.string().describe('GPU 厂商'),
  memory: z.number().min(0).describe('显存 (GB)'),
  usage: z.number().min(0).max(100).describe('GPU 使用率百分比'),
  temperature: z.number().optional().describe('GPU 温度（摄氏度）'),
  isAppleSilicon: z.boolean().optional().describe('是否为 Apple Silicon')
});

/**
 * 磁盘信息 Schema
 */
export const DiskInfoSchema = z.object({
  total: z.number().positive().describe('总容量 (GB)'),
  used: z.number().min(0).describe('已使用容量 (GB)'),
  usage: z.number().min(0).max(100).describe('磁盘使用率百分比')
});

/**
 * 网络信息 Schema
 */
export const NetworkInfoSchema = z.object({
  inbound: z.number().min(0).describe('入站流量 (Mbps)'),
  outbound: z.number().min(0).describe('出站流量 (Mbps)')
});

/**
 * 操作系统信息 Schema
 */
export const OsInfoSchema = z.object({
  name: z.string().describe('操作系统名称'),
  version: z.string().describe('版本号'),
  arch: z.string().describe('架构'),
  platform: z.string().describe('平台'),
  uptime: z.number().min(0).describe('运行时间（秒）')
});

/**
 * 完整的系统信息 Schema
 */
export const SystemInfoSchema = z.object({
  cpu: CpuInfoSchema,
  memory: MemoryInfoSchema,
  gpu: z.array(GpuInfoSchema),
  disk: DiskInfoSchema,
  network: NetworkInfoSchema,
  os: OsInfoSchema
});

/**
 * 设备详细信息 Schema（用于心跳数据）
 */
export const DeviceDetailInfoSchema = z.object({
  cpu_model: z.string().describe('CPU 型号'),
  cpu_cores: z.number().int().positive().describe('CPU 核心数'),
  cpu_threads: z.number().int().positive().describe('CPU 线程数'),
  ram_total: z.number().positive().describe('总内存 (GB)'),
  ram_used: z.number().min(0).describe('已使用内存 (GB)'),
  ram_available: z.number().min(0).describe('可用内存 (GB)'),
  ram_available_percent: z.number().min(0).max(100).describe('可用内存百分比'),
  gpu_model: z.string().describe('GPU 型号'),
  gpu_vendor: z.string().describe('GPU 厂商'),
  gpu_count: z.number().int().min(0).describe('GPU 数量'),
  gpu_memory: z.number().min(0).describe('GPU 显存 (GB)'),
  gpu_temperature: z.number().describe('GPU 温度'),
  disk_total: z.number().positive().describe('总磁盘容量 (GB)'),
  disk_used: z.number().min(0).describe('已使用磁盘容量 (GB)'),
  disk_available: z.number().min(0).describe('可用磁盘容量 (GB)'),
  disk_available_percent: z.number().min(0).max(100).describe('可用磁盘百分比'),
  network_in_kbps: z.number().min(0).describe('入站网络流量 (kbps)'),
  network_out_kbps: z.number().min(0).describe('出站网络流量 (kbps)'),
  os_info: z.string().describe('操作系统信息'),
  uptime_seconds: z.number().min(0).describe('系统运行时间（秒）')
});

/**
 * 系统心跳数据 Schema
 */
export const SystemHeartbeatDataSchema = z.object({
  code: z.string().describe('设备代码'),
  cpu_usage: z.number().min(0).max(100).describe('CPU 使用率'),
  memory_usage: z.number().min(0).max(100).describe('内存使用率'),
  gpu_usage: z.number().min(0).max(100).describe('GPU 使用率'),
  gpu_temperature: z.number().describe('GPU 温度'),
  network_in_kbps: z.number().min(0).describe('入站网络流量 (kbps)'),
  network_out_kbps: z.number().min(0).describe('出站网络流量 (kbps)'),
  ip: z.string().ip().describe('设备 IP 地址'),
  timestamp: z.string().describe('时间戳'),
  type: z.string().describe('设备类型'),
  model: z.string().describe('设备型号'),
  device_info: DeviceDetailInfoSchema
});

/**
 * 旧版心跳数据 Schema（向后兼容）
 */
export const LegacyHeartbeatDataSchema = z.object({
  code: z.string().describe('设备代码'),
  cpu_usage: z.number().min(0).max(100).describe('CPU 使用率'),
  memory_usage: z.number().min(0).max(100).describe('内存使用率'),
  gpu_usage: z.number().min(0).max(100).describe('GPU 使用率'),
  gpu_temperature: z.number().describe('GPU 温度'),
  model: z.string().describe('设备型号'),
  timestamp: z.string().describe('时间戳')
});

/**
 * 心跳发送结果 Schema
 */
export const HeartbeatResultSchema = z.object({
  new: z.boolean().describe('新版心跳发送结果'),
  legacy: z.boolean().optional().describe('旧版心跳发送结果')
});

/**
 * 心跳状态信息 Schema
 */
export const HeartbeatStatusSchema = z.object({
  isRegistered: z.boolean().describe('是否已注册'),
  lastHeartbeatTime: z.string().optional().describe('最后心跳时间'),
  deviceId: z.string().describe('设备 ID'),
  gatewayAddress: z.string().describe('网关地址')
});

/**
 * 心跳统计信息 Schema
 */
export const HeartbeatStatsSchema = z.object({
  maxRetries: z.number().int().positive().describe('最大重试次数'),
  retryDelay: z.number().positive().describe('重试延迟（毫秒）'),
  isConfigValid: z.boolean().describe('配置是否有效'),
  scheduledInterval: z.string().describe('定时任务间隔')
});

/**
 * 系统信息收集器配置 Schema
 */
export const SystemInfoCollectorConfigSchema = z.object({
  cacheTimeout: z.number().positive().describe('缓存超时时间（毫秒）'),
  enableCache: z.boolean().describe('是否启用缓存'),
  enableParallelCollection: z.boolean().describe('是否启用并行收集')
});

/**
 * 系统设备类型枚举 Schema
 */
export const SystemDeviceTypeSchema = z.enum(['macOS', 'Windows', 'Linux', 'Unknown']);

/**
 * 系统设备状态枚举 Schema
 */
export const SystemDeviceStatusSchema = z.enum(['waiting', 'in-progress', 'connected', 'disconnected', 'failed']);

/**
 * 系统信息收集错误 Schema
 */
export const SystemInfoErrorSchema = z.object({
  component: z.enum(['cpu', 'memory', 'gpu', 'disk', 'network', 'os']).describe('错误组件'),
  message: z.string().describe('错误消息'),
  timestamp: z.string().describe('错误时间戳')
});

// ========================================
// 类型导出（从 Zod Schema 推导）
// ========================================

export type CpuInfo = z.infer<typeof CpuInfoSchema>;
export type MemoryInfo = z.infer<typeof MemoryInfoSchema>;
export type GpuInfo = z.infer<typeof GpuInfoSchema>;
export type DiskInfo = z.infer<typeof DiskInfoSchema>;
export type NetworkInfo = z.infer<typeof NetworkInfoSchema>;
export type OsInfo = z.infer<typeof OsInfoSchema>;
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
export type DeviceDetailInfo = z.infer<typeof DeviceDetailInfoSchema>;
export type SystemHeartbeatData = z.infer<typeof SystemHeartbeatDataSchema>;
export type LegacyHeartbeatData = z.infer<typeof LegacyHeartbeatDataSchema>;
export type HeartbeatResult = z.infer<typeof HeartbeatResultSchema>;
export type HeartbeatStatus = z.infer<typeof HeartbeatStatusSchema>;
export type HeartbeatStats = z.infer<typeof HeartbeatStatsSchema>;
export type SystemInfoCollectorConfig = z.infer<typeof SystemInfoCollectorConfigSchema>;
export type SystemDeviceType = z.infer<typeof SystemDeviceTypeSchema>;
export type SystemDeviceStatus = z.infer<typeof SystemDeviceStatusSchema>;
export type SystemInfoError = z.infer<typeof SystemInfoErrorSchema>;


