import { z } from 'zod';

/**
 * 系统信息相关的 Zod Schema 定义
 * 
 * 包含：
 * 1. 基础系统组件信息
 * 2. 完整系统信息
 * 3. 心跳数据格式
 * 4. 设备状态信息
 */

/**
 * CPU 信息 Schema
 */
export const CpuInfoSchema = z.object({
  model: z.string().describe('CPU 型号'),
  cores: z.number().int().positive().describe('CPU 核心数'),
  threads: z.number().int().positive().describe('CPU 线程数'),
  usage: z.number().min(0).max(100).describe('CPU 使用率百分比'),
  temperature: z.number().optional().describe('CPU 温度（摄氏度）'),
  frequency: z.number().positive().optional().describe('CPU 频率（MHz）'),
  architecture: z.string().optional().describe('CPU 架构')
});

/**
 * 内存信息 Schema
 */
export const MemoryInfoSchema = z.object({
  total: z.number().positive().describe('总内存 (GB)'),
  used: z.number().min(0).describe('已使用内存 (GB)'),
  available: z.number().min(0).describe('可用内存 (GB)'),
  usage: z.number().min(0).max(100).describe('内存使用率百分比'),
  swapTotal: z.number().min(0).optional().describe('交换空间总量 (GB)'),
  swapUsed: z.number().min(0).optional().describe('已使用交换空间 (GB)')
});

/**
 * GPU 信息 Schema
 */
export const GpuInfoSchema = z.object({
  id: z.number().int().nonnegative().describe('GPU ID'),
  name: z.string().describe('GPU 名称'),
  vendor: z.string().describe('GPU 厂商'),
  memory: z.object({
    total: z.number().positive().describe('总显存 (GB)'),
    used: z.number().min(0).describe('已使用显存 (GB)'),
    usage: z.number().min(0).max(100).describe('显存使用率百分比')
  }).describe('显存信息'),
  temperature: z.number().optional().describe('GPU 温度（摄氏度）'),
  utilization: z.number().min(0).max(100).optional().describe('GPU 利用率百分比'),
  powerDraw: z.number().min(0).optional().describe('功耗 (W)'),
  isAppleSilicon: z.boolean().optional().describe('是否为 Apple Silicon'),
  driverVersion: z.string().optional().describe('驱动版本'),
  cudaVersion: z.string().optional().describe('CUDA 版本')
});

/**
 * 磁盘信息 Schema
 */
export const DiskInfoSchema = z.object({
  total: z.number().positive().describe('总容量 (GB)'),
  used: z.number().min(0).describe('已使用容量 (GB)'),
  available: z.number().min(0).describe('可用容量 (GB)'),
  usage: z.number().min(0).max(100).describe('磁盘使用率百分比'),
  filesystem: z.string().optional().describe('文件系统类型'),
  mountPoint: z.string().optional().describe('挂载点')
});

/**
 * 网络信息 Schema
 */
export const NetworkInfoSchema = z.object({
  inbound: z.number().min(0).describe('入站流量 (Mbps)'),
  outbound: z.number().min(0).describe('出站流量 (Mbps)'),
  interfaces: z.array(z.object({
    name: z.string().describe('网络接口名称'),
    type: z.string().describe('接口类型'),
    speed: z.number().min(0).optional().describe('接口速度 (Mbps)'),
    isUp: z.boolean().describe('接口是否启用')
  })).optional().describe('网络接口列表')
});

/**
 * 操作系统信息 Schema
 */
export const OsInfoSchema = z.object({
  name: z.string().describe('操作系统名称'),
  version: z.string().describe('版本号'),
  arch: z.string().describe('架构'),
  platform: z.string().describe('平台'),
  uptime: z.number().min(0).describe('运行时间（秒）'),
  hostname: z.string().optional().describe('主机名'),
  kernel: z.string().optional().describe('内核版本')
});

/**
 * 完整的系统信息 Schema
 */
export const SystemInfoSchema = z.object({
  cpu: CpuInfoSchema.describe('CPU 信息'),
  memory: MemoryInfoSchema.describe('内存信息'),
  gpus: z.array(GpuInfoSchema).describe('GPU 信息列表'),
  disk: DiskInfoSchema.describe('磁盘信息'),
  network: NetworkInfoSchema.describe('网络信息'),
  os: OsInfoSchema.describe('操作系统信息'),
  timestamp: z.string().datetime().describe('信息收集时间戳'),
  collectionDuration: z.number().positive().optional().describe('信息收集耗时（毫秒）')
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
  device_info: DeviceDetailInfoSchema.describe('设备详细信息')
});

/**
 * 设备状态枚举 Schema
 */
export const DeviceStatusSchema = z.enum(['online', 'offline', 'error', 'maintenance', 'unknown']);

/**
 * 设备类型枚举 Schema
 */
export const DeviceTypeSchema = z.enum(['macOS', 'Windows', 'Linux', 'Unknown']);

/**
 * 系统信息收集错误 Schema
 */
export const SystemInfoErrorSchema = z.object({
  component: z.enum(['cpu', 'memory', 'gpu', 'disk', 'network', 'os']).describe('错误组件'),
  message: z.string().describe('错误消息'),
  timestamp: z.string().datetime().describe('错误时间戳'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('错误严重程度')
});

/**
 * 系统信息收集器配置 Schema
 */
export const SystemInfoCollectorConfigSchema = z.object({
  cacheTimeout: z.number().positive().describe('缓存超时时间（毫秒）'),
  enableCache: z.boolean().describe('是否启用缓存'),
  enableParallelCollection: z.boolean().describe('是否启用并行收集')
});

// 导出类型
export type CpuInfo = z.infer<typeof CpuInfoSchema>;
export type MemoryInfo = z.infer<typeof MemoryInfoSchema>;
export type GpuInfo = z.infer<typeof GpuInfoSchema>;
export type DiskInfo = z.infer<typeof DiskInfoSchema>;
export type NetworkInfo = z.infer<typeof NetworkInfoSchema>;
export type OsInfo = z.infer<typeof OsInfoSchema>;
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
export type DeviceDetailInfo = z.infer<typeof DeviceDetailInfoSchema>;
export type SystemHeartbeatData = z.infer<typeof SystemHeartbeatDataSchema>;
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
export type SystemInfoError = z.infer<typeof SystemInfoErrorSchema>;
export type SystemInfoCollectorConfig = z.infer<typeof SystemInfoCollectorConfigSchema>;

// 导出 schemas 集合
export const SystemInfoSchemas = {
  CpuInfoSchema,
  MemoryInfoSchema,
  GpuInfoSchema,
  DiskInfoSchema,
  NetworkInfoSchema,
  OsInfoSchema,
  SystemInfoSchema,
  DeviceDetailInfoSchema,
  SystemHeartbeatDataSchema,
  DeviceStatusSchema,
  DeviceTypeSchema,
  SystemInfoErrorSchema,
  SystemInfoCollectorConfigSchema
} as const;
