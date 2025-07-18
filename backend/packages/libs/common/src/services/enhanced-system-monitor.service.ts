import { Injectable, Logger } from '@nestjs/common';
import * as si from 'systeminformation';
import * as os from 'os';

export interface SystemResourceMetrics {
  cpu: {
    usage: number;
    temperature?: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  gpus: Array<{
    name: string;
    memory: number;
    usage: number;
    temperature: number;
    vendor: string;
  }>;
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  os: {
    name: string;
    version: string;
    arch: string;
    uptime: number;
  };
  timestamp: string;
}

/**
 * 增强的系统监控服务
 * 提供实时系统资源监控，包括CPU、内存、GPU、磁盘和网络使用情况
 */
@Injectable()
export class EnhancedSystemMonitorService {
  private readonly logger = new Logger(EnhancedSystemMonitorService.name);
  private cpuUsageCache: number = 0;
  private lastCpuCheck: number = 0;
  private readonly CPU_CACHE_DURATION = 1000; // 1秒缓存

  /**
   * 获取完整的系统资源指标
   */
  async getSystemMetrics(): Promise<SystemResourceMetrics> {
    try {
      const [
        cpuInfo,
        memInfo,
        gpuInfo,
        diskInfo,
        networkInfo,
        osInfo,
        cpuUsage,
        cpuTemp
      ] = await Promise.all([
        si.cpu(),
        si.mem(),
        this.getGpuMetrics(),
        this.getDiskMetrics(),
        this.getNetworkMetrics(),
        si.osInfo(),
        this.getCpuUsage(),
        this.getCpuTemperature()
      ]);

      return {
        cpu: {
          usage: cpuUsage,
          temperature: cpuTemp,
          cores: cpuInfo.cores,
          model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`
        },
        memory: {
          total: Math.round(memInfo.total / 1024 / 1024 / 1024), // GB
          used: Math.round((memInfo.total - memInfo.available) / 1024 / 1024 / 1024), // GB (排除swap)
          free: Math.round(memInfo.available / 1024 / 1024 / 1024), // GB (使用available而不是free)
          usage: Math.round(((memInfo.total - memInfo.available) / memInfo.total) * 100)
        },
        gpus: gpuInfo,
        disk: diskInfo,
        network: networkInfo,
        os: {
          name: `${osInfo.distro} ${osInfo.release}`,
          version: osInfo.kernel,
          arch: osInfo.arch,
          uptime: Math.round(os.uptime())
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get system metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * 获取CPU使用率（带缓存优化）
   */
  private async getCpuUsage(): Promise<number> {
    const now = Date.now();
    
    // 如果缓存未过期，返回缓存值
    if (now - this.lastCpuCheck < this.CPU_CACHE_DURATION) {
      return this.cpuUsageCache;
    }

    try {
      const cpuLoad = await si.currentLoad();
      this.cpuUsageCache = Math.round(cpuLoad.currentLoad);
      this.lastCpuCheck = now;
      return this.cpuUsageCache;
    } catch (error) {
      this.logger.warn('Failed to get CPU usage:', error);
      return 0;
    }
  }

  /**
   * 获取CPU温度
   */
  private async getCpuTemperature(): Promise<number | undefined> {
    try {
      const temp = await si.cpuTemperature();
      return temp.main || undefined;
    } catch (error) {
      // CPU温度获取失败是正常的，不记录错误
      return undefined;
    }
  }

  /**
   * 获取GPU指标（增强版，支持温度监控和集成显卡降级）
   */
  private async getGpuMetrics(): Promise<Array<{
    name: string;
    memory: number;
    usage: number;
    temperature: number;
    vendor: string;
  }>> {
    try {
      const graphics = await si.graphics();
      const gpuMetrics = [];
      let hasDiscreteGpu = false;

      for (const gpu of graphics.controllers) {
        // 尝试获取GPU使用率和温度
        let usage = 0;
        let temperature = 0;
        let memory = gpu.vram || 0;

        // 检测是否为独立显卡
        const isDiscrete = this.isDiscreteGpu(gpu);
        if (isDiscrete) {
          hasDiscreteGpu = true;
        }

        // 对于NVIDIA GPU，尝试使用nvidia-smi获取详细信息
        if (gpu.vendor?.toLowerCase().includes('nvidia')) {
          try {
            const nvidiaMetrics = await this.getNvidiaGpuMetrics();
            if (nvidiaMetrics.length > 0) {
              usage = nvidiaMetrics[0].usage;
              temperature = nvidiaMetrics[0].temperature;
              memory = nvidiaMetrics[0].memory || memory;
            }
          } catch (e) {
            // 忽略nvidia-smi错误
          }
        }

        // 对于AMD GPU，尝试获取温度信息
        if (gpu.vendor?.toLowerCase().includes('amd')) {
          try {
            const amdTemp = await this.getAmdGpuTemperature();
            if (amdTemp > 0) {
              temperature = amdTemp;
            }
          } catch (e) {
            // 忽略AMD温度获取错误
          }
        }

        gpuMetrics.push({
          name: gpu.model || 'Unknown GPU',
          memory,
          usage,
          temperature,
          vendor: gpu.vendor || 'Unknown'
        });
      }

      // 如果没有检测到独立显卡或GPU信息不完整，使用集成显卡降级处理
      if (!hasDiscreteGpu || gpuMetrics.length === 0 || this.shouldUseFallback(gpuMetrics)) {
        return await this.getIntegratedGpuFallback();
      }

      return gpuMetrics;
    } catch (error) {
      this.logger.warn('Failed to get GPU metrics:', error);
      // 降级到集成显卡处理
      return await this.getIntegratedGpuFallback();
    }
  }

  /**
   * 获取NVIDIA GPU详细指标（增强版）
   */
  private async getNvidiaGpuMetrics(): Promise<Array<{
    usage: number;
    temperature: number;
    memory?: number;
  }>> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,memory.total --format=csv,noheader,nounits',
        { timeout: 5000 }
      );

      const lines = stdout.trim().split('\n');
      return lines.map((line: string) => {
        const [usage, temp, memory] = line.split(', ').map((val: string) => parseInt(val.trim()) || 0);
        return {
          usage,
          temperature: temp,
          memory: memory > 0 ? memory : undefined
        };
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取AMD GPU温度
   */
  private async getAmdGpuTemperature(): Promise<number> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // 尝试从 /sys 文件系统读取AMD GPU温度
      const { stdout } = await execAsync(
        'find /sys -name "temp*_input" -path "*card*" | head -1 | xargs cat 2>/dev/null || echo "0"',
        { timeout: 3000 }
      );

      const tempMilliCelsius = parseInt(stdout.trim());
      return tempMilliCelsius > 0 ? Math.round(tempMilliCelsius / 1000) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 检测是否为独立显卡
   */
  private isDiscreteGpu(gpu: any): boolean {
    if (!gpu.model && !gpu.vendor) return false;

    const model = (gpu.model || '').toLowerCase();
    const vendor = (gpu.vendor || '').toLowerCase();

    // 集成显卡关键词
    const integratedKeywords = ['intel', 'integrated', 'uhd', 'iris', 'apple', 'shared'];

    return !integratedKeywords.some(keyword =>
      model.includes(keyword) || vendor.includes(keyword)
    );
  }

  /**
   * 判断是否应该使用降级处理
   */
  private shouldUseFallback(gpuMetrics: Array<{
    name: string;
    memory: number;
    usage: number;
    temperature: number;
    vendor: string;
  }>): boolean {
    return gpuMetrics.every(gpu =>
      gpu.memory === 0 && gpu.temperature === 0
    );
  }

  /**
   * 集成显卡降级处理（使用系统内存和CPU温度）
   */
  private async getIntegratedGpuFallback(): Promise<Array<{
    name: string;
    memory: number;
    usage: number;
    temperature: number;
    vendor: string;
  }>> {
    try {
      // 获取系统内存信息作为GPU内存
      const memInfo = await si.mem();
      const systemMemoryGB = Math.round(memInfo.total / 1024 / 1024 / 1024);

      // 获取CPU温度作为GPU温度
      const cpuTemp = await this.getCpuTemperature();

      // 获取基本GPU信息
      const graphics = await si.graphics();
      const fallbackGpus = [];

      if (graphics.controllers && graphics.controllers.length > 0) {
        for (const gpu of graphics.controllers) {
          fallbackGpus.push({
            name: gpu.model || 'Integrated Graphics',
            memory: systemMemoryGB, // 使用系统内存
            usage: 0, // 集成显卡使用率难以准确获取
            temperature: cpuTemp || 0, // 使用CPU温度
            vendor: gpu.vendor || 'Unknown'
          });
        }
      } else {
        // 如果没有检测到任何GPU，创建一个默认的集成显卡条目
        fallbackGpus.push({
          name: 'Integrated Graphics',
          memory: systemMemoryGB,
          usage: 0,
          temperature: cpuTemp || 0,
          vendor: 'Unknown'
        });
      }

      this.logger.debug('Using integrated GPU fallback with system memory and CPU temperature');
      return fallbackGpus;
    } catch (error) {
      this.logger.warn('Failed to get integrated GPU fallback:', error);
      return [{
        name: 'Unknown GPU',
        memory: 0,
        usage: 0,
        temperature: 0,
        vendor: 'Unknown'
      }];
    }
  }

  /**
   * 获取磁盘指标
   */
  private async getDiskMetrics(): Promise<{
    total: number;
    used: number;
    free: number;
    usage: number;
  }> {
    try {
      const fsSize = await si.fsSize();
      const mainDisk = fsSize[0] || { size: 0, used: 0, available: 0 };
      
      const total = Math.round(mainDisk.size / 1024 / 1024 / 1024); // GB
      const used = Math.round(mainDisk.used / 1024 / 1024 / 1024); // GB
      const free = Math.round(mainDisk.available / 1024 / 1024 / 1024); // GB
      const usage = total > 0 ? Math.round((used / total) * 100) : 0;

      return { total, used, free, usage };
    } catch (error) {
      this.logger.warn('Failed to get disk metrics:', error);
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  /**
   * 获取网络指标
   */
  private async getNetworkMetrics(): Promise<{
    rx: number;
    tx: number;
  }> {
    try {
      const networkStats = await si.networkStats();
      const mainInterface = networkStats[0] || { rx_sec: 0, tx_sec: 0 };
      
      return {
        rx: Math.round(mainInterface.rx_sec / 1024), // KB/s
        tx: Math.round(mainInterface.tx_sec / 1024)  // KB/s
      };
    } catch (error) {
      this.logger.warn('Failed to get network metrics:', error);
      return { rx: 0, tx: 0 };
    }
  }

  /**
   * 获取默认指标（错误时使用）
   */
  private getDefaultMetrics(): SystemResourceMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: {
        usage: 0,
        temperature: undefined,
        cores: os.cpus().length,
        model: 'Unknown CPU'
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024 / 1024),
        usage: Math.round((usedMem / totalMem) * 100)
      },
      gpus: [{
        name: 'Integrated Graphics',
        memory: Math.round(totalMem / 1024 / 1024 / 1024),
        usage: 0,
        temperature: 0,
        vendor: 'Unknown'
      }],
      disk: { total: 0, used: 0, free: 0, usage: 0 },
      network: { rx: 0, tx: 0 },
      os: {
        name: os.type(),
        version: os.release(),
        arch: os.arch(),
        uptime: Math.round(os.uptime())
      },
      timestamp: new Date().toISOString()
    };
  }
}
