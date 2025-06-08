import { Injectable, Logger } from "@nestjs/common";
import si from 'systeminformation';
import got from 'got-cjs';
import * as R from 'ramda';
import { execSync } from 'child_process';
import * as os from 'os';
import {
  TDeviceSystem,
  SystemInfo,
  DEVICE_SYSTEM_SERVICE
} from "../device-status.interface";

/**
 * GPU 信息接口
 */
interface GPUInfo {
  model: string;
  vram: string;
  vendor: string;
  type: 'integrated' | 'discrete' | 'unknown';
  priority: number; // 优先级，数字越大优先级越高
}

/**
 * 平台特定的 GPU 检测器
 */
interface PlatformGPUDetector {
  detectGPUs(): Promise<GPUInfo[]>;
}

/**
 * 设备系统服务
 * 负责系统信息收集、框架状态检查和模型管理
 */
@Injectable()
export class DeviceSystemService implements TDeviceSystem {
  private readonly logger = new Logger(DeviceSystemService.name);
  private readonly OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

  /**
   * 收集系统信息
   */
  async collectSystemInfo(): Promise<SystemInfo> {
    try {
      const [osInfo, cpu, mem, ipAddress, deviceType, deviceModel] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        this.getIpAddress(),
        this.getDeviceType(),
        this.getDeviceModel()
      ]);

      // 获取增强的 GPU 信息
      const gpuInfo = await this.getEnhancedGPUInfo();

      return {
        os: `${osInfo.distro} ${osInfo.release} (${osInfo.arch})`,
        cpu: `${cpu.manufacturer} ${cpu.brand} ${cpu.speed}GHz`,
        memory: `${(mem.total / 1024 / 1024 / 1024).toFixed(1)}GB`,
        graphics: gpuInfo.map(gpu => ({
          model: gpu.model,
          vram: gpu.vram,
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
   * 获取增强的 GPU 信息
   * 支持 Linux、Windows、macOS 的完整 GPU 检测
   */
  private async getEnhancedGPUInfo(): Promise<GPUInfo[]> {
    const platform = os.platform();
    this.logger.debug(`Detecting GPUs on platform: ${platform}`);

    try {
      let gpus: GPUInfo[] = [];

      switch (platform) {
        case 'darwin':
          gpus = await this.detectMacOSGPUs();
          break;
        case 'win32':
          gpus = await this.detectWindowsGPUs();
          break;
        case 'linux':
          gpus = await this.detectLinuxGPUs();
          break;
        default:
          this.logger.warn(`Unsupported platform: ${platform}, falling back to systeminformation`);
          gpus = await this.detectFallbackGPUs();
      }

      // 按优先级排序：独立显卡优先
      gpus.sort((a, b) => b.priority - a.priority);

      this.logger.debug(`Detected ${gpus.length} GPU(s):`, gpus.map(gpu => `${gpu.model} (${gpu.type})`));

      return gpus;
    } catch (error) {
      this.logger.error('Failed to detect GPUs:', error);
      return await this.detectFallbackGPUs();
    }
  }

  /**
   * macOS GPU 检测
   * 支持：Intel 集成显卡、AMD/NVIDIA 独立显卡、Apple Silicon GPU
   */
  private async detectMacOSGPUs(): Promise<GPUInfo[]> {
    const gpus: GPUInfo[] = [];

    try {
      // 使用 system_profiler 获取显卡信息
      const output = execSync('system_profiler SPDisplaysDataType -json', {
        encoding: 'utf8',
        timeout: 10000
      });

      const data = JSON.parse(output);
      const displays = data.SPDisplaysDataType || [];

      for (const display of displays) {
        const model = display.sppci_model || display._name || 'Unknown GPU';
        const vramMB = display.sppci_vram_shared || display.sppci_vram || 0;
        const vram = vramMB ? `${Math.round(vramMB / 1024)}GB` : 'Unknown';
        const vendor = this.detectGPUVendor(model);

        // 检测 GPU 类型
        let type: 'integrated' | 'discrete' | 'unknown' = 'unknown';
        let priority = 1;

        if (model.toLowerCase().includes('apple')) {
          // Apple Silicon GPU (M1, M2, M3 等)
          type = 'integrated';
          priority = 8; // Apple Silicon 优先级很高
        } else if (model.toLowerCase().includes('intel')) {
          // Intel 集成显卡
          type = 'integrated';
          priority = 3;
        } else if (vendor === 'AMD' || vendor === 'NVIDIA') {
          // AMD/NVIDIA 独立显卡
          type = 'discrete';
          priority = 10;
        }

        gpus.push({
          model,
          vram,
          vendor,
          type,
          priority
        });
      }

      // 如果没有检测到显卡，尝试检测 Apple Silicon
      if (gpus.length === 0) {
        const appleGPU = await this.detectAppleSiliconGPU();
        if (appleGPU) {
          gpus.push(appleGPU);
        }
      }

    } catch (error) {
      this.logger.debug('Failed to detect macOS GPUs via system_profiler:', error);

      // 备用方案：检测 Apple Silicon
      const appleGPU = await this.detectAppleSiliconGPU();
      if (appleGPU) {
        gpus.push(appleGPU);
      }
    }

    return gpus;
  }

  /**
   * 检测 Apple Silicon GPU
   */
  private async detectAppleSiliconGPU(): Promise<GPUInfo | null> {
    try {
      const output = execSync('sysctl -n machdep.cpu.brand_string', {
        encoding: 'utf8',
        timeout: 5000
      });

      if (output.toLowerCase().includes('apple')) {
        // 尝试获取更详细的芯片信息
        let chipModel = 'Apple Silicon GPU';
        try {
          const chipOutput = execSync('sysctl -n hw.model', {
            encoding: 'utf8',
            timeout: 5000
          });

          if (chipOutput.includes('Mac')) {
            // 根据机型推断芯片类型
            if (chipOutput.includes('14') || chipOutput.includes('15')) {
              chipModel = 'Apple M1 GPU';
            } else if (chipOutput.includes('16') || chipOutput.includes('17')) {
              chipModel = 'Apple M2 GPU';
            } else {
              chipModel = 'Apple M-series GPU';
            }
          }
        } catch (e) {
          // 忽略错误，使用默认名称
        }

        return {
          model: chipModel,
          vram: 'Unified Memory',
          vendor: 'Apple',
          type: 'integrated',
          priority: 8
        };
      }
    } catch (error) {
      this.logger.debug('Failed to detect Apple Silicon:', error);
    }

    return null;
  }

  /**
   * 获取设备类型
   * 动态检测设备类型，不依赖环境变量
   */
  async getDeviceType(): Promise<string> {
    try {
      const platform = os.platform();
      const osInfo = await si.osInfo();

      // 基于操作系统和硬件信息动态判断设备类型
      switch (platform) {
        case 'darwin':
          // macOS 设备
          if (osInfo.arch === 'arm64') {
            return 'Apple Silicon Mac';
          } else {
            return 'Intel Mac';
          }

        case 'win32':
          // Windows 设备
          const chassis = await si.chassis();
          if (chassis.type) {
            // 根据机箱类型判断
            switch (chassis.type.toLowerCase()) {
              case 'desktop':
              case 'tower':
              case 'mini-tower':
                return 'Desktop PC';
              case 'laptop':
              case 'notebook':
              case 'portable':
                return 'Laptop';
              case 'server':
                return 'Server';
              default:
                return 'Windows PC';
            }
          }
          return 'Windows PC';

        case 'linux':
          // Linux 设备
          const system = await si.system();
          if (system.model && system.model.toLowerCase().includes('server')) {
            return 'Linux Server';
          } else if (system.model && system.model.toLowerCase().includes('raspberry')) {
            return 'Raspberry Pi';
          } else {
            return 'Linux Desktop';
          }

        default:
          return `${platform} Device`;
      }
    } catch (error) {
      this.logger.warn('Failed to detect device type dynamically:', error);
      return 'Unknown Device';
    }
  }

  /**
   * Windows GPU 检测
   * 支持：Intel 集成显卡、AMD/NVIDIA 独立显卡
   */
  private async detectWindowsGPUs(): Promise<GPUInfo[]> {
    const gpus: GPUInfo[] = [];

    try {
      // 使用 wmic 获取显卡信息
      const output = execSync('wmic path win32_VideoController get Name,AdapterRAM,PNPDeviceID /format:csv', {
        encoding: 'utf8',
        timeout: 10000
      });

      const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const model = parts[2]?.trim() || 'Unknown GPU';
          const ramBytes = parseInt(parts[1]?.trim() || '0');
          const vram = ramBytes > 0 ? `${Math.round(ramBytes / 1024 / 1024 / 1024)}GB` : 'Unknown';
          const pnpId = parts[3]?.trim() || '';

          const vendor = this.detectGPUVendor(model);

          // 检测 GPU 类型
          let type: 'integrated' | 'discrete' | 'unknown' = 'unknown';
          let priority = 1;

          if (pnpId.includes('PCI\\VEN_8086') || model.toLowerCase().includes('intel')) {
            // Intel 集成显卡
            type = 'integrated';
            priority = 3;
          } else if (pnpId.includes('PCI\\VEN_10DE') || model.toLowerCase().includes('nvidia')) {
            // NVIDIA 独立显卡
            type = 'discrete';
            priority = 10;
          } else if (pnpId.includes('PCI\\VEN_1002') || model.toLowerCase().includes('amd') || model.toLowerCase().includes('radeon')) {
            // AMD 独立显卡
            type = 'discrete';
            priority = 9;
          }

          gpus.push({
            model,
            vram,
            vendor,
            type,
            priority
          });
        }
      }

    } catch (error) {
      this.logger.debug('Failed to detect Windows GPUs via wmic:', error);

      // 备用方案：使用 PowerShell
      try {
        const psOutput = execSync('powershell "Get-WmiObject -Class Win32_VideoController | Select-Object Name,AdapterRAM,PNPDeviceID | ConvertTo-Json"', {
          encoding: 'utf8',
          timeout: 10000
        });

        const data = JSON.parse(psOutput);
        const controllers = Array.isArray(data) ? data : [data];

        for (const controller of controllers) {
          if (controller.Name) {
            const model = controller.Name;
            const ramBytes = controller.AdapterRAM || 0;
            const vram = ramBytes > 0 ? `${Math.round(ramBytes / 1024 / 1024 / 1024)}GB` : 'Unknown';
            const vendor = this.detectGPUVendor(model);

            let type: 'integrated' | 'discrete' | 'unknown' = 'unknown';
            let priority = 1;

            if (model.toLowerCase().includes('intel')) {
              type = 'integrated';
              priority = 3;
            } else if (model.toLowerCase().includes('nvidia')) {
              type = 'discrete';
              priority = 10;
            } else if (model.toLowerCase().includes('amd') || model.toLowerCase().includes('radeon')) {
              type = 'discrete';
              priority = 9;
            }

            gpus.push({
              model,
              vram,
              vendor,
              type,
              priority
            });
          }
        }

      } catch (psError) {
        this.logger.debug('Failed to detect Windows GPUs via PowerShell:', psError);
      }
    }

    return gpus;
  }

  /**
   * Linux GPU 检测
   * 支持：Intel 集成显卡、AMD/NVIDIA 独立显卡
   */
  private async detectLinuxGPUs(): Promise<GPUInfo[]> {
    const gpus: GPUInfo[] = [];

    try {
      // 使用 lspci 获取显卡信息
      const output = execSync('lspci | grep -i vga', {
        encoding: 'utf8',
        timeout: 10000
      });

      const lines = output.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const model = line.split(': ')[1] || 'Unknown GPU';
        const vendor = this.detectGPUVendor(model);

        // 尝试获取 VRAM 信息
        let vram = 'Unknown';
        try {
          if (vendor === 'NVIDIA') {
            // NVIDIA GPU 使用 nvidia-smi
            const nvidiaOutput = execSync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits', {
              encoding: 'utf8',
              timeout: 5000
            });
            const vramMB = parseInt(nvidiaOutput.trim());
            if (vramMB > 0) {
              vram = `${Math.round(vramMB / 1024)}GB`;
            }
          } else if (vendor === 'AMD') {
            // AMD GPU 尝试从 /sys 读取
            try {
              const amdOutput = execSync('find /sys -name "*memory*" -path "*card*" | head -1 | xargs cat 2>/dev/null || echo "0"', {
                encoding: 'utf8',
                timeout: 5000
              });
              const vramBytes = parseInt(amdOutput.trim());
              if (vramBytes > 0) {
                vram = `${Math.round(vramBytes / 1024 / 1024 / 1024)}GB`;
              }
            } catch (e) {
              // 忽略错误
            }
          }
        } catch (e) {
          // 忽略 VRAM 检测错误
        }

        // 检测 GPU 类型
        let type: 'integrated' | 'discrete' | 'unknown' = 'unknown';
        let priority = 1;

        if (model.toLowerCase().includes('intel')) {
          type = 'integrated';
          priority = 3;
        } else if (vendor === 'NVIDIA') {
          type = 'discrete';
          priority = 10;
        } else if (vendor === 'AMD') {
          type = 'discrete';
          priority = 9;
        }

        gpus.push({
          model,
          vram,
          vendor,
          type,
          priority
        });
      }

    } catch (error) {
      this.logger.debug('Failed to detect Linux GPUs via lspci:', error);
    }

    return gpus;
  }

  /**
   * 备用 GPU 检测（使用 systeminformation）
   */
  private async detectFallbackGPUs(): Promise<GPUInfo[]> {
    try {
      const graphics = await si.graphics();
      const gpus: GPUInfo[] = [];

      for (const controller of graphics.controllers) {
        const model = controller.model || 'Unknown GPU';
        const vramMB = controller.vram || 0;
        const vram = vramMB > 0 ? `${Math.round(vramMB / 1024)}GB` : 'Unknown';
        const vendor = this.detectGPUVendor(model);

        // 简单的类型检测
        let type: 'integrated' | 'discrete' | 'unknown' = 'unknown';
        let priority = 1;

        if (model.toLowerCase().includes('intel')) {
          type = 'integrated';
          priority = 3;
        } else if (vendor === 'NVIDIA' || vendor === 'AMD') {
          type = 'discrete';
          priority = vendor === 'NVIDIA' ? 10 : 9;
        }

        gpus.push({
          model,
          vram,
          vendor,
          type,
          priority
        });
      }

      return gpus;
    } catch (error) {
      this.logger.error('Failed to detect GPUs via systeminformation:', error);
      return [];
    }
  }

  /**
   * 检测 GPU 厂商
   */
  private detectGPUVendor(model: string): string {
    const modelLower = model.toLowerCase();

    if (modelLower.includes('nvidia') || modelLower.includes('geforce') || modelLower.includes('quadro') || modelLower.includes('tesla')) {
      return 'NVIDIA';
    } else if (modelLower.includes('amd') || modelLower.includes('radeon') || modelLower.includes('rx ') || modelLower.includes('vega')) {
      return 'AMD';
    } else if (modelLower.includes('intel') || modelLower.includes('iris') || modelLower.includes('uhd')) {
      return 'Intel';
    } else if (modelLower.includes('apple')) {
      return 'Apple';
    } else {
      return 'Unknown';
    }
  }

  /**
   * 获取设备型号
   * 动态获取主要 GPU 型号，不依赖环境变量
   */
  async getDeviceModel(): Promise<string> {
    try {
      // 获取 GPU 信息
      const gpuInfo = await this.getEnhancedGPUInfo();

      if (gpuInfo.length > 0) {
        // 返回优先级最高的 GPU 型号（已按优先级排序）
        const primaryGPU = gpuInfo[0];
        return `${primaryGPU.vendor} ${primaryGPU.model}`;
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
      this.logger.error('Failed to get local models:', error);
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
