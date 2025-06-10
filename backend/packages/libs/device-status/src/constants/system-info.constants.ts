import { z } from 'zod';
import {
  SystemInfo,
  SystemInfoCollectorConfig,
  SystemHeartbeatData,
  SystemInfoSchema,
  SystemHeartbeatDataSchema
} from '@saito/models';

// ========================================
// 默认值和常量
// ========================================

/**
 * 默认系统信息值
 */
export const DEFAULT_SYSTEM_INFO: SystemInfo = {
  cpu: {
    model: 'Unknown CPU',
    cores: 1,
    threads: 1,
    usage: 0
  },
  memory: {
    total: 8,
    used: 4,
    available: 4,
    usage: 50
  },
  gpus: [],
  disk: {
    total: 100,
    used: 50,
    available: 50,
    usage: 50
  },
  network: {
    inbound: 0,
    outbound: 0
  },
  os: {
    name: 'Unknown OS',
    version: '0.0.0',
    arch: 'unknown',
    platform: 'unknown',
    uptime: 0
  },
  timestamp: new Date().toISOString()
};

/**
 * 默认心跳配置
 */
export const DEFAULT_HEARTBEAT_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  scheduledInterval: '*/5 * * * * *', // 每5秒
  timeout: 10000 // 10秒超时
};

/**
 * 默认系统信息收集器配置
 */
export const DEFAULT_COLLECTOR_CONFIG: SystemInfoCollectorConfig = {
  cacheTimeout: 5000, // 5秒缓存
  enableCache: true,
  enableParallelCollection: true
};

/**
 * 系统信息收集器缓存配置
 */
export const CACHE_CONFIG = {
  TIMEOUT: 5000, // 5秒缓存
  ENABLED: true
};

/**
 * 心跳发送配置
 */
export const HEARTBEAT_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒
  TIMEOUT: 10000, // 10秒
  SCHEDULE: '*/5 * * * * *' // 每5秒
};

/**
 * 设备状态检查配置
 */
export const DEVICE_STATUS_CONFIG = {
  CHECK_INTERVAL: '*/30 * * * * *', // 每30秒检查设备状态
  INACTIVE_DURATION: 60000 // 1分钟不活跃则标记为离线
};

/**
 * 网络配置
 */
export const NETWORK_CONFIG = {
  REQUEST_TIMEOUT: 10000, // 10秒
  STATUS_CHECK_TIMEOUT: 2000, // 2秒
  DEFAULT_IP: '127.0.0.1'
};

/**
 * GPU 默认配置
 */
export const GPU_CONFIG = {
  DEFAULT_TEMPERATURE: 30, // 默认温度30°C
  DEFAULT_USAGE: 0.1, // 默认使用率0.1%
  APPLE_SILICON_VENDORS: ['apple']
};

/**
 * 数值格式化配置
 */
export const FORMAT_CONFIG = {
  DECIMAL_PLACES: 2,
  BYTES_TO_GB_DIVISOR: 1024 * 1024 * 1024,
  KBPS_TO_MBPS_DIVISOR: 1024
};

// ========================================
// 验证函数
// ========================================

// 验证函数已迁移到 @saito/models/validators
// 保留重新导出以维持向后兼容性
export {
  validateSystemInfo,
  validateSystemHeartbeatData,
  safeValidateSystemInfo,
  safeValidateSystemHeartbeatData
} from '@saito/models';

/**
 * 验证并格式化数字
 */
export const validateAndFormatNumber = (value: number, min = 0, max = 100): number => {
  const clampedValue = Math.max(min, Math.min(max, value));
  return Number(clampedValue.toFixed(FORMAT_CONFIG.DECIMAL_PLACES));
};

/**
 * 验证 IP 地址格式
 */
export const validateIpAddress = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

/**
 * 验证设备代码格式
 */
export const validateDeviceCode = (code: string): boolean => {
  return code.length > 0 && code.trim() === code;
};

/**
 * 验证网关地址格式
 */
export const validateGatewayAddress = (address: string): boolean => {
  try {
    new URL(address);
    return true;
  } catch {
    return false;
  }
};

// ========================================
// 工具函数
// ========================================

/**
 * 格式化数字
 */
export const formatNumber = (value: number): number => {
  return Number(value.toFixed(FORMAT_CONFIG.DECIMAL_PLACES));
};

/**
 * 字节转 GB
 */
export const bytesToGB = (bytes: number): number => {
  return formatNumber(bytes / FORMAT_CONFIG.BYTES_TO_GB_DIVISOR);
};

/**
 * kbps 转 Mbps
 */
export const kbpsToMbps = (kbps: number): number => {
  return formatNumber(kbps / FORMAT_CONFIG.KBPS_TO_MBPS_DIVISOR);
};

/**
 * 获取当前时间戳（秒）
 */
export const getCurrentTimestamp = (): string => {
  return Math.floor(Date.now() / 1000).toString();
};

/**
 * 检查是否为 Apple Silicon GPU
 */
export const isAppleSiliconGpu = (vendor: string): boolean => {
  return GPU_CONFIG.APPLE_SILICON_VENDORS.some(
    appleVendor => vendor.toLowerCase().includes(appleVendor)
  );
};
