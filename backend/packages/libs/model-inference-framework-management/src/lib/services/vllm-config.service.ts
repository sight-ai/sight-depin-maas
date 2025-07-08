import { Injectable, Logger } from '@nestjs/common';
import { LocalConfigService, SystemInfoService } from '@saito/common';

/**
 * vLLM 配置接口
 */
export interface VllmMemoryConfig {
  gpuMemoryUtilization?: number;
  maxModelLen?: number;
  maxNumSeqs?: number;
  maxNumBatchedTokens?: number;
  enforceEager?: boolean;
  swapSpace?: number;
  tensorParallelSize?: number;
  pipelineParallelSize?: number;
  blockSize?: number;
  quantization?: 'awq' | 'gptq' | 'squeezellm' | 'fp8' | 'int8' | null;
}

/**
 * vLLM 完整配置接口
 */
export interface VllmFullConfig extends VllmMemoryConfig {
  model?: string;
  port?: number;
  host?: string;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * vLLM 配置管理服务
 * 负责管理 vLLM 的显存限制和其他配置参数
 */
@Injectable()
export class VllmConfigService {
  private readonly logger = new Logger(VllmConfigService.name);
  private readonly CONFIG_FILE = 'vllm-memory-config.json';

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly systemInfoService: SystemInfoService
  ) {}

  /**
   * 获取 vLLM 显存配置
   */
  getMemoryConfig(): VllmMemoryConfig {
    try {
      const config = this.localConfigService.getAll(this.CONFIG_FILE) || {};
      
      return {
        gpuMemoryUtilization: config.gpuMemoryUtilization || 0.9,
        maxModelLen: config.maxModelLen || 4096,
        maxNumSeqs: config.maxNumSeqs,
        maxNumBatchedTokens: config.maxNumBatchedTokens,
        enforceEager: config.enforceEager || false,
        swapSpace: config.swapSpace,
        tensorParallelSize: config.tensorParallelSize,
        pipelineParallelSize: config.pipelineParallelSize,
        blockSize: config.blockSize,
        quantization: config.quantization
      };
    } catch (error) {
      this.logger.error('Failed to get vLLM memory config:', error);
      return {
        gpuMemoryUtilization: 0.9,
        maxModelLen: 4096,
        enforceEager: false
      };
    }
  }

  /**
   * 设置 vLLM 显存配置
   */
  setMemoryConfig(config: Partial<VllmMemoryConfig>): boolean {
    try {
      // 获取现有配置
      const currentConfig = this.getMemoryConfig();
      
      // 合并配置
      const newConfig = { ...currentConfig, ...config };
      
      // 验证配置
      const validationErrors = this.validateMemoryConfig(newConfig);
      if (validationErrors.length > 0) {
        this.logger.error('Invalid vLLM memory config:', validationErrors);
        return false;
      }

      // 保存配置
      const success = this.localConfigService.set(this.CONFIG_FILE, 'gpuMemoryUtilization', newConfig.gpuMemoryUtilization) &&
                     this.localConfigService.set(this.CONFIG_FILE, 'maxModelLen', newConfig.maxModelLen) &&
                     this.localConfigService.set(this.CONFIG_FILE, 'enforceEager', newConfig.enforceEager);

      if (newConfig.maxNumSeqs !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'maxNumSeqs', newConfig.maxNumSeqs);
      }

      if (newConfig.maxNumBatchedTokens !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'maxNumBatchedTokens', newConfig.maxNumBatchedTokens);
      }

      if (newConfig.swapSpace !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'swapSpace', newConfig.swapSpace);
      }

      if (newConfig.tensorParallelSize !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'tensorParallelSize', newConfig.tensorParallelSize);
      }

      if (newConfig.pipelineParallelSize !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'pipelineParallelSize', newConfig.pipelineParallelSize);
      }

      if (newConfig.blockSize !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'blockSize', newConfig.blockSize);
      }

      if (newConfig.quantization !== undefined) {
        this.localConfigService.set(this.CONFIG_FILE, 'quantization', newConfig.quantization);
      }

      if (success) {
        this.logger.log('vLLM memory config updated successfully');
      }

      return success;
    } catch (error) {
      this.logger.error('Failed to set vLLM memory config:', error);
      return false;
    }
  }

  /**
   * 获取完整的 vLLM 配置（包括环境变量）
   */
  getFullConfig(): VllmFullConfig {
    const memoryConfig = this.getMemoryConfig();
    
    return {
      ...memoryConfig,
      model: process.env['VLLM_MODEL'] || 'microsoft/DialoGPT-medium',
      port: parseInt(process.env['VLLM_PORT'] || '8000'),
      host: process.env['VLLM_HOST'] || '0.0.0.0',
      baseUrl: process.env['VLLM_BASE_URL'] || 'http://localhost:8000',
      apiKey: process.env['VLLM_API_KEY']
    };
  }

  /**
   * 重置配置到默认值
   */
  resetToDefaults(): boolean {
    try {
      const defaultConfig: VllmMemoryConfig = {
        gpuMemoryUtilization: 0.9,
        maxModelLen: 4096,
        enforceEager: false
      };

      return this.setMemoryConfig(defaultConfig);
    } catch (error) {
      this.logger.error('Failed to reset vLLM config to defaults:', error);
      return false;
    }
  }

  /**
   * 验证显存配置
   */
  private validateMemoryConfig(config: VllmMemoryConfig): string[] {
    const errors: string[] = [];

    if (config.gpuMemoryUtilization !== undefined) {
      if (config.gpuMemoryUtilization < 0.1 || config.gpuMemoryUtilization > 1.0) {
        errors.push('GPU memory utilization must be between 0.1 and 1.0');
      }
    }

    if (config.maxModelLen !== undefined) {
      if (config.maxModelLen < 1) {
        errors.push('Max model length must be positive');
      }
    }

    if (config.maxNumSeqs !== undefined) {
      if (config.maxNumSeqs < 1) {
        errors.push('Max number of sequences must be positive');
      }
    }

    if (config.maxNumBatchedTokens !== undefined) {
      if (config.maxNumBatchedTokens < 1) {
        errors.push('Max number of batched tokens must be positive');
      }
    }

    if (config.swapSpace !== undefined) {
      if (config.swapSpace < 0) {
        errors.push('Swap space must be non-negative');
      }
    }

    if (config.tensorParallelSize !== undefined) {
      if (config.tensorParallelSize < 1) {
        errors.push('Tensor parallel size must be positive');
      }
    }

    if (config.pipelineParallelSize !== undefined) {
      if (config.pipelineParallelSize < 1) {
        errors.push('Pipeline parallel size must be positive');
      }
    }

    if (config.blockSize !== undefined) {
      if (config.blockSize < 1) {
        errors.push('Block size must be positive');
      }
    }

    return errors;
  }

  /**
   * 获取推荐的配置值（基于系统资源）
   */
  async getRecommendedConfig(): Promise<VllmMemoryConfig> {
    try {
      // 获取系统信息
      const systemInfo = await this.systemInfoService.getSystemInfo();

      // 使用系统信息服务的推荐算法
      const systemRecommended = this.systemInfoService.getRecommendedVllmConfig(systemInfo.gpus);

      return {
        gpuMemoryUtilization: systemRecommended.gpuMemoryUtilization,
        maxModelLen: systemRecommended.maxModelLen,
        maxNumSeqs: systemRecommended.maxNumSeqs,
        tensorParallelSize: systemRecommended.tensorParallelSize,
        enforceEager: systemRecommended.enforceEager
      };
    } catch (error) {
      this.logger.warn('Failed to get system-based recommendations, using defaults:', error);

      // 如果获取系统信息失败，返回保守的默认值
      return {
        gpuMemoryUtilization: 0.8, // 保守一些，留出20%缓冲
        maxModelLen: 4096,
        enforceEager: true, // 对于显存受限的情况，建议启用
        maxNumSeqs: 256,
        maxNumBatchedTokens: 2048
      };
    }
  }
}
