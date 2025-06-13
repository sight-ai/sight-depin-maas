import {
  IDirectServiceAccess,
  ServicesHealthStatus,
  CliError
} from '../abstractions/cli.interfaces';
import { LocalConfigService } from '@saito/common';

/**
 * 直接服务访问器 
 * 直接访问libs模块服务，不通过HTTP API
 */
/**
 * 简化的框架管理器 - 用于 CLI 模式
 */
class SimpleFrameworkManager {
  private localConfig: LocalConfigService;

  constructor() {
    this.localConfig = new LocalConfigService();
  }

  async getCurrentFramework(): Promise<string> {
    try {
      const framework = process.env.INFERENCE_FRAMEWORK || 'ollama';
      return framework;
    } catch (error) {
      return 'ollama'; // 默认值
    }
  }

  async switchFramework(framework: string): Promise<boolean> {
    try {
      // 在 CLI 模式下，我们只能建议用户手动设置环境变量
      console.log(`\n📝 To switch to ${framework}, please set the environment variable:`);
      console.log(`   export INFERENCE_FRAMEWORK=${framework}`);
      console.log(`   Or add INFERENCE_FRAMEWORK=${framework} to your .env file\n`);
      return true;
    } catch (error) {
      console.error('Failed to switch framework:', error);
      return false;
    }
  }

  async getFrameworkStatus(): Promise<any> {
    const currentFramework = await this.getCurrentFramework();

    // 检测 ollama 和 vLLM 的实际运行状态
    const ollamaStatus = await this.checkOllamaStatus();
    const vllmStatus = await this.checkVllmStatus();

    return {
      current: currentFramework,
      available: ['ollama', 'vllm'],
      status: 'active',
      detection: {
        ollama: ollamaStatus,
        vllm: vllmStatus
      },
      primary: ollamaStatus.isRunning ? {
        framework: 'ollama',
        isAvailable: true,
        url: ollamaStatus.url,
        version: ollamaStatus.version
      } : vllmStatus.isRunning ? {
        framework: 'vllm',
        isAvailable: true,
        url: vllmStatus.url,
        version: vllmStatus.version
      } : null
    };
  }

  /**
   * 检查 Ollama 服务状态
   */
  private async checkOllamaStatus(): Promise<any> {
    try {
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return {
          isRunning: true,
          available: true,
          url: ollamaUrl,
          status: 'online',
          reason: 'Service is running and responding'
        };
      } else {
        return {
          isRunning: false,
          available: false,
          url: ollamaUrl,
          status: 'offline',
          reason: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        isRunning: false,
        available: false,
        url: process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434',
        status: 'offline',
        reason: error.message || 'Connection failed'
      };
    }
  }

  /**
   * 检查 vLLM 服务状态
   */
  private async checkVllmStatus(): Promise<any> {
    try {
      const vllmUrl = process.env.VLLM_API_URL || 'http://localhost:8000';
      const response = await fetch(`${vllmUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return {
          isRunning: true,
          available: true,
          url: vllmUrl,
          status: 'online',
          reason: 'Service is running and responding'
        };
      } else {
        return {
          isRunning: false,
          available: false,
          url: vllmUrl,
          status: 'offline',
          reason: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        isRunning: false,
        available: false,
        url: process.env.VLLM_API_URL || 'http://localhost:8000',
        status: 'offline',
        reason: error.message || 'Connection failed'
      };
    }
  }
}

export class DirectServiceAccessorService implements IDirectServiceAccess {
  private simpleFrameworkManager?: SimpleFrameworkManager;
  private localConfig?: LocalConfigService;

  constructor() {}

  /**
   * 获取模型推理服务
   */
  async getModelService(): Promise<any> {
    throw new CliError(
      'Model service not available in CLI mode',
      'MODEL_SERVICE_NOT_AVAILABLE'
    );
  }

  /**
   * 获取框架管理服务
   */
  async getFrameworkManagerService(): Promise<SimpleFrameworkManager> {
    if (!this.simpleFrameworkManager) {
      this.simpleFrameworkManager = new SimpleFrameworkManager();
    }
    return this.simpleFrameworkManager;
  }

  /**
   * 获取框架切换服务
   */
  async getFrameworkSwitchService(): Promise<SimpleFrameworkManager> {
    return this.getFrameworkManagerService();
  }

  /**
   * 获取动态模型配置服务
   */
  async getDynamicModelConfigService(): Promise<LocalConfigService> {
    if (!this.localConfig) {
      this.localConfig = new LocalConfigService();
    }
    return this.localConfig;
  }

  /**
   * 获取设备状态服务
   */
  async getDeviceStatusService(): Promise<never> {
    throw new CliError(
      'Device status service not available in CLI mode',
      'DEVICE_STATUS_NOT_AVAILABLE'
    );
  }

  /**
   * 获取矿工服务
   */
  async getMinerService(): Promise<never> {
    throw new CliError(
      'Miner service not available in CLI mode',
      'MINER_SERVICE_NOT_AVAILABLE'
    );
  }

  /**
   * 获取任务同步服务
   */
  async getTaskSyncService(): Promise<never> {
    throw new CliError(
      'Task sync service not available in CLI mode',
      'TASK_SYNC_NOT_AVAILABLE'
    );
  }

  /**
   * 获取模型报告服务
   */
  async getModelReportingService(): Promise<never> {
    throw new CliError(
      'Model reporting service not available in CLI mode',
      'MODEL_REPORTING_NOT_AVAILABLE'
    );
  }

  /**
   * 获取持久化服务
   */
  async getPersistentService(): Promise<never> {
    throw new CliError(
      'Persistent service not available in CLI mode',
      'PERSISTENT_SERVICE_NOT_AVAILABLE'
    );
  }

  /**
   * 检查服务健康状态
   */
  async checkServicesHealth(): Promise<ServicesHealthStatus> {
    // 在CLI模式下，检查可用的服务状态
    const frameworkManagerAvailable = !!this.simpleFrameworkManager;
    const localConfigAvailable = !!this.localConfig;

    return {
      isHealthy: true, // CLI 模式下总是健康的
      lastCheck: new Date(),
      services: {
        modelInference: frameworkManagerAvailable,
        deviceStatus: false, // 暂时不可用
        miner: false, // 暂时不可用
        taskSync: false, // 暂时不可用
        modelReporting: false, // 暂时不可用
        persistent: false // 暂时不可用
      }
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // CLI模式下没有需要清理的资源
    console.log('CLI service cleanup completed');
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    totalServices: number;
    initializedServices: number;
    initializationRate: number;
  } {
    const initializedCount = [
      this.simpleFrameworkManager,
      this.localConfig
    ].filter(Boolean).length;

    const totalServices = 2; // CLI 模式下只有2个可用服务

    return {
      totalServices,
      initializedServices: initializedCount,
      initializationRate: initializedCount / totalServices
    };
  }
}
