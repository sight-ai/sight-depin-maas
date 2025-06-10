import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import got from 'got-cjs';
import type { SystemInfo, SystemHeartbeatData } from '@saito/models';
import { ModelOfMiner } from '@saito/models';
import { SystemInfoCollector } from '../collectors/system-info.collector';
import { DeviceConfigManager } from './device-config.manager';
import { ErrorHandler } from '../utils/error-handler';
import { TDeviceConfig, DEVICE_CONFIG_SERVICE } from '../device-status.interface';
import {
  HEARTBEAT_CONFIG,
  GPU_CONFIG,
  formatNumber,
  getCurrentTimestamp
} from '../constants/system-info.constants';

/**
 * 心跳管理器
 *
 * 负责：
 * 1. 创建心跳数据
 * 2. 发送心跳到网关
 * 3. 处理心跳发送错误和重试
 * 4. 支持多种心跳格式
 * 5. 定时自动上报心跳
 */
@Injectable()
export class HeartbeatManager {
  private readonly logger = new Logger(HeartbeatManager.name);
  private readonly errorHandler = new ErrorHandler(HeartbeatManager.name);
  private readonly maxRetries = HEARTBEAT_CONFIG.MAX_RETRIES;
  private readonly retryDelay = HEARTBEAT_CONFIG.RETRY_DELAY;

  constructor(
    private readonly systemInfoCollector: SystemInfoCollector,
    private readonly configManager: DeviceConfigManager,
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly deviceConfigService: TDeviceConfig
  ) {}

  // ========================================
  // 定时心跳任务
  // ========================================

  /**
   * 定时发送心跳 (每5秒执行一次)
   */
  @Cron('*/5 * * * * *')
  async scheduledHeartbeat(): Promise<void> {
    await this.errorHandler.safeExecute(
      async () => {
        // 优先使用新的配置服务
        const config = this.deviceConfigService.getCurrentConfig();

        if (!config.isRegistered) {
          this.logger.debug('Device not registered, skipping scheduled heartbeat');
          return;
        }

        // 收集系统信息
        const systemInfo = await this.systemInfoCollector.collectSystemInfo();
        const [ipAddress, deviceType, deviceModel] = await Promise.all([
          this.systemInfoCollector.getIpAddress(),
          this.systemInfoCollector.getDeviceType(),
          this.systemInfoCollector.getDeviceModel()
        ]);

        // 转换配置格式以兼容旧接口
        const legacyConfig = {
          code: config.code || '',
          key: config.key || '',
          deviceId: config.deviceId || '',
          deviceName: config.deviceName || '',
          rewardAddress: config.rewardAddress || '',
          gatewayAddress: config.gatewayAddress || '',
          isRegistered: config.isRegistered || false
        };

        // 发送心跳
        const result = await this.sendBothHeartbeats(
          systemInfo,
          legacyConfig,
          ipAddress,
          deviceType,
          deviceModel
        );

        if (result.new) {
          this.logger.debug('Scheduled heartbeat sent successfully');
        } else {
          this.logger.warn('Scheduled heartbeat failed');
        }
      },
      'scheduled-heartbeat',
      undefined
    );
  }

  // ========================================
  // 心跳数据创建和发送
  // ========================================

  /**
   * 创建心跳数据
   */
  createHeartbeatData(
    systemInfo: SystemInfo,
    deviceConfig: ModelOfMiner<'DeviceConfig'>,
    ipAddress: string,
    deviceType: string,
    deviceModel: string
  ): SystemHeartbeatData {
    // 获取主要 GPU 信息（如果有多个，使用第一个）
    const primaryGpu = systemInfo.gpus.length > 0 ? systemInfo.gpus[0] : null;

    // 确保 GPU 数据有效
    const gpuUsagePercent = primaryGpu && primaryGpu.utilization && primaryGpu.utilization > 0 ? primaryGpu.utilization : 0.1;
    const gpuTemperature = primaryGpu && primaryGpu.temperature && primaryGpu.temperature > 0
      ? primaryGpu.temperature
      : GPU_CONFIG.DEFAULT_TEMPERATURE;

    // 确保网络流量数据有效
    const networkInKbps = systemInfo.network.inbound > 0
      ? systemInfo.network.inbound * 1024  // 转换 Mbps 到 kbps
      : 0.1;  // 使用一个小的非零值

    const networkOutKbps = systemInfo.network.outbound > 0
      ? systemInfo.network.outbound * 1024  // 转换 Mbps 到 kbps
      : 0.1;  // 使用一个小的非零值

    // 计算可用内存（GB和百分比）
    const ramTotal = systemInfo.memory.total;
    const ramUsed = systemInfo.memory.used;
    const ramAvailable = ramTotal - ramUsed;
    const ramAvailablePercent = 100 - systemInfo.memory.usage;

    // 计算可用磁盘空间（GB和百分比）
    const diskTotal = systemInfo.disk.total;
    const diskUsed = systemInfo.disk.used;
    const diskAvailable = diskTotal - diskUsed;
    const diskAvailablePercent = 100 - systemInfo.disk.usage;

    return {
      code: deviceConfig.code,
      cpu_usage: systemInfo.cpu.usage,
      memory_usage: systemInfo.memory.usage,
      gpu_usage: gpuUsagePercent,
      gpu_temperature: gpuTemperature,
      network_in_kbps: networkInKbps,
      network_out_kbps: networkOutKbps,
      ip: ipAddress,
      timestamp: getCurrentTimestamp(),
      type: deviceType,
      model: deviceModel,
      device_info: {
        cpu_model: systemInfo.cpu.model,
        cpu_cores: systemInfo.cpu.cores,
        cpu_threads: systemInfo.cpu.threads,
        ram_total: systemInfo.memory.total,
        ram_used: systemInfo.memory.used,
        ram_available: formatNumber(ramAvailable),
        ram_available_percent: formatNumber(ramAvailablePercent),
        gpu_model: primaryGpu ? primaryGpu.name : '',
        gpu_vendor: primaryGpu ? primaryGpu.vendor : '',
        gpu_count: systemInfo.gpus.length,
        gpu_memory: primaryGpu ? primaryGpu.memory.total : 0,
        gpu_temperature: gpuTemperature,
        disk_total: systemInfo.disk.total,
        disk_used: systemInfo.disk.used,
        disk_available: formatNumber(diskAvailable),
        disk_available_percent: formatNumber(diskAvailablePercent),
        network_in_kbps: networkInKbps,
        network_out_kbps: networkOutKbps,
        os_info: `${systemInfo.os.name} ${systemInfo.os.version} (${systemInfo.os.arch})`,
        uptime_seconds: systemInfo.os.uptime
      }
    };
  }

  /**
   * 发送心跳到网关
   */
  async sendHeartbeat(
    heartbeatData: SystemHeartbeatData,
    gatewayAddress: string
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await got.post(`${gatewayAddress}/node/heartbeat/new`, {
          headers: {
            'Content-Type': 'application/json'
          },
          json: heartbeatData,
          timeout: {
            request: 10000 // 10秒超时
          }
        });

        // 成功发送，记录日志并返回
        if (attempt > 1) {
          this.logger.log(`Heartbeat sent successfully on attempt ${attempt}`);
        }
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.maxRetries) {
          this.logger.warn(`Heartbeat attempt ${attempt} failed: ${lastError.message}. Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay * attempt); // 递增延迟
        }
      }
    }

    // 所有重试都失败了
    this.logger.error(`Failed to send heartbeat after ${this.maxRetries} attempts: ${lastError?.message}`);
    throw lastError;
  }

  /**
   * 发送心跳（带完整错误处理）
   */
  async sendHeartbeatSafe(
    systemInfo: SystemInfo,
    deviceConfig: ModelOfMiner<'DeviceConfig'>,
    ipAddress: string,
    deviceType: string,
    deviceModel: string
  ): Promise<boolean> {
    try {
      // 检查必要的配置
      if (!deviceConfig.isRegistered || !deviceConfig.gatewayAddress) {
        this.logger.debug('Device not registered or gateway address missing, skipping heartbeat');
        return false;
      }

      // 创建心跳数据
      const heartbeatData = this.createHeartbeatData(
        systemInfo,
        deviceConfig,
        ipAddress,
        deviceType,
        deviceModel
      );

      // 发送心跳
      await this.sendHeartbeat(heartbeatData, deviceConfig.gatewayAddress);
      
      return true;
    } catch (error) {
      this.logger.error(`Heartbeat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 创建旧版心跳数据（向后兼容）
   */
  createLegacyHeartbeatData(
    systemInfo: SystemInfo,
    deviceConfig: ModelOfMiner<'DeviceConfig'>,
    deviceModel: string
  ): any {
    const primaryGpu = systemInfo.gpus.length > 0 ? systemInfo.gpus[0] : null;

    return {
      code: deviceConfig.code,
      cpu_usage: systemInfo.cpu.usage,
      memory_usage: systemInfo.memory.usage,
      gpu_usage: primaryGpu ? (primaryGpu.utilization || 0) : 0,
      gpu_temperature: primaryGpu ? primaryGpu.temperature || GPU_CONFIG.DEFAULT_TEMPERATURE : GPU_CONFIG.DEFAULT_TEMPERATURE,
      model: deviceModel,
      timestamp: getCurrentTimestamp()
    };
  }

  /**
   * 发送旧版心跳（向后兼容）
   */
  // async sendLegacyHeartbeat(
  //   systemInfo: SystemInfo,
  //   deviceConfig: ModelOfMiner<'DeviceConfig'>,
  //   deviceModel: string
  // ): Promise<boolean> {
  //   try {
  //     if (!deviceConfig.isRegistered || !deviceConfig.gatewayAddress) {
  //       return false;
  //     }

  //     const legacyData = this.createLegacyHeartbeatData(systemInfo, deviceConfig, deviceModel);
  //     console.log(`${deviceConfig.gatewayAddress}/node/heartbeat`)
  //     await got.post(`${deviceConfig.gatewayAddress}/node/heartbeat`, {
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       json: legacyData,
  //       timeout: {
  //         request: 10000
  //       }
  //     });

  //     return true;
  //   } catch (error) {
  //     this.logger.warn(`Legacy heartbeat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //     return false;
  //   }
  // }

  /**
   * 批量发送心跳（新版 + 旧版）
   */
  async sendBothHeartbeats(
    systemInfo: SystemInfo,
    deviceConfig: ModelOfMiner<'DeviceConfig'>,
    ipAddress: string,
    deviceType: string,
    deviceModel: string
  ): Promise<{ new: boolean }> {
    const [newResult, 
      // legacyResult
    ] = await Promise.allSettled([
      this.sendHeartbeatSafe(systemInfo, deviceConfig, ipAddress, deviceType, deviceModel),
      // this.sendLegacyHeartbeat(systemInfo, deviceConfig, deviceModel)
    ]);

    return {
      new: newResult.status === 'fulfilled' ? newResult.value : false,
      // legacy: legacyResult.status === 'fulfilled' ? legacyResult.value : false
    };
  }



  /**
   * 工具方法：延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // 心跳管理控制方法
  // ========================================

  /**
   * 获取心跳状态信息
   */
  async getHeartbeatStatus(): Promise<{
    isRegistered: boolean;
    lastHeartbeatTime?: string;
    deviceId: string;
    gatewayAddress: string;
  }> {
    // 优先使用新的配置服务
    const config = this.deviceConfigService.getCurrentConfig();

    return {
      isRegistered: config.isRegistered || false,
      lastHeartbeatTime: new Date().toISOString(),
      deviceId: config.deviceId || '',
      gatewayAddress: config.gatewayAddress || ''
    };
  }

  /**
   * 检查心跳配置是否有效
   */
  isHeartbeatConfigValid(): boolean {
    // 优先使用新的配置服务
    const config = this.deviceConfigService.getCurrentConfig();
    return (config.isRegistered || false) &&
           !!(config.gatewayAddress) &&
           !!(config.code) &&
           !!(config.deviceId);
  }

  /**
   * 获取心跳统计信息
   */
  getHeartbeatStats(): {
    maxRetries: number;
    retryDelay: number;
    isConfigValid: boolean;
    scheduledInterval: string;
  } {
    return {
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      isConfigValid: this.isHeartbeatConfigValid(),
      scheduledInterval: HEARTBEAT_CONFIG.SCHEDULE
    };
  }
}
