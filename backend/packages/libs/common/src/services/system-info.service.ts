import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
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
   * 获取 GPU 信息
   */
  async getGpuInfo(): Promise<GpuInfo[]> {
    try {
      // 尝试使用 nvidia-smi 获取 GPU 信息
      const { stdout } = await execAsync('nvidia-smi --query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits');
      
      const lines = stdout.trim().split('\n');
      const gpus: GpuInfo[] = [];

      for (const line of lines) {
        const parts = line.split(', ').map(part => part.trim());
        if (parts.length >= 9) {
          gpus.push({
            index: parseInt(parts[0]),
            name: parts[1],
            memoryTotal: parseInt(parts[2]),
            memoryUsed: parseInt(parts[3]),
            memoryFree: parseInt(parts[4]),
            utilization: parseInt(parts[5]),
            temperature: parseInt(parts[6]),
            powerDraw: parseFloat(parts[7]) || 0,
            powerLimit: parseFloat(parts[8]) || 0
          });
        }
      }

      return gpus;
    } catch (error) {
      this.logger.warn('Failed to get GPU info via nvidia-smi:', error);
      
      // 尝试其他方法或返回空数组
      try {
        return await this.getGpuInfoFallback();
      } catch (fallbackError) {
        this.logger.warn('Fallback GPU detection also failed:', fallbackError);
        return [];
      }
    }
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
            gpus.push({
              index,
              name: line.split(': ')[1] || 'Unknown GPU',
              memoryTotal: 0, // 无法通过 lspci 获取
              memoryUsed: 0,
              memoryFree: 0,
              utilization: 0,
              temperature: 0,
              powerDraw: 0,
              powerLimit: 0
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
            gpus.push({
              index,
              name: match[1].trim(),
              memoryTotal: 0,
              memoryUsed: 0,
              memoryFree: 0,
              utilization: 0,
              temperature: 0,
              powerDraw: 0,
              powerLimit: 0
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
