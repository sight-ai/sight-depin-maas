import { Injectable, Logger } from '@nestjs/common';
import si from 'systeminformation';
import { address } from 'ip';
import { SystemInfo } from '@saito/models';
import {
  DEFAULT_SYSTEM_INFO,
  CACHE_CONFIG,
  NETWORK_CONFIG,
  GPU_CONFIG,
  formatNumber,
  bytesToGB,
  kbpsToMbps,
  isAppleSiliconGpu
} from '../constants/system-info.constants';

/**
 * 系统信息收集器
 * 
 * 负责收集各种系统信息：
 * 1. CPU 信息和使用率
 * 2. 内存信息和使用率
 * 3. GPU 信息和使用率
 * 4. 磁盘信息和使用率
 * 5. 网络信息和流量
 * 6. 操作系统信息
 */
@Injectable()
export class SystemInfoCollector {
  private readonly logger = new Logger(SystemInfoCollector.name);
  private cachedSystemInfo: SystemInfo | null = null;
  private lastCacheTime = 0;
  private readonly cacheTimeout = CACHE_CONFIG.TIMEOUT;

  /**
   * 收集完整的系统信息
   */
  async collectSystemInfo(): Promise<SystemInfo> {
    // 检查缓存
    const now = Date.now();
    if (this.cachedSystemInfo && (now - this.lastCacheTime) < this.cacheTimeout) {
      return this.cachedSystemInfo;
    }

    try {
      // 并行收集所有系统信息
      const [cpuInfo, memoryInfo, gpuInfo, diskInfo, networkInfo, osInfo] = await Promise.all([
        this.getCpuInfo(),
        this.getMemoryInfo(),
        this.getGpuInfo(),
        this.getDiskInfo(),
        this.getNetworkInfo(),
        this.getOsInfo()
      ]);

      const systemInfo: SystemInfo = {
        cpu: cpuInfo,
        memory: memoryInfo,
        gpu: gpuInfo,
        disk: diskInfo,
        network: networkInfo,
        os: osInfo
      };

      // 更新缓存
      this.cachedSystemInfo = systemInfo;
      this.lastCacheTime = now;

      return systemInfo;
    } catch (error) {
      this.logger.error(`Failed to collect system info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // 返回默认值以确保系统稳定性
      return this.getDefaultSystemInfo();
    }
  }

  /**
   * 获取 CPU 信息
   */
  private async getCpuInfo() {
    try {
      const [cpuData, currentLoad, cpuTemp] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.cpuTemperature().catch(() => ({ main: undefined })) // 温度可能获取失败
      ]);

      return {
        model: cpuData.manufacturer + ' ' + cpuData.brand,
        cores: cpuData.cores,
        threads: cpuData.cores * (cpuData.processors || 1),
        usage: formatNumber(currentLoad.currentLoad),
        temperature: cpuTemp.main
      };
    } catch (error) {
      this.logger.warn(`Failed to get CPU info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        model: 'Unknown CPU',
        cores: 1,
        threads: 1,
        usage: 0,
        temperature: undefined
      };
    }
  }

  /**
   * 获取内存信息
   */
  private async getMemoryInfo() {
    try {
      const memData = await si.mem();
      const totalGB = bytesToGB(memData.total);
      const usedGB = bytesToGB(memData.used);
      const usage = (memData.used / memData.total) * 100;

      return {
        total: totalGB,
        used: usedGB,
        usage: formatNumber(usage)
      };
    } catch (error) {
      this.logger.warn(`Failed to get memory info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        total: 8,
        used: 4,
        usage: 50
      };
    }
  }

  /**
   * 获取 GPU 信息
   */
  private async getGpuInfo() {
    try {
      const gpuData = await si.graphics();
      const gpus = gpuData.controllers || [];

      return gpus.map(gpu => ({
        model: gpu.model || 'Unknown GPU',
        vendor: gpu.vendor || 'Unknown',
        memory: bytesToGB(gpu.vram || 0),
        usage: 0, // systeminformation 不直接提供 GPU 使用率
        temperature: undefined,
        isAppleSilicon: isAppleSiliconGpu(gpu.vendor || '')
      }));
    } catch (error) {
      this.logger.warn(`Failed to get GPU info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * 获取磁盘信息
   */
  private async getDiskInfo() {
    try {
      const diskData = await si.fsSize();
      
      // 计算总磁盘空间
      const totalBytes = diskData.reduce((sum, disk) => sum + disk.size, 0);
      const usedBytes = diskData.reduce((sum, disk) => sum + disk.used, 0);

      const totalGB = bytesToGB(totalBytes);
      const usedGB = bytesToGB(usedBytes);
      const usage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

      return {
        total: totalGB,
        used: usedGB,
        usage: formatNumber(usage)
      };
    } catch (error) {
      this.logger.warn(`Failed to get disk info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        total: 100,
        used: 50,
        usage: 50
      };
    }
  }

  /**
   * 获取网络信息
   */
  private async getNetworkInfo() {
    try {
      const networkStats = await si.networkStats();
      
      if (networkStats.length > 0) {
        const primaryInterface = networkStats[0];
        return {
          inbound: kbpsToMbps(primaryInterface.rx_sec || 0),
          outbound: kbpsToMbps(primaryInterface.tx_sec || 0)
        };
      }

      return { inbound: 0, outbound: 0 };
    } catch (error) {
      this.logger.warn(`Failed to get network info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { inbound: 0, outbound: 0 };
    }
  }

  /**
   * 获取操作系统信息
   */
  private async getOsInfo() {
    try {
      const [osData, uptimeData] = await Promise.all([
        si.osInfo(),
        si.time()
      ]);

      return {
        name: osData.distro || osData.platform,
        version: osData.release,
        arch: osData.arch,
        platform: osData.platform,
        uptime: uptimeData.uptime || 0
      };
    } catch (error) {
      this.logger.warn(`Failed to get OS info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        name: 'Unknown OS',
        version: '0.0.0',
        arch: 'unknown',
        platform: 'unknown',
        uptime: 0
      };
    }
  }

  /**
   * 获取设备类型
   */
  async getDeviceType(): Promise<string> {
    try {
      const osData = await si.osInfo();
      const platform = osData.platform.toLowerCase();
      
      if (platform.includes('darwin')) return 'macOS';
      if (platform.includes('win')) return 'Windows';
      if (platform.includes('linux')) return 'Linux';

      return 'Unknown';
    } catch (error) {
      this.logger.warn(`Failed to get device type: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 'Unknown';
    }
  }

  /**
   * 获取设备型号
   */
  async getDeviceModel(): Promise<string> {
    try {
      const [systemData, cpuData] = await Promise.all([
        si.system(),
        si.cpu()
      ]);

      if (systemData.model && systemData.model !== 'Unknown') {
        return `${systemData.manufacturer || ''} ${systemData.model}`.trim();
      }

      // 如果系统型号不可用，使用 CPU 型号
      return `${cpuData.manufacturer || ''} ${cpuData.brand || 'Unknown'}`.trim();
    } catch (error) {
      this.logger.warn(`Failed to get device model: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 'Unknown Device';
    }
  }

  /**
   * 获取 IP 地址
   */
  async getIpAddress(): Promise<string> {
    try {
      return address() || NETWORK_CONFIG.DEFAULT_IP;
    } catch (error) {
      this.logger.warn(`Failed to get IP address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return NETWORK_CONFIG.DEFAULT_IP;
    }
  }



  /**
   * 获取默认系统信息（用于错误恢复）
   */
  private getDefaultSystemInfo(): SystemInfo {
    return DEFAULT_SYSTEM_INFO;
  }

  /**
   * 清除缓存（用于测试或强制刷新）
   */
  clearCache(): void {
    this.cachedSystemInfo = null;
    this.lastCacheTime = 0;
  }
}
