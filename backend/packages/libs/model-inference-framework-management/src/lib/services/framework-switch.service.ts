import { Injectable, Logger } from '@nestjs/common';
import { ModelFramework } from '@saito/model-inference-client';
import { LocalConfigService } from '@saito/common';
import { VllmProcessManagerService } from './vllm-process-manager.service';
import { OllamaProcessManagerService } from './ollama-process-manager.service';
import { ResourceManagerService } from './resource-manager.service';

/**
 * 框架切换管理服务
 *
 */
@Injectable()
export class FrameworkSwitchService {
  private readonly logger = new Logger(FrameworkSwitchService.name);

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly resourceManager: ResourceManagerService,
    private readonly vllmProcessManager: VllmProcessManagerService,
    private readonly ollamaProcessManager: OllamaProcessManagerService
  ) {}

  /**
   * 切换到指定框架
   *
   * 重要：这个方法会写入 ~/.sightai/config.json，然后重启 sight-local-backend
   * 新的进程会读取配置并选择对应的实现类
   */
  async switchToFramework(
    framework: ModelFramework,
    options: {
      force?: boolean;
      validateAvailability?: boolean;
      stopOthers?: boolean;
      restartBackend?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Switching to framework: ${framework}`);

      // 验证框架是否支持
      if (!this.isSupportedFramework(framework)) {
        return {
          success: false,
          message: `Unsupported framework: ${framework}`
        };
      }

      // 转换为配置格式
      const clientType = this.frameworkToClientType(framework);

      // 如果需要验证可用性且不是强制切换
      if (options.validateAvailability !== false && !options.force) {
        const isAvailable = await this.isFrameworkAvailable(framework);
        if (!isAvailable) {
          return {
            success: false,
            message: `Framework ${framework} is not available. Use force=true to switch anyway, or start the ${framework} service first.`
          };
        }
      }

      // 如果需要停止其他框架
      if (options.stopOthers) {
        await this.stopOtherFrameworks(framework);
      }

      // 持久化框架选择到 ~/.sightai/config.json
      const configSaved = this.localConfigService.setClientType(clientType);
      if (!configSaved) {
        throw new Error('Failed to save framework configuration');
      }

      this.logger.log(`Successfully switched to framework: ${framework} (client_type: ${clientType})`);

      // 如果需要重启后端服务
      if (options.restartBackend !== false) {
        this.logger.log('Framework switch complete. Initiating backend restart...');

        // 异步重启后端服务，避免阻塞当前请求
        setTimeout(async () => {
          try {
            await this.restartBackendService();
          } catch (error) {
            this.logger.error('Failed to restart backend service:', error);
          }
        }, 1000); // 1秒后重启，给当前响应时间返回
      }

      return {
        success: true,
        message: `Successfully switched to framework: ${framework}. ${options.restartBackend !== false ? 'Backend service will restart in 1 second.' : ''}`
      };

    } catch (error) {
      this.logger.error('Failed to switch framework:', error);
      return {
        success: false,
        message: `Failed to switch framework: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 启动指定框架
   */
  async startFramework(framework: ModelFramework, config?: any): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
      this.logger.log(`Starting framework: ${framework}`);

      switch (framework) {
        case ModelFramework.OLLAMA:
          return await this.ollamaProcessManager.startOllamaService(config);
        case ModelFramework.VLLM:
          return await this.vllmProcessManager.startVllmService(config);
        default:
          return {
            success: false,
            message: `Unsupported framework: ${framework}`
          };
      }
    } catch (error) {
      this.logger.error(`Failed to start framework ${framework}:`, error);
      return {
        success: false,
        message: `Failed to start framework: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 停止指定框架
   */
  async stopFramework(framework: ModelFramework): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Stopping framework: ${framework}`);

      switch (framework) {
        case ModelFramework.OLLAMA:
          return await this.ollamaProcessManager.stopOllamaService();
        case ModelFramework.VLLM:
          return await this.vllmProcessManager.stopVllmService();
        default:
          return {
            success: false,
            message: `Unsupported framework: ${framework}`
          };
      }
    } catch (error) {
      this.logger.error(`Failed to stop framework ${framework}:`, error);
      return {
        success: false,
        message: `Failed to stop framework: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 重启指定框架
   */
  async restartFramework(framework: ModelFramework, config?: any): Promise<{ success: boolean; message: string; pid?: number }> {
    try {
      this.logger.log(`Restarting framework: ${framework}`);

      switch (framework) {
        case ModelFramework.OLLAMA:
          return await this.ollamaProcessManager.restartOllamaService(config);
        case ModelFramework.VLLM:
          return await this.vllmProcessManager.restartVllmService(config);
        default:
          return {
            success: false,
            message: `Unsupported framework: ${framework}`
          };
      }
    } catch (error) {
      this.logger.error(`Failed to restart framework ${framework}:`, error);
      return {
        success: false,
        message: `Failed to restart framework: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取框架状态
   */
  async getFrameworkStatus(framework: ModelFramework): Promise<any> {
    try {
      switch (framework) {
        case ModelFramework.OLLAMA:
          return await this.ollamaProcessManager.getOllamaStatus();
        case ModelFramework.VLLM:
          return await this.vllmProcessManager.getVllmStatus();
        default:
          return { isRunning: false, error: `Unsupported framework: ${framework}` };
      }
    } catch (error) {
      this.logger.error(`Failed to get framework status for ${framework}:`, error);
      return { isRunning: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 获取所有框架状态
   */
  async getAllFrameworksStatus(): Promise<Record<ModelFramework, any>> {
    const statuses = {} as Record<ModelFramework, any>;
    
    const frameworks = this.getSupportedFrameworks();
    await Promise.all(
      frameworks.map(async (framework) => {
        statuses[framework] = await this.getFrameworkStatus(framework);
      })
    );

    return statuses;
  }

  // =============================================================================
  // 私有辅助方法
  // =============================================================================

  /**
   * 检查框架是否可用
   */
  private async isFrameworkAvailable(framework: ModelFramework): Promise<boolean> {
    try {
      const status = await this.getFrameworkStatus(framework);
      return status.isRunning === true;
    } catch {
      return false;
    }
  }

  /**
   * 停止其他框架
   */
  private async stopOtherFrameworks(currentFramework: ModelFramework): Promise<void> {
    const allFrameworks = this.getSupportedFrameworks();
    const otherFrameworks = allFrameworks.filter(f => f !== currentFramework);

    await Promise.all(
      otherFrameworks.map(async (framework) => {
        try {
          const status = await this.getFrameworkStatus(framework);
          if (status.isRunning) {
            this.logger.log(`Stopping other framework: ${framework}`);
            await this.stopFramework(framework);
          }
        } catch (error) {
          this.logger.warn(`Failed to stop framework ${framework}:`, error);
        }
      })
    );
  }

  /**
   * 获取当前配置的框架
   */
  getCurrentFramework(): 'ollama' | 'vllm' | null {
    const clientType = this.localConfigService.getClientType();
    if (clientType === 'ollama' || clientType === 'vllm') {
      return clientType;
    }
    return null;
  }

  /**
   * 获取框架状态概览
   */
  async getFrameworkStatusOverview(): Promise<{
    current: 'ollama' | 'vllm' | null;
    ollama: { running: boolean; status?: any };
    vllm: { running: boolean; status?: any };
  }> {
    const current = this.getCurrentFramework();
    const ollamaStatus = await this.ollamaProcessManager.getOllamaStatus();
    const vllmStatus = await this.vllmProcessManager.getVllmStatus();

    return {
      current,
      ollama: {
        running: ollamaStatus.isRunning || false,
        status: ollamaStatus
      },
      vllm: {
        running: vllmStatus.isRunning || false,
        status: vllmStatus
      }
    };
  }

  /**
   * 设置框架资源限制
   */
  async setFrameworkResourceLimits(
    framework: 'ollama' | 'vllm',
    limits: {
      gpuIds?: number[];
      memoryLimit?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const results: string[] = [];

      if (limits.gpuIds) {
        const gpuResult = await this.resourceManager.setGpuLimits(framework, limits.gpuIds);
        if (!gpuResult.success) {
          throw new Error(gpuResult.message);
        }
        results.push(gpuResult.message);
      }

      if (limits.memoryLimit) {
        const memoryResult = await this.resourceManager.setMemoryLimits(framework, limits.memoryLimit);
        if (!memoryResult.success) {
          throw new Error(memoryResult.message);
        }
        results.push(memoryResult.message);
      }

      return {
        success: true,
        message: results.join('; ')
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set resource limits for ${framework}: ${errorMessage}`);
      return {
        success: false,
        message: `Failed to set resource limits: ${errorMessage}`
      };
    }
  }

  /**
   * 转换框架枚举到客户端类型
   */
  private frameworkToClientType(framework: ModelFramework): 'ollama' | 'vllm' {
    switch (framework) {
      case ModelFramework.OLLAMA:
        return 'ollama';
      case ModelFramework.VLLM:
        return 'vllm';
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * 转换客户端类型到框架枚举
   */
  private clientTypeToFramework(clientType: 'ollama' | 'vllm'): ModelFramework {
    switch (clientType) {
      case 'ollama':
        return ModelFramework.OLLAMA;
      case 'vllm':
        return ModelFramework.VLLM;
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }

  /**
   * 获取支持的框架列表
   */
  private getSupportedFrameworks(): ModelFramework[] {
    return [ModelFramework.OLLAMA, ModelFramework.VLLM];
  }

  /**
   * 检查框架是否受支持
   */
  private isSupportedFramework(framework: ModelFramework): boolean {
    return this.getSupportedFrameworks().includes(framework);
  }

  /**
   * 重启后端服务
   * 通过退出当前进程来触发进程管理器重启
   */
  private async restartBackendService(): Promise<void> {
    try {
      this.logger.log('Restarting sight-local-backend service...');

      // 给日志一点时间写入
      await new Promise(resolve => setTimeout(resolve, 500));

      // 优雅退出，让进程管理器重启服务
      // 使用退出码 0 表示正常重启
      process.exit(0);

    } catch (error) {
      this.logger.error('Failed to restart backend service:', error);
      throw error;
    }
  }
}
