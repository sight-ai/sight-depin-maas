import { RegistrationStorage } from '@saito/device-status';
import axios from 'axios';

/**
 * 应用服务访问层
 * 提供轻量级的服务访问，不依赖完整的NestJS应用
 */
export class AppServices {
  private static readonly BACKEND_BASE_URL = 'http://localhost:8716';
  private static readonly OLLAMA_BASE_URL = 'http://localhost:11434';

  /**
   * 模拟DeviceStatusService的注册功能
   */
  static async register(credentials: any): Promise<any> {
    try {
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
   * 检查Ollama服务状态
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
    ollama: boolean;
    backend: boolean;
  }> {
    try {
      // 检查后端服务
      const backendStatus = await this.checkBackendStatus();

      // 检查Ollama服务
      const ollamaStatus = await this.checkOllamaStatus();

      return {
        ollama: ollamaStatus,
        backend: backendStatus
      };
    } catch (error) {
      return {
        ollama: false,
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
}
