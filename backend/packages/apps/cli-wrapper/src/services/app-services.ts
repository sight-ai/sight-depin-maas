import { RegistrationStorage } from '@saito/device-status';
import axios from 'axios';

/**
 * 应用服务访问层
 * 提供轻量级的服务访问，不依赖完整的NestJS应用
 */
export class AppServices {
  private static readonly BACKEND_BASE_URL = process.env['SIGHTAI_BACKEND_URL'] || 'http://localhost:8716';
  private static readonly OLLAMA_BASE_URL =  process.env.OLLAMA_API_URL || 'http://localhost:11434';

  /**
   * 模拟DeviceStatusService的注册功能
   */
  static async register(credentials: any): Promise<any> {
    try {
      // // 构造请求体，包含basePath参数
      // const requestBody = {
      //   ...credentials,
      //   // 从环境变量中获取basePath并传递给后端
      //   basePath: process.env.API_SERVER_BASE_PATH
      // };

      // const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/device-status/register`, requestBody, {
      //   timeout: 10000
      // });
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/v1/device-status/register`, credentials, {
        timeout: 10000
      });
      return { success: true, ...response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Registration failed'
      };
    }
  }

  /**
   * 模拟DeviceStatusService的清除注册功能
   */
  static async clearRegistration(): Promise<boolean> {
    try {
      // 清除本地存储的注册信息
      const storage = this.getRegistrationStorage();
      storage.deleteRegistrationInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查Ollama服务状态（保持向后兼容）
   */
  static async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.OLLAMA_BASE_URL}/api/version`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查当前框架状态
   */
  static async checkCurrentFrameworkStatus(): Promise<boolean> {
    try {
      const frameworkStatus = await this.getFrameworkStatus();
      if (frameworkStatus.success) {
        return frameworkStatus.data.primary.isAvailable;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取Ollama模型列表
   */
  static async getOllamaModels(): Promise<any> {
    try {
      const response = await axios.get(`${this.OLLAMA_BASE_URL}/api/tags`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      return { models: [] };
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
   * 获取RegistrationStorage实例
   */
  static getRegistrationStorage(): RegistrationStorage {
    return new RegistrationStorage();
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
   * 获取框架状态
   */
  static async getFrameworkStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/unified/framework/status`, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get framework status'
      };
    }
  }

  /**
   * 切换框架
   */
  static async switchFramework(framework: string, force = false): Promise<any> {
    try {
      const response = await axios.post(`${this.BACKEND_BASE_URL}/api/unified/framework/switch`, {
        framework,
        force
      }, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to switch framework'
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
   * 获取统一模型列表 (使用新的清洁架构)
   */
  static async getUnifiedModels(framework?: string): Promise<any> {
    try {
      // Try the new clean API first
      const params = framework ? { framework } : {};
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/unified/models`, {
        params,
        timeout: 10000
      });

      // Ensure the response is in the expected format for CLI
      if (response.data.success && response.data.data) {
        const modelList = response.data.data;

        // Convert to Ollama format for CLI compatibility
        const ollamaFormat = {
          models: modelList.models.map((model: any) => ({
            name: model.name,
            size: model.size || 0,
            modified_at: model.modified_at || new Date().toISOString(),
            details: {
              family: model.family || 'unknown',
              parameter_size: model.parameters || 'unknown',
              format: model.format || 'unknown'
            }
          })),
          framework: modelList.framework
        };

        return {
          success: true,
          data: ollamaFormat
        };
      }

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get models'
      };
    }
  }

  /**
   * 获取统一服务健康状态
   */
  static async getUnifiedHealth(): Promise<any> {
    try {
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/unified/health`, {
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get health status'
      };
    }
  }

  /**
   * 获取统一服务版本
   */
  static async getUnifiedVersion(framework?: string): Promise<any> {
    try {
      const params = framework ? { framework } : {};
      const response = await axios.get(`${this.BACKEND_BASE_URL}/api/unified/version`, {
        params,
        timeout: 10000
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get version'
      };
    }
  }
}
