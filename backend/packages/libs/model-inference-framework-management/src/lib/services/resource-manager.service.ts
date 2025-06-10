import { Injectable, Logger } from '@nestjs/common';
import { LocalConfigService } from '@saito/common';

/**
 * 资源管理服务
 * 
 */
@Injectable()
export class ResourceManagerService {
  private readonly logger = new Logger(ResourceManagerService.name);

  constructor(
    private readonly localConfigService: LocalConfigService
  ) {}

  /**
   * 设置 GPU 限制
   */
  async setGpuLimits(framework: 'ollama' | 'vllm', gpuIds: number[]): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Setting GPU limits for ${framework}: ${gpuIds.join(',')}`);

      // 验证 GPU ID
      const availableGpus = await this.getAvailableGpus();
      const invalidGpus = gpuIds.filter(id => !availableGpus.includes(id));
      
      if (invalidGpus.length > 0) {
        throw new Error(`Invalid GPU IDs: ${invalidGpus.join(',')}`);
      }

      // 设置环境变量
      const gpuEnvVar = gpuIds.join(',');
      process.env['CUDA_VISIBLE_DEVICES'] = gpuEnvVar;

      // 保存到配置
      const configKey = `${framework}_gpu_limits`;
      this.saveResourceConfig(configKey, gpuIds);

      this.logger.log(`GPU limits set for ${framework}: ${gpuEnvVar}`);

      return {
        success: true,
        message: `GPU limits set for ${framework}: ${gpuEnvVar}`
      };

    } catch (error) {
      this.logger.error(`Failed to set GPU limits: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: `Failed to set GPU limits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 设置内存限制
   */
  async setMemoryLimits(framework: 'ollama' | 'vllm', memoryLimit: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Setting memory limits for ${framework}: ${memoryLimit}`);

      // 验证内存格式 (例如: "8GB", "4096MB")
      if (!this.validateMemoryFormat(memoryLimit)) {
        throw new Error(`Invalid memory format: ${memoryLimit}`);
      }

      // 保存到配置
      const configKey = `${framework}_memory_limit`;
      this.saveResourceConfig(configKey, memoryLimit);

      this.logger.log(`Memory limit set for ${framework}: ${memoryLimit}`);

      return {
        success: true,
        message: `Memory limit set for ${framework}: ${memoryLimit}`
      };

    } catch (error) {
      this.logger.error(`Failed to set memory limits: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: `Failed to set memory limits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取可用 GPU
   */
  async getAvailableGpus(): Promise<number[]> {
    try {
      // 使用 nvidia-smi 检测 GPU
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('nvidia-smi --query-gpu=index --format=csv,noheader,nounits');
      const gpuIds = stdout.trim().split('\n').map((id: string) => parseInt(id.trim(), 10));
      
      this.logger.debug(`Available GPUs: ${gpuIds.join(',')}`);
      return gpuIds;
    } catch (error) {
      this.logger.warn(`Failed to detect GPUs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // 返回默认 GPU 列表（假设有 4 个 GPU）
      return [0, 1, 2, 3];
    }
  }

  /**
   * 获取系统资源信息
   */
  async getSystemResources(): Promise<{
    gpus: Array<{ id: number; name: string; memory: string; utilization?: number }>;
    totalMemory: string;
    availableMemory: string;
    cpuCores: number;
  }> {
    try {
      const gpus = await this.getDetailedGpuInfo();
      const memoryInfo = await this.getMemoryInfo();
      const cpuInfo = await this.getCpuInfo();

      return {
        gpus,
        totalMemory: memoryInfo.total,
        availableMemory: memoryInfo.available,
        cpuCores: cpuInfo.cores
      };

    } catch (error) {
      this.logger.error(`Failed to get system resources: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // 返回默认值
      return {
        gpus: [
          { id: 0, name: 'NVIDIA GPU 0', memory: '24GB' },
          { id: 1, name: 'NVIDIA GPU 1', memory: '24GB' }
        ],
        totalMemory: '64GB',
        availableMemory: '32GB',
        cpuCores: 16
      };
    }
  }

  /**
   * 获取框架的资源配置
   */
  getFrameworkResourceConfig(framework: 'ollama' | 'vllm'): {
    gpuLimits?: number[];
    memoryLimit?: string;
  } {
    try {
      const gpuLimits = this.getResourceConfig(`${framework}_gpu_limits`);
      const memoryLimit = this.getResourceConfig(`${framework}_memory_limit`);

      return {
        gpuLimits: gpuLimits ? JSON.parse(gpuLimits) : undefined,
        memoryLimit: memoryLimit || undefined
      };
    } catch (error) {
      this.logger.warn(`Failed to get resource config for ${framework}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  }

  /**
   * 清除框架的资源限制
   */
  async clearFrameworkResourceLimits(framework: 'ollama' | 'vllm'): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 清除 GPU 限制
      this.removeResourceConfig(`${framework}_gpu_limits`);
      
      // 清除内存限制
      this.removeResourceConfig(`${framework}_memory_limit`);

      // 如果是当前活跃框架，清除环境变量
      if (process.env['CUDA_VISIBLE_DEVICES']) {
        delete process.env['CUDA_VISIBLE_DEVICES'];
      }

      this.logger.log(`Cleared resource limits for ${framework}`);

      return {
        success: true,
        message: `Resource limits cleared for ${framework}`
      };

    } catch (error) {
      this.logger.error(`Failed to clear resource limits for ${framework}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: `Failed to clear resource limits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 验证内存格式
   */
  private validateMemoryFormat(memory: string): boolean {
    const pattern = /^\d+(\.\d+)?(GB|MB|KB)$/i;
    return pattern.test(memory);
  }

  /**
   * 获取详细的 GPU 信息
   */
  private async getDetailedGpuInfo(): Promise<Array<{ id: number; name: string; memory: string; utilization?: number }>> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('nvidia-smi --query-gpu=index,name,memory.total,utilization.gpu --format=csv,noheader,nounits');
      
      return stdout.trim().split('\n').map((line: string) => {
        const [id, name, memory, utilization] = line.split(', ');
        return {
          id: parseInt(id, 10),
          name: name.trim(),
          memory: `${memory}MB`,
          utilization: parseInt(utilization, 10)
        };
      });

    } catch (error) {
      this.logger.debug(`Could not get detailed GPU info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * 获取内存信息
   */
  private async getMemoryInfo(): Promise<{ total: string; available: string }> {
    try {
      const os = require('os');
      const totalBytes = os.totalmem();
      const freeBytes = os.freemem();
      
      return {
        total: `${Math.round(totalBytes / (1024 ** 3))}GB`,
        available: `${Math.round(freeBytes / (1024 ** 3))}GB`
      };
    } catch (error) {
      return { total: '64GB', available: '32GB' };
    }
  }

  /**
   * 获取 CPU 信息
   */
  private async getCpuInfo(): Promise<{ cores: number }> {
    try {
      const os = require('os');
      return { cores: os.cpus().length };
    } catch (error) {
      return { cores: 16 };
    }
  }

  /**
   * 保存资源配置
   */
  private saveResourceConfig(key: string, value: any): void {
    try {
      const configValue = typeof value === 'string' ? value : JSON.stringify(value);
      this.localConfigService.set('resource-config.json', key, configValue);
    } catch (error) {
      this.logger.warn(`Failed to save resource config ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取资源配置
   */
  private getResourceConfig(key: string): string | null {
    try {
      return this.localConfigService.get('resource-config.json', key);
    } catch (error) {
      this.logger.debug(`Failed to get resource config ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * 删除资源配置
   */
  private removeResourceConfig(key: string): void {
    try {
      this.localConfigService.delete('resource-config.json', key);
    } catch (error) {
      this.logger.debug(`Failed to remove resource config ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
