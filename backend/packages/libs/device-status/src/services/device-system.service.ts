import { Injectable, Logger } from "@nestjs/common";
import si from 'systeminformation';
import got from 'got-cjs';
import * as os from 'os';
import {
  TDeviceSystem,
  SystemInfo,
  DEVICE_SYSTEM_SERVICE
} from "../device-status.interface";
import { SystemInfoService as CommonSystemInfoService } from '@saito/common';

/**
 * 设备系统服务 - 重构版
 * 
 * 职责：
 * 1. 收集设备系统信息
 * 2. 使用 CommonSystemInfoService 避免重复的 GPU 检测代码
 * 3. 提供设备特定的信息（IP地址、设备类型等）
 * 4. 遵循单一职责原则
 */
@Injectable()
export class DeviceSystemService implements TDeviceSystem {
  private readonly logger = new Logger(DeviceSystemService.name);
  private readonly OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
  
  constructor(
    private readonly commonSystemInfoService: CommonSystemInfoService
  ) {}

  /**
   * 收集系统信息
   * 使用 CommonSystemInfoService 来避免重复代码
   */
  async collectSystemInfo(): Promise<SystemInfo> {
    try {
      // 使用通用系统信息服务获取基础信息
      const commonSystemInfo = await this.commonSystemInfoService.getSystemInfo();
      
      // 获取设备特定信息
      const [ipAddress, deviceType, deviceModel] = await Promise.all([
        this.getIpAddress(),
        this.getDeviceType(),
        this.getDeviceModel()
      ]);

      // 转换格式以匹配 DeviceStatus 的 SystemInfo 接口
      return {
        os: `${commonSystemInfo.platform} (${commonSystemInfo.arch})`,
        cpu: `${commonSystemInfo.cpus} cores`,
        memory: `${commonSystemInfo.totalMemory}GB`,
        graphics: commonSystemInfo.gpus.map(gpu => ({
          model: gpu.name,
          vram: gpu.vram || `${Math.round(gpu.memoryTotal / 1024)}GB`,
          vendor: gpu.vendor,
          type: gpu.type
        })),
        ipAddress,
        deviceType,
        deviceModel
      };
    } catch (error) {
      this.logger.error('Failed to collect system info:', error);
      return this.getDefaultSystemInfo();
    }
  }

  /**
   * 获取设备类型
   */
  async getDeviceType(): Promise<string> {
    try {
      const platform = os.platform();
      const arch = os.arch();
      
      // 基于平台和架构确定设备类型
      if (platform === 'darwin') {
        if (arch === 'arm64') {
          return 'Apple Silicon Mac';
        } else {
          return 'Intel Mac';
        }
      } else if (platform === 'win32') {
        return 'Windows PC';
      } else if (platform === 'linux') {
        return 'Linux Server';
      } else {
        return `${platform} (${arch})`;
      }
    } catch (error) {
      this.logger.debug('Failed to get device type:', error);
      return 'Unknown';
    }
  }

  /**
   * 获取设备型号
   * 使用 CommonSystemInfoService 来避免重复的 GPU 检测代码
   */
  async getDeviceModel(): Promise<string> {
    try {
      // 使用通用系统信息服务获取 GPU 信息
      const systemInfo = await this.commonSystemInfoService.getSystemInfo();

      if (systemInfo.gpus.length > 0) {
        // 返回优先级最高的 GPU 型号（已按优先级排序）
        const primaryGPU = systemInfo.gpus[0];
        return `${primaryGPU.vendor} ${primaryGPU.name}`;
      }

      // 如果没有检测到 GPU，尝试获取 CPU 信息作为设备标识
      const cpu = await si.cpu();
      if (cpu.brand) {
        return `${cpu.manufacturer} ${cpu.brand}`;
      }

      // 最后尝试获取系统型号
      const system = await si.system();
      if (system.model && system.model !== 'Unknown') {
        return system.model;
      }

      return 'Unknown Device';
    } catch (error) {
      this.logger.warn('Failed to get device model dynamically:', error);
      return 'Unknown Device';
    }
  }

  /**
   * 获取设备信息（JSON格式）
   */
  async getDeviceInfo(): Promise<string> {
    try {
      const systemInfo = await this.collectSystemInfo();
      return JSON.stringify({
        os: systemInfo.os,
        cpu: systemInfo.cpu,
        memory: systemInfo.memory,
        graphics: systemInfo.graphics
      });
    } catch (error) {
      this.logger.error('Failed to get device info:', error);
      return '{}';
    }
  }

  /**
   * 检查推理框架状态
   */
  async checkFrameworkStatus(): Promise<boolean> {
    try {
      const response = await got.get(`${this.OLLAMA_BASE_URL}/api/tags`, {
        timeout: { request: 5000 },
        throwHttpErrors: false
      });

      return response.statusCode === 200;
    } catch (error) {
      this.logger.debug('Framework status check failed:', error);
      return false;
    }
  }

  /**
   * 获取本地模型列表
   */
  async getLocalModels(): Promise<any[]> {
    try {
      const response = await got.get(`${this.OLLAMA_BASE_URL}/api/tags`, {
        timeout: { request: 10000 },
        throwHttpErrors: false
      });

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        return data.models || [];
      }

      return [];
    } catch (error) {
      this.logger.debug('Failed to get local models:', error);
      return [];
    }
  }

  /**
   * 获取IP地址
   */
  private async getIpAddress(): Promise<string> {
    try {
      const networkInterfaces = await si.networkInterfaces();
      const activeInterface = networkInterfaces.find(
        iface => !iface.internal && iface.ip4 && iface.operstate === 'up'
      );
      return activeInterface?.ip4 || 'Unknown';
    } catch (error) {
      this.logger.debug('Failed to get IP address:', error);
      return 'Unknown';
    }
  }

  /**
   * 获取默认系统信息
   */
  private getDefaultSystemInfo(): SystemInfo {
    return {
      os: 'Unknown',
      cpu: 'Unknown',
      memory: 'Unknown',
      graphics: [],
      ipAddress: 'Unknown',
      deviceType: 'Unknown',
      deviceModel: 'Unknown'
    };
  }
}

const DeviceSystemServiceProvider = {
  provide: DEVICE_SYSTEM_SERVICE,
  useClass: DeviceSystemService
};

export default DeviceSystemServiceProvider;
