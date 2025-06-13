import { CliServiceOrchestrator } from './cli-service.orchestrator';
import { ModelOfMiner } from '@saito/models';
import axios from 'axios';
import { StorageManagerService } from './storage-manager.service';

type DeviceCredentials = ModelOfMiner<'DeviceCredentials'>;

/**
 * 应用服务访问层 - 重构版本
 * 直接使用libs服务，不通过HTTP API
 */
export class AppServices {
  private static cliService: CliServiceOrchestrator;

  // 配置常量
  private static readonly BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8716';
  private static readonly OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  /**
   * 获取CLI服务实例
   */
  private static getCliService(): CliServiceOrchestrator {
    if (!this.cliService) {
      this.cliService = new CliServiceOrchestrator();
    }
    return this.cliService;
  }

  /**
   * 设备注册功能 - 直接使用服务
   */
  static async register(credentials: DeviceCredentials): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.register(credentials);

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * 清除设备注册功能 - 直接使用服务
   */
  static async clearRegistration(): Promise<boolean> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.unregister();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查框架服务状态 - 直接使用服务
   */
  static async checkOllamaStatus(): Promise<boolean> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getFrameworkStatus();

      if (result.success && result.data) {
        const available = result.data.available || [];
        return available.includes('ollama');
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查当前框架状态 - 直接使用服务
   */
  static async checkCurrentFrameworkStatus(): Promise<boolean> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getFrameworkStatus();

      if (result.success && result.data) {
        return result.data.current !== null;
      }
      return false;
    } catch (error) {
      return false;
    }
  }



  /**
   * 上报模型到后端
   */
  static async reportModels(models: string[]): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/report`, {
        models
      }, {
        timeout: 10000
      });
      return { success: true, ...response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Report failed'
      };
    }
  }

  /**
   * 获取StorageManager实例
   */
  static getStorageManager(): StorageManagerService {
    return new StorageManagerService();
  }

  /**
   * 关闭应用实例（轻量级版本，无需操作）
   */
  static async closeApp(): Promise<void> {
    // 轻量级版本无需关闭应用实例
  }

  /**
   * 检查服务是否可用
   */
  static async checkServicesHealth(): Promise<{
    framework: boolean;
    backend: boolean;
    frameworkType?: string;
  }> {
    try {
      // 检查后端服务
      const backendStatus = await this.checkBackendStatus();

      // 检查当前框架状态
      const frameworkStatus = await this.checkCurrentFrameworkStatus();

      // 获取框架类型
      let frameworkType = 'unknown';
      try {
        const status = await this.getFrameworkStatus();
        if (status.success) {
          frameworkType = status.data.current;
        }
      } catch (error) {
        // 忽略错误，使用默认值
      }

      return {
        framework: frameworkStatus,
        backend: backendStatus,
        frameworkType
      };
    } catch (error) {
      return {
        framework: false,
        backend: false
      };
    }
  }

  /**
   * 检查后端服务状态
   */
  static async checkBackendStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/v1/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取框架状态 - 直接使用服务
   */
  static async getFrameworkStatus(): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getFrameworkStatus();

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get framework status'
      };
    }
  }

  /**
   * 切换框架 - 直接使用服务
   */
  static async switchFramework(framework: string, force = false): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.switchFramework(framework, force);

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to switch framework'
      };
    }
  }

  /**
   * 获取vLLM配置
   */
  static async getVllmConfig(): Promise<any> {
    try {
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/v1/models/vllm/config`, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get vLLM configuration'
      };
    }
  }

  /**
   * 更新vLLM配置
   */
  static async updateVllmConfig(config: any): Promise<any> {
    try {
      const response = await axios.put(`${this.BACKEND_BASE_URL}/api/v1/models/vllm/config`, config, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update vLLM configuration'
      };
    }
  }

  /**
   * 启动vLLM服务
   */
  static async startVllmService(config: any): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/vllm/start`, config, {
        timeout: 30000 // 30秒超时，因为启动可能需要较长时间
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to start vLLM service'
      };
    }
  }

  /**
   * 停止vLLM服务
   */
  static async stopVllmService(): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/vllm/stop`, {}, {
        timeout: 15000 // 15秒超时
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to stop vLLM service'
      };
    }
  }

  /**
   * 重启vLLM服务
   */
  static async restartVllmService(config: any): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/vllm/restart`, config, {
        timeout: 45000 // 45秒超时，因为重启需要更长时间
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to restart vLLM service'
      };
    }
  }

  /**
   * 获取vLLM进程状态
   */
  static async getVllmProcessStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/v1/models/vllm/status`, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get vLLM process status'
      };
    }
  }

  /**
   * 启动Ollama服务
   */
  static async startOllamaService(config: any): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/ollama/start`, config, {
        timeout: 30000 // 30秒超时，因为启动可能需要较长时间
      });
      return response.data;
    } catch (error: any) {
      // 检查是否是连接错误（后台服务未运行）
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Backend API server is not running. Please start the backend server first using: ./sightai start'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to start Ollama service'
      };
    }
  }

  /**
   * 停止Ollama服务
   */
  static async stopOllamaService(): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/ollama/stop`, {}, {
        timeout: 15000 // 15秒超时
      });
      return response.data;
    } catch (error: any) {
      // 检查是否是连接错误（后台服务未运行）
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Backend API server is not running. Please start the backend server first using: ./sightai start'
        };
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to stop Ollama service'
      };
    }
  }

  /**
   * 重启Ollama服务
   */
  static async restartOllamaService(config: any): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/models/ollama/restart`, config, {
        timeout: 45000 // 45秒超时，因为重启需要更长时间
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to restart Ollama service'
      };
    }
  }

  /**
   * 获取Ollama进程状态
   */
  static async getOllamaProcessStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/v1/models/ollama/status`, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get Ollama process status'
      };
    }
  }

  /**
   * 获取统一模型列表 - 直接使用服务
   */
  static async getUnifiedModels(framework?: string): Promise<any> {
    try {
      // 在 CLI 模式下，直接调用原生框架命令
      return await this.getNativeModels(framework);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get models'
      };
    }
  }

  /**
   * 获取原生框架模型列表 - 直接调用框架命令
   */
  static async getNativeModels(framework?: string): Promise<any> {
    try {
      // 直接从环境变量获取当前框架，避免访问私有属性
      const currentFramework = framework || process.env.INFERENCE_FRAMEWORK || 'ollama';

      if (currentFramework === 'ollama') {
        return await this.getOllamaModels();
      } else if (currentFramework === 'vllm') {
        return await this.getVllmModels();
      } else {
        return {
          success: false,
          error: `Unsupported framework: ${currentFramework}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get native models'
      };
    }
  }

  /**
   * 获取 Ollama 模型列表
   */
  static async getOllamaModels(): Promise<any> {
    try {
      const { spawn } = require('child_process');

      return new Promise((resolve) => {
        const process = spawn('ollama', ['list'], { stdio: 'pipe' });
        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        process.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        process.on('close', (code: number) => {
          if (code !== 0) {
            resolve({
              success: false,
              error: `Ollama command failed: ${errorOutput || 'Unknown error'}`
            });
            return;
          }

          try {
            // 解析 ollama list 输出
            const lines = output.trim().split('\n');
            const models: any[] = [];

            // 跳过标题行
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line) {
                const parts = line.split(/\s+/);
                if (parts.length >= 3) {
                  models.push({
                    name: parts[0],
                    id: parts[1],
                    size: parts[2],
                    modified_at: parts.slice(3).join(' '),
                    details: {
                      family: 'ollama',
                      parameter_size: 'unknown',
                      format: 'ollama'
                    }
                  });
                }
              }
            }

            resolve({
              success: true,
              data: {
                models,
                framework: 'ollama'
              }
            });
          } catch (parseError: any) {
            resolve({
              success: false,
              error: `Failed to parse ollama output: ${parseError.message}`
            });
          }
        });

        process.on('error', (error: any) => {
          resolve({
            success: false,
            error: `Failed to execute ollama command: ${error.message}`
          });
        });
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get Ollama models'
      };
    }
  }

  /**
   * 获取 vLLM 模型列表
   */
  static async getVllmModels(): Promise<any> {
    try {
      // vLLM 通过 API 获取模型列表
      const vllmUrl = process.env.VLLM_API_URL || 'http://localhost:8000';
      const response = await fetch(`${vllmUrl}/v1/models`);

      if (!response.ok) {
        return {
          success: false,
          error: `vLLM API error: ${response.status} ${response.statusText}`
        };
      }

      const data: any = await response.json();
      const models = data.data?.map((model: any) => ({
        name: model.id,
        id: model.id,
        size: 'unknown',
        modified_at: new Date().toISOString(),
        details: {
          family: 'vllm',
          parameter_size: 'unknown',
          format: 'vllm'
        }
      })) || [];

      return {
        success: true,
        data: {
          models,
          framework: 'vllm'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get vLLM models'
      };
    }
  }

  /**
   * 获取统一服务健康状态 - 直接使用服务
   */
  static async getUnifiedHealth(): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getUnifiedHealth();

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get health status'
      };
    }
  }

  /**
   * 获取统一服务版本 - 直接使用服务
   */
  static async getUnifiedVersion(framework?: string): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getUnifiedVersion(framework);

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get version'
      };
    }
  }

  // ===== 模型配置方法 =====

  /**
   * 获取默认模型 - 直接使用服务
   */
  static async getDefaultModel(framework?: string): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getDefaultModel(framework);

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get default model'
      };
    }
  }

  /**
   * 获取可用模型列表 - 直接使用服务
   */
  static async getAvailableModels(framework?: string): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getAvailableModels(framework);

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get available models'
      };
    }
  }

  /**
   * 获取模型统计信息 - 直接使用服务
   */
  static async getModelStats(): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.getModelStats();

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get model stats'
      };
    }
  }

  /**
   * 刷新模型缓存 - 直接使用服务
   */
  static async refreshModels(framework?: string): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.refreshModels(framework);

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to refresh models'
      };
    }
  }

  /**
   * 清除模型缓存 - 直接使用服务
   */
  static async clearModelCache(): Promise<any> {
    try {
      const cliService = this.getCliService();
      const result = await cliService.clearModelCache();

      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to clear model cache'
      };
    }
  }
}
