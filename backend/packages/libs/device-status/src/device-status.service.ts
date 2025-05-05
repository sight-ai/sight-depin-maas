import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import * as R from 'ramda';
import { DeviceStatusRepository } from "./device-status.repository";
import { DatabaseTransactionConnection } from "slonik";
import { Cron, CronExpression } from '@nestjs/schedule';
import got from "got-cjs";
import si from 'systeminformation';
import { address } from 'ip';
import { env } from '../env'
import { DeviceStatusService } from "./device-status.interface";
import { TunnelService } from "@saito/tunnel";
import {
  ModelOfMiner
} from "@saito/models";

const STATUS_CHECK_TIMEOUT = 2000;

/**
 * 系统信息收集模块
 * 使用 systeminformation 库获取所有系统信息
 * 支持 Windows、Linux 和 macOS (包括 Apple Silicon)
 */

// 工具函数
const formatNumber = (value: number): number => Number(value.toFixed(2));

// 单位转换函数
const bytesToGB = (bytes: number): number => formatNumber(bytes / (1024 * 1024 * 1024));
const bytesToMB = (bytes: number): number => formatNumber(bytes / (1024 * 1024));
const kbpsToMbps = (kbps: number): number => formatNumber(kbps / 1024);

// 系统信息收集接口
interface SystemInfo {
  cpu: {
    model: string;
    cores: number;
    threads: number;
    usage: number;
    temperature?: number;
  };
  memory: {
    total: number; // GB
    used: number; // GB
    usage: number; // %
  };
  gpu: {
    model: string;
    vendor: string;
    memory: number; // GB
    usage: number; // %
    temperature?: number; // °C
    isAppleSilicon?: boolean;
  }[];
  disk: {
    total: number; // GB
    used: number; // GB
    usage: number; // %
  };
  network: {
    inbound: number; // Mbps
    outbound: number; // Mbps
  };
  os: {
    name: string;
    version: string;
    arch: string;
    platform: string;
    uptime: number; // seconds
  };
}

/**
 * 获取系统信息
 * 使用 systeminformation 库获取所有系统信息
 */
const getSystemInfo = async (logger: Logger): Promise<SystemInfo> => {
  try {
    // 并行获取所有系统信息
    const [cpuLoad, cpuInfo, cpuTemp, memInfo, gpuInfo, diskInfo, networkInfo, osInfo] = await Promise.all([
      si.currentLoad().catch(err => {
        logger.warn(`Failed to get CPU load: ${err.message}`);
        return { currentLoad: 0 };
      }),
      si.cpu().catch(err => {
        logger.warn(`Failed to get CPU info: ${err.message}`);
        return { manufacturer: '', brand: '', cores: 0, physicalCores: 0, speed: 0 };
      }),
      si.cpuTemperature().catch(err => {
        logger.warn(`Failed to get CPU temperature: ${err.message}`);
        return { main: 0, cores: [], max: 0 };
      }),
      si.mem().catch(err => {
        logger.warn(`Failed to get memory info: ${err.message}`);
        return { total: 1, used: 0, free: 1 };
      }),
      si.graphics().catch(err => {
        logger.warn(`Failed to get GPU info: ${err.message}`);
        return { controllers: [], displays: [] };
      }),
      si.fsSize().catch(err => {
        logger.warn(`Failed to get disk info: ${err.message}`);
        return [];
      }),
      si.networkStats().catch(err => {
        logger.warn(`Failed to get network info: ${err.message}`);
        return [];
      }),
      si.osInfo().catch(err => {
        logger.warn(`Failed to get OS info: ${err.message}`);
        return { distro: '', release: '', arch: '', platform: '', uptime: 0 };
      })
    ]);

    // 处理 CPU 信息
    const cpu = {
      model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`.trim(),
      cores: cpuInfo.physicalCores || 0,
      threads: cpuInfo.cores || 0,
      usage: formatNumber(cpuLoad.currentLoad || 0),
      temperature: formatNumber(cpuTemp.main || 0)
    };

    // 处理内存信息
    const memory = {
      total: bytesToGB(memInfo.total || 0),
      used: bytesToGB(memInfo.used || 0),
      usage: formatNumber(((memInfo.used || 0) / (memInfo.total || 1)) * 100)
    };

    // 处理 GPU 信息
    const gpuControllers = gpuInfo.controllers || [];
    const isAppleSilicon = osInfo.platform === 'darwin' && osInfo.arch.includes('arm');

    // 处理 GPU 信息，特别处理 Apple Silicon
    const gpu = gpuControllers.map(controller => {
      // 确定 GPU 厂商
      let vendor = controller.vendor || '';
      if (!vendor) {
        const model = (controller.model || '').toLowerCase();
        if (model.includes('nvidia')) vendor = 'NVIDIA';
        else if (model.includes('amd') || model.includes('radeon')) vendor = 'AMD';
        else if (model.includes('intel')) vendor = 'Intel';
        else if (model.includes('apple')) vendor = 'Apple';
        else vendor = 'Unknown';
      }

      // 特殊处理 Apple Silicon
      const isAppleGpu = vendor.toLowerCase().includes('apple') ||
                         (controller.model || '').toLowerCase().includes('apple');

      // 获取 GPU 内存
      let gpuMemory = 0;
      if (controller.memoryTotal) {
        // 如果内存值很大，可能是以字节为单位
        gpuMemory = controller.memoryTotal > 1024 * 1024 * 1024
          ? bytesToGB(controller.memoryTotal)
          : bytesToMB(controller.memoryTotal) / 1024; // 转换 MB 到 GB
      } else if (isAppleGpu && isAppleSilicon && memInfo.total) {
        // Apple Silicon 使用统一内存，估算 GPU 可用内存为系统内存的 30%
        gpuMemory = bytesToGB(memInfo.total * 0.3);
      }

      return {
        model: controller.model || 'Unknown GPU',
        vendor,
        memory: formatNumber(gpuMemory),
        usage: formatNumber(controller.utilizationGpu || 0),
        temperature: formatNumber(controller.temperatureGpu || 0),
        isAppleSilicon: isAppleGpu && isAppleSilicon
      };
    });

    // 如果没有检测到 GPU，但是是 Apple Silicon，添加一个默认的 Apple GPU
    if (gpu.length === 0 && isAppleSilicon) {
      // 尝试从 CPU 品牌中提取 M 芯片型号
      const cpuBrand = cpuInfo.brand || '';
      const mChipMatch = cpuBrand.match(/Apple\s+(M\d+)(?:\s+(Pro|Max|Ultra))?/i);

      const chipModel = mChipMatch ? mChipMatch[1] : 'Apple Silicon';
      const chipVariant = mChipMatch && mChipMatch[2] ? mChipMatch[2] : '';

      gpu.push({
        model: `${chipModel}${chipVariant ? ' ' + chipVariant : ''} GPU`,
        vendor: 'Apple',
        memory: bytesToGB(memInfo.total * 0.3), // 估算为系统内存的 30%
        usage: 0, // 无法准确获取
        temperature: 0, // 无法准确获取
        isAppleSilicon: true
      });
    }

    // 处理磁盘信息
    let diskTotal = 0;
    let diskUsed = 0;

    if (Array.isArray(diskInfo) && diskInfo.length > 0) {
      // 累加所有磁盘容量
      diskInfo.forEach(disk => {
        diskTotal += disk.size || 0;
        diskUsed += disk.used || 0;
      });
    } else if (diskInfo && typeof diskInfo === 'object' && 'size' in diskInfo) {
      // 单个磁盘信息
      diskTotal = (diskInfo as any).size || 0;
      diskUsed = (diskInfo as any).used || 0;
    }

    const disk = {
      total: bytesToGB(diskTotal),
      used: bytesToGB(diskUsed),
      usage: diskTotal > 0 ? formatNumber((diskUsed / diskTotal) * 100) : 0
    };

    // 处理网络信息
    let networkInbound = 0;
    let networkOutbound = 0;

    if (Array.isArray(networkInfo) && networkInfo.length > 0) {
      // 累加所有网络接口的流量
      networkInfo.forEach(net => {
        if (net.operstate === 'up') {
          networkInbound += net.rx_sec || 0;
          networkOutbound += net.tx_sec || 0;
        }
      });
    } else if (networkInfo && typeof networkInfo === 'object' && 'rx_sec' in networkInfo) {
      // 单个网络接口信息
      networkInbound = (networkInfo as any).rx_sec || 0;
      networkOutbound = (networkInfo as any).tx_sec || 0;
    }

    const network = {
      inbound: kbpsToMbps(networkInbound / 1024), // 转换为 Mbps
      outbound: kbpsToMbps(networkOutbound / 1024) // 转换为 Mbps
    };

    // 处理操作系统信息
    const os = {
      name: osInfo.distro || '',
      version: osInfo.release || '',
      arch: osInfo.arch || '',
      platform: osInfo.platform || '',
      uptime: typeof (osInfo as any).uptime === 'number' ? (osInfo as any).uptime : process.uptime()
    };

    return {
      cpu,
      memory,
      gpu,
      disk,
      network,
      os
    };
  } catch (error) {
    logger.error(`Failed to get system info: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // 返回默认值
    return {
      cpu: { model: 'Unknown', cores: 0, threads: 0, usage: 0 },
      memory: { total: 0, used: 0, usage: 0 },
      gpu: [{ model: 'Unknown', vendor: 'Unknown', memory: 0, usage: 0 }],
      disk: { total: 0, used: 0, usage: 0 },
      network: { inbound: 0, outbound: 0 },
      os: { name: '', version: '', arch: '', platform: '', uptime: 0 }
    };
  }
};

/**
 * 创建新版 API 的心跳数据
 */
const createHeartbeatData = (systemInfo: SystemInfo, deviceConfig: any, ipAddress: string, deviceType: string, deviceModel: string): any => {
  // 获取主要 GPU 信息（如果有多个，使用第一个）
  const primaryGpu = systemInfo.gpu.length > 0 ? systemInfo.gpu[0] : null;

  return {
    code: deviceConfig.code,
    cpu_usage: systemInfo.cpu.usage,
    memory_usage: systemInfo.memory.usage,
    gpu_usage: primaryGpu ? primaryGpu.usage : 0,
    ip: ipAddress,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: deviceType,
    model: deviceModel,
    device_info: {
      cpu_model: systemInfo.cpu.model,
      cpu_cores: systemInfo.cpu.cores,
      cpu_threads: systemInfo.cpu.threads,
      ram_total: systemInfo.memory.total,
      gpu_model: primaryGpu ? primaryGpu.model : '',
      gpu_count: systemInfo.gpu.length,
      gpu_memory: primaryGpu ? primaryGpu.memory : 0,
      disk_total: systemInfo.disk.total,
      os_info: `${systemInfo.os.name} ${systemInfo.os.version} (${systemInfo.os.arch})`
    }
  };
};

/**
 * 创建旧版 API 的心跳数据（向后兼容）
 */
const createLegacyHeartbeatData = (systemInfo: SystemInfo, deviceConfig: any, deviceModel: string): any => {
  // 获取主要 GPU 信息（如果有多个，使用第一个）
  const primaryGpu = systemInfo.gpu.length > 0 ? systemInfo.gpu[0] : null;

  // 确保网络流量数据有效
  const networkInKbps = systemInfo.network.inbound > 0
    ? systemInfo.network.inbound * 1024  // 转换 Mbps 到 kbps
    : 0;

  const networkOutKbps = systemInfo.network.outbound > 0
    ? systemInfo.network.outbound * 1024  // 转换 Mbps 到 kbps
    : 0;

  // 确保 GPU 数据有效
  const gpuUsagePercent = primaryGpu && primaryGpu.usage > 0 ? primaryGpu.usage : 0;
  const gpuTemperature = primaryGpu && primaryGpu.temperature && primaryGpu.temperature > 0 ? primaryGpu.temperature : 0;

  return {
    node_id: deviceConfig.deviceId,
    status: 'connected',
    cpu_usage_percent: systemInfo.cpu.usage,
    ram_usage_percent: systemInfo.memory.usage,
    gpu_usage_percent: gpuUsagePercent,
    gpu_temperature: gpuTemperature,
    network_in_kbps: networkInKbps,
    network_out_kbps: networkOutKbps,
    uptime_seconds: systemInfo.os.uptime,
    model: deviceModel
  };
};

@Injectable()
export class DefaultDeviceStatusService implements DeviceStatusService {
  private readonly logger = new Logger(DefaultDeviceStatusService.name);
  private deviceConfig: ModelOfMiner<'DeviceConfig'> = {
    deviceId: '24dea62e-95df-4549-b3ba-c9522cd5d5c1',
    deviceName: 'local_device_name',
    rewardAddress: '',
    gatewayAddress: '',
    key: '',
    code: '',
    isRegistered: false
  };

  constructor(
    private readonly deviceStatusRepository: DeviceStatusRepository,
    @Inject(forwardRef(() => TunnelService))
    private readonly tunnelService: TunnelService
  ) {
    this.initFromDatabase();
  }

  private async initFromDatabase() {
    try {
      const currentDevice = await this.getCurrentDevice();
      if (currentDevice && currentDevice.status === 'connected') {
        this.deviceConfig = {
          deviceId: currentDevice.id,
          deviceName: currentDevice.name,
          rewardAddress: currentDevice.reward_address || '',
          gatewayAddress: currentDevice.gateway_address || '',
          key: currentDevice.key || '',
          code: currentDevice.code || '',
          isRegistered: true
        };
      }
    } catch (error) {
      this.logger.error('Failed to initialize device from database');
    }
  }

  async register(credentials: ModelOfMiner<'DeviceCredentials'>): Promise<ModelOfMiner<'RegistrationResponse'>> {
    try {
      const [ipAddress, deviceType, deviceModel] = await Promise.all([
        address(),
        this.getDeviceType(),
        this.getDeviceModel(),
      ]);
      this.logger.debug(JSON.stringify(credentials));
      this.logger.debug(`Registering device with gateway: ${credentials.gateway_address}`);

      // Updated to use the new API endpoint according to the documentation
      const response = await got.post(`${credentials.gateway_address}/node/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          code: credentials.code,
          gateway_address: credentials.gateway_address,
          reward_address: credentials.reward_address,
          device_type: deviceType,
          gpu_type: deviceModel,
          ip: ipAddress,
        },
      }).json() as {
        success: boolean;
        data?: {
          node_id: string;
          status: string;
          device_type: string;
          reward_address: string;
          name?: string;
        };
        message?: string;
      };

      if (response.success && response.data) {
        this.deviceConfig = {
          deviceId: response.data.node_id || '',
          deviceName: response.data.name || 'Device',
          rewardAddress: credentials.reward_address,
          gatewayAddress: credentials.gateway_address,
          key: credentials.key,
          code: credentials.code,
          isRegistered: true
        };
        this.logger.debug(`Device registered: ${JSON.stringify(this.deviceConfig)}`);
        await this.updateDeviceStatus(
          this.deviceConfig.deviceId,
          this.deviceConfig.deviceName,
          'connected',
          this.deviceConfig.rewardAddress
        );

        // Create socket connection to the gateway
        await this.tunnelService.createSocket(
          this.deviceConfig.gatewayAddress,
          this.deviceConfig.key,
          this.deviceConfig.code
        );
        await this.tunnelService.connectSocket(response.data.node_id || '');

        // Start heartbeat reporting
        this.heartbeat();

        this.logger.log('Device registration successful');
        return {
          success: true,
          error: '',
          node_id: response.data.node_id,
          name: response.data.name
        };
      }

      this.logger.error(`Registration failed: ${JSON.stringify(response)}`);
      return {
        success: false,
        error: response.message || 'Registration failed',
        node_id: undefined,
        name: undefined
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Registration error: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        node_id: undefined,
        name: undefined
      };
    }
  }

  async heartbeat() {
    if (!this.deviceConfig.isRegistered) {
      this.logger.debug('Skipping heartbeat - device not registered');
      return;
    }

    try {
      // 获取系统信息
      const systemInfo = await this.getSystemInfo();

      // 获取其他必要信息
      const [ipAddress, deviceType, deviceModel] = await Promise.all([
        address(),
        this.getDeviceType(),
        this.getDeviceModel()
      ]);

      // 记录详细的系统信息日志
      this.logger.debug('Collected system information for heartbeat');

      // CPU信息
      this.logger.debug(`CPU: ${systemInfo.cpu.model} (${systemInfo.cpu.cores} cores, ${systemInfo.cpu.threads} threads)`);
      this.logger.debug(`CPU Load: ${systemInfo.cpu.usage}%`);
      if (systemInfo.cpu.temperature) {
        this.logger.debug(`CPU Temperature: ${systemInfo.cpu.temperature}°C`);
      }

      // 内存信息
      this.logger.debug(`Memory: ${systemInfo.memory.used}GB / ${systemInfo.memory.total}GB (${systemInfo.memory.usage}%)`);

      // GPU信息
      if (systemInfo.gpu.length > 0) {
        systemInfo.gpu.forEach((gpu, index) => {
          this.logger.debug(`GPU ${index + 1}: ${gpu.model} (${gpu.vendor})`);
          this.logger.debug(`GPU ${index + 1} Usage: ${gpu.usage}%`);

          if (gpu.temperature) {
            this.logger.debug(`GPU ${index + 1} Temperature: ${gpu.temperature}°C`);
          }

          this.logger.debug(`GPU ${index + 1} Memory: ${gpu.memory}GB`);

          if (gpu.isAppleSilicon) {
            this.logger.debug(`GPU ${index + 1} Type: Apple Silicon (Unified Memory)`);
          }
        });
      } else {
        this.logger.debug('GPU: Not available');
      }

      // 磁盘信息
      this.logger.debug(`Disk: ${systemInfo.disk.used}GB / ${systemInfo.disk.total}GB (${systemInfo.disk.usage}%)`);

      // 网络信息
      this.logger.debug(`Network: In ${systemInfo.network.inbound}Mbps, Out ${systemInfo.network.outbound}Mbps`);

      // 操作系统信息
      this.logger.debug(`OS: ${systemInfo.os.name} ${systemInfo.os.version} (${systemInfo.os.arch})`);
      this.logger.debug(`Uptime: ${formatNumber(systemInfo.os.uptime / 3600)} hours`);

      // 创建心跳数据
      const newHeartbeatData = createHeartbeatData(
        systemInfo,
        this.deviceConfig,
        ipAddress,
        deviceType,
        deviceModel
      );

      // 发送到新的API端点
      await got.post(`${this.deviceConfig.gatewayAddress}/node/heartbeat/new`, {
        headers: {
          'Content-Type': 'application/json'
        },
        json: newHeartbeatData,
      });

      // 同时发送到旧的API端点以保持向后兼容
      // const legacyHeartbeatData = createLegacyHeartbeatData(
      //   systemInfo,
      //   this.deviceConfig,
      //   deviceModel
      // );

      // await got.post(`${this.deviceConfig.gatewayAddress}/node/heartbeat`, {
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   json: legacyHeartbeatData,
      // });

      this.logger.debug('Heartbeat sent successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Heartbeat failed: ${errorMessage}`);
      // this.deviceConfig.isRegistered = false;
    }
  }

  /**
   * 获取系统信息
   * 使用 systeminformation 库获取所有系统信息
   */
  private async getSystemInfo(): Promise<SystemInfo> {
    try {
      // 并行获取所有系统信息
      const [cpuLoad, cpuInfo, cpuTemp, memInfo, gpuInfo, diskInfo, networkInfo, osInfo] = await Promise.all([
        si.currentLoad().catch(err => {
          this.logger.warn(`Failed to get CPU load: ${err.message}`);
          return { currentLoad: 0 };
        }),
        si.cpu().catch(err => {
          this.logger.warn(`Failed to get CPU info: ${err.message}`);
          return { manufacturer: '', brand: '', cores: 0, physicalCores: 0, speed: 0 };
        }),
        si.cpuTemperature().catch(err => {
          this.logger.warn(`Failed to get CPU temperature: ${err.message}`);
          return { main: 0, cores: [], max: 0 };
        }),
        si.mem().catch(err => {
          this.logger.warn(`Failed to get memory info: ${err.message}`);
          return { total: 1, used: 0, free: 1 };
        }),
        si.graphics().catch(err => {
          this.logger.warn(`Failed to get GPU info: ${err.message}`);
          return { controllers: [], displays: [] };
        }),
        si.fsSize().catch(err => {
          this.logger.warn(`Failed to get disk info: ${err.message}`);
          return [];
        }),
        si.networkStats().catch(err => {
          this.logger.warn(`Failed to get network info: ${err.message}`);
          return [];
        }),
        si.osInfo().catch(err => {
          this.logger.warn(`Failed to get OS info: ${err.message}`);
          return { distro: '', release: '', arch: '', platform: '', uptime: 0 };
        })
      ]);

      // 处理 CPU 信息
      const cpu = {
        model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`.trim(),
        cores: cpuInfo.physicalCores || 0,
        threads: cpuInfo.cores || 0,
        usage: formatNumber(cpuLoad.currentLoad || 0),
        temperature: formatNumber(cpuTemp.main || 0)
      };

      // 处理内存信息
      const memory = {
        total: bytesToGB(memInfo.total || 0),
        used: bytesToGB(memInfo.used || 0),
        usage: formatNumber(((memInfo.used || 0) / (memInfo.total || 1)) * 100)
      };

      // 处理 GPU 信息
      const gpuControllers = gpuInfo.controllers || [];
      const isAppleSilicon = osInfo.platform === 'darwin' && osInfo.arch.includes('arm');

      // 处理 GPU 信息，特别处理 Apple Silicon
      const gpu = gpuControllers.map(controller => {
        // 确定 GPU 厂商
        let vendor = controller.vendor || '';
        if (!vendor) {
          const model = (controller.model || '').toLowerCase();
          if (model.includes('nvidia')) vendor = 'NVIDIA';
          else if (model.includes('amd') || model.includes('radeon')) vendor = 'AMD';
          else if (model.includes('intel')) vendor = 'Intel';
          else if (model.includes('apple')) vendor = 'Apple';
          else vendor = 'Unknown';
        }

        // 特殊处理 Apple Silicon
        const isAppleGpu = vendor.toLowerCase().includes('apple') ||
                           (controller.model || '').toLowerCase().includes('apple');

        // 获取 GPU 内存
        let gpuMemory = 0;
        if (controller.memoryTotal) {
          // 如果内存值很大，可能是以字节为单位
          gpuMemory = controller.memoryTotal > 1024 * 1024 * 1024
            ? bytesToGB(controller.memoryTotal)
            : bytesToMB(controller.memoryTotal) / 1024; // 转换 MB 到 GB
        } else if (isAppleGpu && isAppleSilicon && memInfo.total) {
          // Apple Silicon 使用统一内存，估算 GPU 可用内存为系统内存的 30%
          gpuMemory = bytesToGB(memInfo.total * 0.3);
        }

        // 获取 GPU 使用率
        let gpuUsage = 0;
        if (typeof controller.utilizationGpu === 'number' && !isNaN(controller.utilizationGpu)) {
          gpuUsage = controller.utilizationGpu;
        } else if (vendor.toLowerCase() === 'nvidia' && (controller as any).memoryUtilization) {
          // 如果没有 GPU 使用率但有内存使用率，使用内存使用率作为近似值
          gpuUsage = (controller as any).memoryUtilization;
        } else if (isAppleGpu && isAppleSilicon) {
          // 对于 Apple Silicon，尝试使用 CPU 使用率作为近似值（因为它们共享架构）
          gpuUsage = cpuLoad.currentLoad * 0.8; // 假设 GPU 使用率约为 CPU 的 80%
        }

        // 获取 GPU 温度
        let gpuTemp = 0;
        if (typeof controller.temperatureGpu === 'number' && !isNaN(controller.temperatureGpu)) {
          gpuTemp = controller.temperatureGpu;
        } else if (vendor.toLowerCase() === 'nvidia' && (controller as any).fanSpeed) {
          // 如果有风扇速度但没有温度，估算温度（风扇速度通常与温度相关）
          gpuTemp = Math.min(80, (controller as any).fanSpeed * 0.8); // 粗略估计
        } else if (isAppleGpu && isAppleSilicon && cpuTemp.main) {
          // 对于 Apple Silicon，使用 CPU 温度作为近似值（因为它们共享散热系统）
          gpuTemp = cpuTemp.main;
        }

        return {
          model: controller.model || 'Unknown GPU',
          vendor,
          memory: formatNumber(gpuMemory),
          usage: formatNumber(gpuUsage),
          temperature: formatNumber(gpuTemp),
          isAppleSilicon: isAppleGpu && isAppleSilicon
        };
      });

      // 记录 GPU 信息
      if (gpu.length > 0) {
        gpu.forEach((gpuInfo, index) => {
          this.logger.debug(`GPU ${index + 1}: ${gpuInfo.model} (${gpuInfo.vendor}), Usage: ${gpuInfo.usage}%, Temp: ${gpuInfo.temperature}°C, Memory: ${gpuInfo.memory}GB`);
        });
      } else {
        this.logger.debug('No GPU detected');
      }

      // 如果没有检测到 GPU，尝试使用其他方法检测
      if (gpu.length === 0) {
        try {
          // 检查是否是 Apple Silicon
          if (isAppleSilicon) {
            // 尝试从 CPU 品牌中提取 M 芯片型号
            const cpuBrand = cpuInfo.brand || '';
            const mChipMatch = cpuBrand.match(/Apple\s+(M\d+)(?:\s+(Pro|Max|Ultra))?/i);

            const chipModel = mChipMatch ? mChipMatch[1] : 'Apple Silicon';
            const chipVariant = mChipMatch && mChipMatch[2] ? mChipMatch[2] : '';

            gpu.push({
              model: `${chipModel}${chipVariant ? ' ' + chipVariant : ''} GPU`,
              vendor: 'Apple',
              memory: bytesToGB(memInfo.total * 0.3), // 估算为系统内存的 30%
              usage: cpuLoad.currentLoad * 0.8, // 估算为 CPU 使用率的 80%
              temperature: cpuTemp.main || 0, // 使用 CPU 温度
              isAppleSilicon: true
            });

            this.logger.debug(`Added Apple Silicon GPU: ${chipModel}${chipVariant ? ' ' + chipVariant : ''}`);
          }
          // 检查是否是 Intel 集成显卡
          else if (cpuInfo.manufacturer?.toLowerCase().includes('intel')) {
            // 尝试使用命令行工具获取 Intel GPU 信息
            if (osInfo.platform === 'linux') {
              try {
                const { execSync } = require('child_process');
                // 检查是否安装了 intel_gpu_top
                const hasIntelGpuTop = execSync('which intel_gpu_top 2>/dev/null || echo ""').toString().trim().length > 0;

                if (hasIntelGpuTop) {
                  // 使用 intel_gpu_top 获取 GPU 使用率
                  const gpuData = execSync('intel_gpu_top -J -s 100 2>/dev/null || echo "{}"').toString();
                  try {
                    const gpuJson = JSON.parse(gpuData);
                    const gpuUsage = gpuJson.engines?.render?.busy || 0;

                    gpu.push({
                      model: `Intel ${cpuInfo.brand || ''} Integrated Graphics`,
                      vendor: 'Intel',
                      memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
                      usage: gpuUsage,
                      temperature: cpuTemp.main || 0, // 使用 CPU 温度
                      isAppleSilicon: false
                    });

                    this.logger.debug(`Added Intel Integrated GPU with usage: ${gpuUsage}%`);
                  } catch (e) {
                    // 解析失败，使用默认值
                    gpu.push({
                      model: `Intel ${cpuInfo.brand || ''} Integrated Graphics`,
                      vendor: 'Intel',
                      memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
                      usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
                      temperature: cpuTemp.main || 0, // 使用 CPU 温度
                      isAppleSilicon: false
                    });

                    this.logger.debug(`Added Intel Integrated GPU with estimated usage`);
                  }
                } else {
                  // 没有 intel_gpu_top，使用默认值
                  gpu.push({
                    model: `Intel ${cpuInfo.brand || ''} Integrated Graphics`,
                    vendor: 'Intel',
                    memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
                    usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
                    temperature: cpuTemp.main || 0, // 使用 CPU 温度
                    isAppleSilicon: false
                  });

                  this.logger.debug(`Added Intel Integrated GPU (no intel_gpu_top available)`);
                }
              } catch (error) {
                this.logger.warn(`Failed to get Intel GPU info: ${error instanceof Error ? error.message : 'Unknown error'}`);

                // 使用默认值
                gpu.push({
                  model: `Intel ${cpuInfo.brand || ''} Integrated Graphics`,
                  vendor: 'Intel',
                  memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
                  usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
                  temperature: cpuTemp.main || 0, // 使用 CPU 温度
                  isAppleSilicon: false
                });

                this.logger.debug(`Added Intel Integrated GPU (fallback)`);
              }
            } else if (osInfo.platform === 'win32') {
              // Windows 平台
              gpu.push({
                model: `Intel ${cpuInfo.brand || ''} Integrated Graphics`,
                vendor: 'Intel',
                memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
                usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
                temperature: cpuTemp.main || 0, // 使用 CPU 温度
                isAppleSilicon: false
              });

              this.logger.debug(`Added Intel Integrated GPU on Windows`);
            } else if (osInfo.platform === 'darwin') {
              // macOS 平台
              gpu.push({
                model: `Intel ${cpuInfo.brand || ''} Integrated Graphics`,
                vendor: 'Intel',
                memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
                usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
                temperature: cpuTemp.main || 0, // 使用 CPU 温度
                isAppleSilicon: false
              });

              this.logger.debug(`Added Intel Integrated GPU on macOS`);
            }
          }
          // 检查是否是 AMD CPU（可能有集成显卡）
          else if (cpuInfo.manufacturer?.toLowerCase().includes('amd')) {
            gpu.push({
              model: `AMD ${cpuInfo.brand || ''} Integrated Graphics`,
              vendor: 'AMD',
              memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
              usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
              temperature: cpuTemp.main || 0, // 使用 CPU 温度
              isAppleSilicon: false
            });

            this.logger.debug(`Added AMD Integrated GPU`);
          }
          // 如果仍然没有检测到 GPU，添加一个通用的集成显卡
          else if (gpu.length === 0) {
            gpu.push({
              model: `Integrated Graphics`,
              vendor: cpuInfo.manufacturer || 'Unknown',
              memory: bytesToGB(memInfo.total * 0.1), // 估算为系统内存的 10%
              usage: cpuLoad.currentLoad * 0.5, // 估算为 CPU 使用率的 50%
              temperature: cpuTemp.main || 0, // 使用 CPU 温度
              isAppleSilicon: false
            });

            this.logger.debug(`Added generic Integrated GPU`);
          }
        } catch (error) {
          this.logger.warn(`Failed to detect integrated GPU: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 处理磁盘信息
      let diskTotal = 0;
      let diskUsed = 0;

      if (Array.isArray(diskInfo) && diskInfo.length > 0) {
        // 累加所有磁盘容量
        diskInfo.forEach(disk => {
          diskTotal += disk.size || 0;
          diskUsed += disk.used || 0;
        });
      } else if (diskInfo && typeof diskInfo === 'object' && 'size' in diskInfo) {
        // 单个磁盘信息
        diskTotal = (diskInfo as any).size || 0;
        diskUsed = (diskInfo as any).used || 0;
      }

      const disk = {
        total: bytesToGB(diskTotal),
        used: bytesToGB(diskUsed),
        usage: diskTotal > 0 ? formatNumber((diskUsed / diskTotal) * 100) : 0
      };

      // 处理网络信息
      let networkInbound = 0;
      let networkOutbound = 0;

      try {
        // 记录所有网络接口信息以便调试
        if (Array.isArray(networkInfo)) {
          this.logger.debug(`Found ${networkInfo.length} network interfaces`);
          networkInfo.forEach((net, idx) => {
            this.logger.debug(`Network interface ${idx+1}: ${net.iface}, state: ${net.operstate}, rx_sec: ${net.rx_sec}, tx_sec: ${net.tx_sec}`);
          });
        }

        // 尝试使用直接的网络统计方法
        const directNetStats = async () => {
          try {
            // 获取当前网络统计
            const stats1 = await si.networkStats();

            // 等待一小段时间
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 再次获取网络统计
            const stats2 = await si.networkStats();

            // 计算差值
            let totalRx = 0;
            let totalTx = 0;

            if (Array.isArray(stats1) && Array.isArray(stats2) && stats1.length === stats2.length) {
              for (let i = 0; i < stats1.length; i++) {
                if (stats1[i].operstate === 'up' &&
                    !stats1[i].iface.includes('lo') &&
                    !stats1[i].iface.includes('docker') &&
                    !stats1[i].iface.includes('veth') &&
                    !stats1[i].iface.includes('br-')) {

                  const rxDiff = stats2[i].rx_bytes - stats1[i].rx_bytes;
                  const txDiff = stats2[i].tx_bytes - stats1[i].tx_bytes;

                  // 转换为每秒比特数
                  totalRx += (rxDiff * 8) / 1000; // kbps
                  totalTx += (txDiff * 8) / 1000; // kbps

                  this.logger.debug(`Interface ${stats1[i].iface}: RX ${totalRx.toFixed(2)} kbps, TX ${totalTx.toFixed(2)} kbps`);
                }
              }
            }

            return { rx: totalRx, tx: totalTx };
          } catch (error) {
            this.logger.warn(`Failed to get direct network stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { rx: 0, tx: 0 };
          }
        };

        // 尝试使用直接测量方法
        const directStats = await directNetStats();
        if (directStats.rx > 0 || directStats.tx > 0) {
          networkInbound = directStats.rx;
          networkOutbound = directStats.tx;
          this.logger.debug(`Using direct network measurement: RX ${networkInbound.toFixed(2)} kbps, TX ${networkOutbound.toFixed(2)} kbps`);
        } else {
          // 回退到原来的方法
          if (Array.isArray(networkInfo) && networkInfo.length > 0) {
            // 累加所有活跃网络接口的流量
            const activeInterfaces = networkInfo.filter(net =>
              net.operstate === 'up' &&
              !net.iface.includes('lo') && // 排除本地回环接口
              !net.iface.includes('docker') && // 排除docker接口
              !net.iface.includes('veth') && // 排除虚拟接口
              !net.iface.includes('br-') // 排除桥接接口
            );

            if (activeInterfaces.length > 0) {
              // 累加所有活跃接口的流量
              activeInterfaces.forEach(net => {
                if (typeof net.rx_sec === 'number' && !isNaN(net.rx_sec)) {
                  networkInbound += net.rx_sec;
                }
                if (typeof net.tx_sec === 'number' && !isNaN(net.tx_sec)) {
                  networkOutbound += net.tx_sec;
                }
              });

              // 记录找到的网络接口
              this.logger.debug(`Found ${activeInterfaces.length} active network interfaces: ${activeInterfaces.map(net => net.iface).join(', ')}`);
            } else {
              // 如果没有找到活跃接口，使用所有接口
              networkInfo.forEach(net => {
                if (typeof net.rx_sec === 'number' && !isNaN(net.rx_sec)) {
                  networkInbound += net.rx_sec;
                }
                if (typeof net.tx_sec === 'number' && !isNaN(net.tx_sec)) {
                  networkOutbound += net.tx_sec;
                }
              });
            }
          } else if (networkInfo && typeof networkInfo === 'object' && 'rx_sec' in networkInfo) {
            // 单个网络接口信息
            if (typeof (networkInfo as any).rx_sec === 'number' && !isNaN((networkInfo as any).rx_sec)) {
              networkInbound = (networkInfo as any).rx_sec;
            }
            if (typeof (networkInfo as any).tx_sec === 'number' && !isNaN((networkInfo as any).tx_sec)) {
              networkOutbound = (networkInfo as any).tx_sec;
            }
          }
        }

        // 如果网络流量仍然为0，尝试使用操作系统命令获取
        if (networkInbound === 0 && networkOutbound === 0) {
          try {
            // 在Linux上使用/proc/net/dev
            if (osInfo.platform === 'linux') {
              const { execSync } = require('child_process');
              const netData = execSync('cat /proc/net/dev').toString();
              const lines = netData.split('\n').filter((line: string) =>
                line.includes(':') &&
                !line.includes('lo:') &&
                !line.includes('docker') &&
                !line.includes('veth') &&
                !line.includes('br-')
              );

              if (lines.length > 0) {
                // 解析第一个有效接口的数据
                const parts = lines[0].trim().split(/\s+/);
                if (parts.length >= 10) {
                  // 典型格式: interface: rx_bytes rx_packets ... tx_bytes tx_packets ...
                  const rxBytes = parseInt(parts[1], 10);
                  const txBytes = parseInt(parts[9], 10);

                  // 假设这是1秒内的数据，转换为kbps
                  networkInbound = (rxBytes * 8) / 1000;
                  networkOutbound = (txBytes * 8) / 1000;

                  this.logger.debug(`Using /proc/net/dev for network stats: RX ${networkInbound.toFixed(2)} kbps, TX ${networkOutbound.toFixed(2)} kbps`);
                }
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to get network stats from OS: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error processing network information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 确保值大于0且不是NaN
      networkInbound = Math.max(0, isNaN(networkInbound) ? 0 : networkInbound);
      networkOutbound = Math.max(0, isNaN(networkOutbound) ? 0 : networkOutbound);

      // 如果仍然为0，使用一个小的非零值以便显示
      if (networkInbound === 0 && networkOutbound === 0) {
        // 使用一个很小的值，表示有网络连接但流量很小
        networkInbound = 0.01;
        networkOutbound = 0.01;
      }

      const network = {
        inbound: kbpsToMbps(networkInbound / 1024), // 转换为 Mbps
        outbound: kbpsToMbps(networkOutbound / 1024) // 转换为 Mbps
      };

      this.logger.debug(`Network traffic: In ${network.inbound}Mbps, Out ${network.outbound}Mbps`);

      // 处理操作系统信息
      const os = {
        name: osInfo.distro || '',
        version: osInfo.release || '',
        arch: osInfo.arch || '',
        platform: osInfo.platform || '',
        uptime: typeof (osInfo as any).uptime === 'number' ? (osInfo as any).uptime : process.uptime()
      };

      return {
        cpu,
        memory,
        gpu,
        disk,
        network,
        os
      };
    } catch (error) {
      this.logger.error(`Failed to get system info: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // 返回默认值
      return {
        cpu: { model: 'Unknown', cores: 0, threads: 0, usage: 0 },
        memory: { total: 0, used: 0, usage: 0 },
        gpu: [{ model: 'Unknown', vendor: 'Unknown', memory: 0, usage: 0 }],
        disk: { total: 0, used: 0, usage: 0 },
        network: { inbound: 0, outbound: 0 },
        os: { name: '', version: '', arch: '', platform: '', uptime: 0 }
      };
    }
  }

  async updateDeviceStatus(
    deviceId: string,
    name: string,
    status: "waiting" | "in-progress" | "connected" | "disconnected" | "failed",
    rewardAddress: string
  ): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      await this.deviceStatusRepository.updateDeviceStatus(
        conn,
        deviceId,
        name,
        status,
        rewardAddress,
        this.deviceConfig.gatewayAddress,
        this.deviceConfig.key,
        this.deviceConfig.code
      );
      const updatedDevice = await this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
      if (!updatedDevice) {
        throw new Error('Failed to update device status');
      }
      return updatedDevice;
    });
  }

  async getDeviceStatus(deviceId: string): Promise<ModelOfMiner<'DeviceStatusModule'> | null> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceStatus(conn, deviceId);
    });
  }

  async markInactiveDevicesOffline(inactiveDuration: number): Promise<ModelOfMiner<'DeviceStatusModule'>[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      const thresholdTime = new Date(Date.now() - inactiveDuration);
      await this.deviceStatusRepository.markDevicesOffline(conn, thresholdTime);
      const devices = await this.deviceStatusRepository.findDeviceList(conn);
      return devices.map(device => ({
        ...device,
        code: null,
        gateway_address: null,
        reward_address: null,
        key: null,
        up_time_start: null,
        up_time_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    });
  }

  async getDeviceList(): Promise<ModelOfMiner<'DeviceListItem'>[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceList(conn);
    });
  }

  async getCurrentDevice(): Promise<ModelOfMiner<'DeviceStatusModule'>> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findCurrentDevice(conn);
    });
  }

  async getDeviceTasks(deviceId: string): Promise<ModelOfMiner<'TaskResult'>[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDevicesTasks(conn, deviceId);
    });
  }

  async getDeviceEarnings(deviceId: string): Promise<ModelOfMiner<'EarningResult'>[]> {
    return this.deviceStatusRepository.transaction(async (conn: DatabaseTransactionConnection) => {
      return this.deviceStatusRepository.findDeviceEarnings(conn, deviceId);
    });
  }

  async getGatewayStatus(): Promise<{
    isRegistered: boolean
  }> {
    return {
      isRegistered: this.deviceConfig.isRegistered
    };
  }

  async getDeviceId(): Promise<string> {
    return this.deviceConfig.deviceId;
  }

  async getDeviceName(): Promise<string> {
    return this.deviceConfig.deviceName;
  }

  async getRewardAddress(): Promise<string> {
    return this.deviceConfig.rewardAddress;
  }

  async getGatewayAddress(): Promise<string> {
    return this.deviceConfig.gatewayAddress;
  }

  async getKey(): Promise<string> {
    return this.deviceConfig.key;
  }

  async isRegistered(): Promise<boolean> {
    return this.deviceConfig.isRegistered;
  }

  async getDeviceType(): Promise<string> {
    return env().DEVICE_TYPE;
  }

  async getDeviceModel(): Promise<string> {
    return env().GPU_MODEL;
  }

  async getDeviceInfo(): Promise<string> {
    try {
      const [os, cpu, mem, graphics] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.graphics()
      ]);

      return JSON.stringify({
        os: `${os.distro} ${os.release} (${os.arch})`,
        cpu: `${cpu.manufacturer} ${cpu.brand} ${cpu.speed}GHz`,
        memory: `${(mem.total / 1024 / 1024 / 1024).toFixed(1)}GB`,
        graphics: R.map(
          R.applySpec({
            model: R.prop('model'),
            vram: R.ifElse(
              R.both(
                R.has('vram'),
                R.pipe(R.prop('vram'), R.is(Number))
              ),
              R.pipe(
                R.prop('vram'),
                R.divide(R.__, 1024),
                Math.round,
                R.toString,
                R.concat(R.__, 'GB')
              ),
              R.always('Unknown')
            )
          }),
          graphics.controllers
        )
      });
    } catch {
      return '{}';
    }
  }

  async checkStatus(): Promise<boolean> {
    try {
      const url = new URL(`api/version`, env().OLLAMA_API_URL);
      const response = await got.get(url.toString(), {
        timeout: {
          request: STATUS_CHECK_TIMEOUT,
        },
        retry: {
          limit: 0
        }
      });

      return response.statusCode === 200;
    } catch (error: any) {
      this.logger.warn(`Ollama service unavailable: ${error.message}`);
      return false;
    }
  }

  async isOllamaOnline(): Promise<boolean> {
    try {
      return await this.checkStatus();
    } catch (error) {
      return false;
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkOllamaStatus() {
    this.heartbeat();

    const { deviceId, deviceName, rewardAddress } = this.deviceConfig;

    if (!deviceId || !deviceName) {
      return;
    }

    try {
      const isOnline = await this.isOllamaOnline();
      const status = isOnline ? "connected" : "disconnected";

      if (isOnline) {
        await this.updateDeviceStatus(deviceId, deviceName, status, rewardAddress);
      } else {
        const inactiveDuration = 1000 * 60;
        await this.markInactiveDevicesOffline(inactiveDuration);
      }
    } catch (error) {
      const inactiveDuration = 1000 * 60;
      await this.markInactiveDevicesOffline(inactiveDuration);
    }
  }
}

const DeviceStatusServiceProvider = {
  provide: DeviceStatusService,
  useClass: DefaultDeviceStatusService,
};

export default DeviceStatusServiceProvider;
