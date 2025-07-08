import { Injectable, Logger } from '@nestjs/common';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * GPU 信息接口
 */
export interface GpuInfo {
  index: number;
  name: string;
  memoryTotal: number; // MB
  memoryUsed: number; // MB
  memoryFree: number; // MB
  utilization: number; // %
  temperature: number; // °C
  powerDraw: number; // W
  powerLimit: number; // W
  vendor: string; // NVIDIA, AMD, Intel, Apple
  type: 'integrated' | 'discrete' | 'unknown';
  vram?: string; // 格式化的显存信息，如 "8GB"
  priority?: number; // 优先级，用于排序
}

/**
 * 系统信息接口
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number; // GB
  freeMemory: number; // GB
  gpus: GpuInfo[];
  cudaVersion?: string;
  pythonVersion?: string;
  torchVersion?: string;
}

/**
 * 系统信息服务
 * 负责获取系统硬件信息，特别是 GPU 信息
 */
@Injectable()
export class SystemInfoService {
  private readonly logger = new Logger(SystemInfoService.name);

  /**
   * 检测GPU供应商
   */
  private detectGPUVendor(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('nvidia') || lowerName.includes('geforce') || lowerName.includes('quadro') || lowerName.includes('tesla')) {
      return 'NVIDIA';
    } else if (lowerName.includes('amd') || lowerName.includes('radeon') || lowerName.includes('rx ') || lowerName.includes('vega')) {
      return 'AMD';
    } else if (lowerName.includes('intel') || lowerName.includes('iris') || lowerName.includes('uhd') || lowerName.includes('hd graphics')) {
      return 'Intel';
    } else if (lowerName.includes('apple') || lowerName.includes('m1') || lowerName.includes('m2') || lowerName.includes('m3')) {
      return 'Apple';
    }
    return 'Unknown';
  }

  /**
   * 检测GPU类型和优先级
   */
  private detectGPUTypeAndPriority(name: string, vendor: string): { type: 'integrated' | 'discrete' | 'unknown'; priority: number } {
    const lowerName = name.toLowerCase();

    if (vendor === 'Intel' || lowerName.includes('integrated') || lowerName.includes('uhd') || lowerName.includes('hd graphics')) {
      return { type: 'integrated', priority: 3 };
    } else if (vendor === 'NVIDIA') {
      return { type: 'discrete', priority: 10 };
    } else if (vendor === 'AMD' && (lowerName.includes('radeon') || lowerName.includes('rx '))) {
      return { type: 'discrete', priority: 9 };
    } else if (vendor === 'Apple') {
      return { type: 'integrated', priority: 8 }; // Apple Silicon GPU是集成的但性能很好
    }

    return { type: 'unknown', priority: 1 };
  }

  /**
   * 获取完整的系统信息
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const [gpus, cudaVersion, pythonVersion, torchVersion] = await Promise.all([
      this.getGpuInfo(),
      this.getCudaVersion(),
      this.getPythonVersion(),
      this.getTorchVersion()
    ]);

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // Convert to GB
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)), // Convert to GB
      gpus,
      cudaVersion,
      pythonVersion,
      torchVersion
    };
  }

  /**
   * 获取 GPU 信息 - 增强版本，支持多平台检测
   */
  async getGpuInfo(): Promise<GpuInfo[]> {
    const platform = os.platform();

    try {
      let gpus: GpuInfo[] = [];

      // 首先尝试nvidia-smi获取NVIDIA GPU详细信息
      try {
        const nvidiaGpus = await this.getNvidiaGpuInfo();
        if (nvidiaGpus.length > 0) {
          gpus.push(...nvidiaGpus);
        }
      } catch (error) {
        this.logger.debug('NVIDIA GPU detection failed:', error);
      }

      // 然后根据平台获取其他GPU信息
      switch (platform) {
        case 'darwin':
          const macGpus = await this.detectMacOSGPUs();
          // 过滤掉已经通过nvidia-smi检测到的GPU
          const nonNvidiaMacGpus = macGpus.filter(gpu => gpu.vendor !== 'NVIDIA');
          gpus.push(...nonNvidiaMacGpus);
          break;
        case 'win32':
          const winGpus = await this.detectWindowsGPUs();
          const nonNvidiaWinGpus = winGpus.filter(gpu => gpu.vendor !== 'NVIDIA');
          gpus.push(...nonNvidiaWinGpus);
          break;
        case 'linux':
          const linuxGpus = await this.detectLinuxGPUs();
          const nonNvidiaLinuxGpus = linuxGpus.filter(gpu => gpu.vendor !== 'NVIDIA');
          gpus.push(...nonNvidiaLinuxGpus);
          break;
        default:
          this.logger.warn(`Unsupported platform: ${platform}, using fallback detection`);
          const fallbackGpus = await this.getGpuInfoFallback();
          gpus.push(...fallbackGpus);
      }

      // 按优先级排序：独立显卡优先
      gpus.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      this.logger.debug(`Detected ${gpus.length} GPU(s):`, gpus.map(gpu => `${gpu.name} (${gpu.vendor}, ${gpu.type})`));

      return gpus;
    } catch (error) {
      this.logger.error('Failed to detect GPUs:', error);
      return [];
    }
  }

  /**
   * 获取NVIDIA GPU信息
   */
  private async getNvidiaGpuInfo(): Promise<GpuInfo[]> {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits');

      const lines = stdout.trim().split('\n');
      const gpus: GpuInfo[] = [];

      for (const line of lines) {
        const parts = line.split(', ').map(part => part.trim());
        if (parts.length >= 9) {
          const memoryTotal = parseInt(parts[2]);
          gpus.push({
            index: parseInt(parts[0]),
            name: parts[1],
            memoryTotal,
            memoryUsed: parseInt(parts[3]),
            memoryFree: parseInt(parts[4]),
            utilization: parseInt(parts[5]),
            temperature: parseInt(parts[6]),
            powerDraw: parseFloat(parts[7]) || 0,
            powerLimit: parseFloat(parts[8]) || 0,
            vendor: 'NVIDIA',
            type: 'discrete',
            vram: memoryTotal > 0 ? `${Math.round(memoryTotal / 1024)}GB` : 'Unknown',
            priority: 10
          });
        }
      }

      return gpus;
    } catch (error) {
      throw new Error(`NVIDIA GPU detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * macOS GPU 检测
   */
  private async detectMacOSGPUs(): Promise<GpuInfo[]> {
    const gpus: GpuInfo[] = [];

    try {
      // 使用 system_profiler 获取显卡信息
      const output = execSync('system_profiler SPDisplaysDataType -json', {
        encoding: 'utf8',
        timeout: 10000
      });

      const data = JSON.parse(output);
      const displays = data.SPDisplaysDataType || [];

      for (let i = 0; i < displays.length; i++) {
        const display = displays[i];
        const model = display.sppci_model || display._name || 'Unknown GPU';
        const vramData = display.sppci_vram || display.spdisplays_vram || '0 MB';

        // 解析显存信息
        let vram = 'Unknown';
        const vramMatch = vramData.match(/(\d+)\s*(MB|GB)/i);
        if (vramMatch) {
          const size = parseInt(vramMatch[1]);
          const unit = vramMatch[2].toUpperCase();
          vram = unit === 'GB' ? `${size}GB` : `${Math.round(size / 1024)}GB`;
        }

        const vendor = this.detectGPUVendor(model);
        const { type, priority } = this.detectGPUTypeAndPriority(model, vendor);

        gpus.push({
          index: i,
          name: model,
          memoryTotal: 0, // macOS不提供实时显存使用信息
          memoryUsed: 0,
          memoryFree: 0,
          utilization: 0,
          temperature: 0,
          powerDraw: 0,
          powerLimit: 0,
          vendor,
          type,
          vram,
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
  private async detectAppleSiliconGPU(): Promise<GpuInfo | null> {
    try {
      const output = execSync('sysctl -n machdep.cpu.brand_string', {
        encoding: 'utf8',
        timeout: 5000
      });

      const cpuBrand = output.trim();
      if (cpuBrand.includes('Apple')) {
        // 检测Apple Silicon型号
        let gpuName = 'Apple GPU';
        let vram = 'Shared';

        if (cpuBrand.includes('M1')) {
          gpuName = 'Apple M1 GPU';
          vram = 'Shared (8-16GB)';
        } else if (cpuBrand.includes('M2')) {
          gpuName = 'Apple M2 GPU';
          vram = 'Shared (8-24GB)';
        } else if (cpuBrand.includes('M3')) {
          gpuName = 'Apple M3 GPU';
          vram = 'Shared (8-36GB)';
        }

        return {
          index: 0,
          name: gpuName,
          memoryTotal: 0,
          memoryUsed: 0,
          memoryFree: 0,
          utilization: 0,
          temperature: 0,
          powerDraw: 0,
          powerLimit: 0,
          vendor: 'Apple',
          type: 'integrated',
          vram,
          priority: 8
        };
      }
    } catch (error) {
      this.logger.debug('Failed to detect Apple Silicon GPU:', error);
    }

    return null;
  }

  /**
   * Windows GPU 检测
   */
  private async detectWindowsGPUs(): Promise<GpuInfo[]> {
    const gpus: GpuInfo[] = [];

    try {
      // 使用 wmic 获取显卡信息
      const output = execSync('wmic path win32_VideoController get Name,AdapterRAM,PNPDeviceID /format:csv', {
        encoding: 'utf8',
        timeout: 10000
      });

      const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
          const name = parts[1]?.trim();
          const ramBytes = parseInt(parts[0]?.trim()) || 0;

          if (name && name !== 'Name') {
            const vram = ramBytes > 0 ? `${Math.round(ramBytes / 1024 / 1024 / 1024)}GB` : 'Unknown';
            const vendor = this.detectGPUVendor(name);
            const { type, priority } = this.detectGPUTypeAndPriority(name, vendor);

            gpus.push({
              index: i,
              name,
              memoryTotal: ramBytes > 0 ? Math.round(ramBytes / 1024 / 1024) : 0, // Convert to MB
              memoryUsed: 0,
              memoryFree: 0,
              utilization: 0,
              temperature: 0,
              powerDraw: 0,
              powerLimit: 0,
              vendor,
              type,
              vram,
              priority
            });
          }
        }
      }

      // 如果wmic失败，尝试PowerShell
      if (gpus.length === 0) {
        try {
          const psOutput = execSync('powershell "Get-WmiObject -Class Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json"', {
            encoding: 'utf8',
            timeout: 10000
          });

          const controllers = JSON.parse(psOutput);
          const controllerArray = Array.isArray(controllers) ? controllers : [controllers];

          for (let i = 0; i < controllerArray.length; i++) {
            const controller = controllerArray[i];
            if (controller.Name) {
              const name = controller.Name;
              const ramBytes = controller.AdapterRAM || 0;
              const vram = ramBytes > 0 ? `${Math.round(ramBytes / 1024 / 1024 / 1024)}GB` : 'Unknown';
              const vendor = this.detectGPUVendor(name);
              const { type, priority } = this.detectGPUTypeAndPriority(name, vendor);

              gpus.push({
                index: i,
                name,
                memoryTotal: ramBytes > 0 ? Math.round(ramBytes / 1024 / 1024) : 0,
                memoryUsed: 0,
                memoryFree: 0,
                utilization: 0,
                temperature: 0,
                powerDraw: 0,
                powerLimit: 0,
                vendor,
                type,
                vram,
                priority
              });
            }
          }
        } catch (psError) {
          this.logger.debug('Failed to detect Windows GPUs via PowerShell:', psError);
        }
      }
    } catch (error) {
      this.logger.debug('Failed to detect Windows GPUs:', error);
    }

    return gpus;
  }

  /**
   * Linux GPU 检测
   */
  private async detectLinuxGPUs(): Promise<GpuInfo[]> {
    const gpus: GpuInfo[] = [];

    try {
      // 使用 lspci 获取显卡信息
      const output = execSync('lspci | grep -i vga', {
        encoding: 'utf8',
        timeout: 10000
      });

      const lines = output.split('\n').filter(line => line.trim());

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const name = line.split(': ')[1] || 'Unknown GPU';
        const vendor = this.detectGPUVendor(name);
        const { type, priority } = this.detectGPUTypeAndPriority(name, vendor);

        // 尝试获取 VRAM 信息
        let vram = 'Unknown';
        let memoryTotal = 0;

        try {
          if (vendor === 'AMD') {
            // AMD GPU 尝试从 /sys 读取
            try {
              const amdOutput = execSync('find /sys -name "*memory*" -path "*card*" | head -1 | xargs cat 2>/dev/null || echo "0"', {
                encoding: 'utf8',
                timeout: 5000
              });
              const vramBytes = parseInt(amdOutput.trim());
              if (vramBytes > 0) {
                memoryTotal = Math.round(vramBytes / 1024 / 1024); // Convert to MB
                vram = `${Math.round(vramBytes / 1024 / 1024 / 1024)}GB`;
              }
            } catch (e) {
              // 忽略错误
            }
          }
        } catch (e) {
          // 忽略 VRAM 检测错误
        }

        gpus.push({
          index: i,
          name,
          memoryTotal,
          memoryUsed: 0,
          memoryFree: 0,
          utilization: 0,
          temperature: 0,
          powerDraw: 0,
          powerLimit: 0,
          vendor,
          type,
          vram,
          priority
        });
      }
    } catch (error) {
      this.logger.debug('Failed to detect Linux GPUs:', error);
    }

    return gpus;
  }

  /**
   * 备用 GPU 信息获取方法
   */
  private async getGpuInfoFallback(): Promise<GpuInfo[]> {
    try {
      // 尝试使用 lspci 检测 GPU（Linux）
      if (os.platform() === 'linux') {
        const { stdout } = await execAsync('lspci | grep -i vga');
        const lines = stdout.trim().split('\n');
        const gpus: GpuInfo[] = [];

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes('nvidia') || line.toLowerCase().includes('amd') || line.toLowerCase().includes('intel')) {
            const name = line.split(': ')[1] || 'Unknown GPU';
            const vendor = this.detectGPUVendor(name);
            const { type, priority } = this.detectGPUTypeAndPriority(name, vendor);

            gpus.push({
              index,
              name,
              memoryTotal: 0, // 无法通过 lspci 获取
              memoryUsed: 0,
              memoryFree: 0,
              utilization: 0,
              temperature: 0,
              powerDraw: 0,
              powerLimit: 0,
              vendor,
              type,
              vram: 'Unknown',
              priority
            });
          }
        });

        return gpus;
      }

      // macOS 尝试使用 system_profiler
      if (os.platform() === 'darwin') {
        const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep "Chipset Model"');
        const lines = stdout.trim().split('\n');
        const gpus: GpuInfo[] = [];

        lines.forEach((line, index) => {
          const match = line.match(/Chipset Model:\s*(.+)/);
          if (match) {
            const name = match[1].trim();
            const vendor = this.detectGPUVendor(name);
            const { type, priority } = this.detectGPUTypeAndPriority(name, vendor);

            gpus.push({
              index,
              name,
              memoryTotal: 0,
              memoryUsed: 0,
              memoryFree: 0,
              utilization: 0,
              temperature: 0,
              powerDraw: 0,
              powerLimit: 0,
              vendor,
              type,
              vram: 'Unknown',
              priority
            });
          }
        });

        return gpus;
      }

      return [];
    } catch (error) {
      this.logger.warn('Fallback GPU detection failed:', error);
      return [];
    }
  }

  /**
   * 获取 CUDA 版本
   */
  async getCudaVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('nvcc --version');
      const match = stdout.match(/release (\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch (error) {
      this.logger.debug('CUDA not found or nvcc not available');
      return undefined;
    }
  }

  /**
   * 获取 Python 版本
   */
  async getPythonVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('python --version');
      const match = stdout.match(/Python (\d+\.\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch (error) {
      try {
        const { stdout } = await execAsync('python3 --version');
        const match = stdout.match(/Python (\d+\.\d+\.\d+)/);
        return match ? match[1] : undefined;
      } catch (error2) {
        this.logger.debug('Python not found');
        return undefined;
      }
    }
  }

  /**
   * 获取 PyTorch 版本
   */
  async getTorchVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('python -c "import torch; print(torch.__version__)"');
      return stdout.trim();
    } catch (error) {
      try {
        const { stdout } = await execAsync('python3 -c "import torch; print(torch.__version__)"');
        return stdout.trim();
      } catch (error2) {
        this.logger.debug('PyTorch not found');
        return undefined;
      }
    }
  }

  /**
   * 获取推荐的 vLLM 配置基于系统资源
   */
  getRecommendedVllmConfig(gpus: GpuInfo[]): {
    gpuMemoryUtilization: number;
    maxModelLen: number;
    maxNumSeqs: number;
    tensorParallelSize: number;
    enforceEager: boolean;
  } {
    if (gpus.length === 0) {
      // 没有 GPU 信息时返回保守配置
      return {
        gpuMemoryUtilization: 0.8,
        maxModelLen: 2048,
        maxNumSeqs: 128,
        tensorParallelSize: 1,
        enforceEager: true
      };
    }

    const totalGpuMemory = gpus.reduce((sum, gpu) => sum + gpu.memoryTotal, 0);
    const availableGpus = gpus.length;

    // 根据显存大小调整配置
    let gpuMemoryUtilization = 0.9;
    let maxModelLen = 4096;
    let maxNumSeqs = 256;
    let enforceEager = false;

    if (totalGpuMemory < 8000) { // < 8GB
      gpuMemoryUtilization = 0.7;
      maxModelLen = 2048;
      maxNumSeqs = 128;
      enforceEager = true;
    } else if (totalGpuMemory < 16000) { // < 16GB
      gpuMemoryUtilization = 0.8;
      maxModelLen = 4096;
      maxNumSeqs = 256;
      enforceEager = true;
    } else if (totalGpuMemory < 32000) { // < 32GB
      gpuMemoryUtilization = 0.85;
      maxModelLen = 8192;
      maxNumSeqs = 512;
    } else { // >= 32GB
      gpuMemoryUtilization = 0.9;
      maxModelLen = 16384;
      maxNumSeqs = 1024;
    }

    return {
      gpuMemoryUtilization,
      maxModelLen,
      maxNumSeqs,
      tensorParallelSize: Math.min(availableGpus, 4), // 最多使用4个GPU
      enforceEager
    };
  }
}
