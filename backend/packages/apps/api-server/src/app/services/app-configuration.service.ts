import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LocalConfigService, EnhancedSystemMonitorService } from '@saito/common';
import {
  FrameworkSwitchService,
  ResourceManagerService
} from '@saito/model-inference-framework-management';
import {
  EnhancedDeviceStatusService,
  EnvironmentDetectorService
} from '@saito/device-status';
import { UnifiedModelService } from '@saito/model-inference-client';
import { UnifiedConfigService } from './unified-config.service';
import {
  AppConfigSchema,
  FrameworkConfigSchema,
  type AppConfig,
  type FrameworkConfig,
  ModelFramework
} from '@saito/models';

/**
 * 应用初始化结果
 */
export interface AppInitializationResult {
  success: boolean;
  framework: 'ollama' | 'vllm' | null;
  frameworkAvailable: boolean;
  configValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * 应用状态信息
 */
export interface AppStatusInfo {
  isReady: boolean;
  framework: {
    type: 'ollama' | 'vllm' | null;
    available: boolean;
    version?: string;
    models: string[];
  };
  device: {
    status: string;
    healthy: boolean;
  };
  configuration: {
    valid: boolean;
    errors: string[];
  };
  resourceUsage?: {
    cpu: {
      usage: number;
      cores: number;
    };
    memory: {
      usage: number;
      total: number;
    };
    gpu?: Array<{
      id: string;
      name: string;
      usage: number;
      memory: {
        used: number;
        total: number;
      };
    }>;
  };
  lastUpdated: string;
}

/**
 * 应用配置服务
 * 
 */
@Injectable()
export class AppConfigurationService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigurationService.name);
  private isInitialized = false;
  private initializationResult: AppInitializationResult | null = null;

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly frameworkSwitchService: FrameworkSwitchService,
    private readonly deviceStatusService: EnhancedDeviceStatusService,
    private readonly environmentDetector: EnvironmentDetectorService,
    private readonly systemMonitorService: EnhancedSystemMonitorService,
    private readonly unifiedConfigService: UnifiedConfigService,
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing application configuration...');
      
      const result = await this.initializeApplication();
      this.initializationResult = result;
      this.isInitialized = true;

      if (result.success) {
        this.logger.log(`Application initialized successfully with ${result.framework} framework`);
      } else {
        this.logger.warn(`Application initialization completed with issues: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      this.initializationResult = {
        success: false,
        framework: null,
        frameworkAvailable: false,
        configValid: false,
        errors: [`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: ['Check logs and restart the application']
      };
    }
  }

  /**
   * 获取应用配置
   */
  async getAppConfig(): Promise<AppConfig> {
    try {
      const appConfig = this.localConfigService.getAppConfig();
      
      // 验证配置
      return AppConfigSchema.parse(appConfig);
    } catch (error) {
      this.logger.error('Failed to get app config:', error);
      throw error;
    }
  }

  /**
   * 更新应用配置
   */
  async updateAppConfig(config: Partial<AppConfig>): Promise<{ success: boolean; message: string }> {
    try {
      // 验证配置
      const currentConfig = await this.getAppConfig();
      const updatedConfig = { ...currentConfig, ...config };
      
      AppConfigSchema.parse(updatedConfig);

      // 保存配置
      if (config.clientType) {
        const success = this.localConfigService.setClientType(config.clientType);
        if (!success) {
          throw new Error('Failed to save client type');
        }
      }

      if (config.frameworkConfig) {
        const success = this.localConfigService.setFrameworkConfig(
          config.clientType || currentConfig.clientType || 'ollama',
          config.frameworkConfig
        );
        if (!success) {
          throw new Error('Failed to save framework config');
        }
      }

      this.logger.log('App config updated successfully');
      
      return {
        success: true,
        message: 'Configuration updated successfully'
      };

    } catch (error) {
      this.logger.error('Failed to update app config:', error);
      return {
        success: false,
        message: `Failed to update configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取应用状态
   */
  async getAppStatus(): Promise<AppStatusInfo> {
    try {
      const [environment, deviceStatus, healthCheck, systemMetrics] = await Promise.all([
        this.environmentDetector.detectCurrentEnvironment(),
        this.deviceStatusService.getDeviceStatusOverview(),
        this.deviceStatusService.performHealthCheck(),
        this.systemMonitorService.getSystemMetrics()
      ]);

      const configValidation = this.localConfigService.validateConfig();

      return {
        isReady: this.isInitialized && environment.isAvailable && healthCheck.overall !== 'critical',
        framework: {
          type: environment.framework,
          available: environment.isAvailable,
          version: environment.version,
          models: environment.models || []
        },
        device: {
          status: deviceStatus.status,
          healthy: healthCheck.overall === 'healthy'
        },
        configuration: {
          valid: configValidation.isValid,
          errors: configValidation.errors
        },
        resourceUsage: {
          cpu: {
            usage: systemMetrics.cpu.usage,
            cores: systemMetrics.cpu.cores
          },
          memory: {
            usage: systemMetrics.memory.usage,
            total: systemMetrics.memory.total
          },
          gpu: systemMetrics.gpus.map((gpu, index) => ({
            id: index.toString(),
            name: gpu.name,
            usage: gpu.usage,
            memory: {
              used: Math.round(gpu.memory * gpu.usage / 100),
              total: gpu.memory
            }
          }))
        },
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get app status:', error);
      throw error;
    }
  }

  /**
   * 切换推理框架
   */
  async switchFramework(
    framework: 'ollama' | 'vllm',
    options: {
      validateAvailability?: boolean;
      stopOthers?: boolean;
      restartRequired?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string; restartRequired?: boolean }> {
    try {
      this.logger.log(`Switching to framework: ${framework}`);

      // 使用框架切换服务
      const result = await this.frameworkSwitchService.switchToFramework(
        framework === 'ollama' ? ModelFramework.OLLAMA : ModelFramework.VLLM,
        {
          validateAvailability: options.validateAvailability,
          stopOthers: options.stopOthers,
          restartBackend: options.restartRequired
        }
      );

      if (result.success) {
        this.logger.log(`Successfully switched to ${framework}`);
      }

      return {
        ...result,
        restartRequired: options.restartRequired !== false
      };

    } catch (error) {
      this.logger.error(`Failed to switch to ${framework}:`, error);
      return {
        success: false,
        message: `Failed to switch framework: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 设置资源限制
   */
  async setResourceLimits(
    framework: 'ollama' | 'vllm',
    limits: {
      gpuIds?: number[];
      memoryLimit?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await this.frameworkSwitchService.setFrameworkResourceLimits(framework, limits);
    } catch (error) {
      this.logger.error(`Failed to set resource limits for ${framework}:`, error);
      return {
        success: false,
        message: `Failed to set resource limits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 执行应用健康检查
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    components: {
      configuration: { status: string; message: string };
      framework: { status: string; message: string };
      device: { status: string; message: string };
      inference: { status: string; message: string };
    };
    recommendations: string[];
  }> {
    try {
      const [configValidation, environment, deviceHealth] = await Promise.all([
        Promise.resolve(this.localConfigService.validateConfig()),
        this.environmentDetector.detectCurrentEnvironment(),
        this.deviceStatusService.performHealthCheck()
      ]);

      // 检查推理服务
      let inferenceStatus = 'pass';
      let inferenceMessage = 'Inference service is working';

      try {
        // 使用环境检测器来检查模型可用性
        if (!environment.models || environment.models.length === 0) {
          inferenceStatus = 'warning';
          inferenceMessage = 'No models available';
        }
      } catch (error) {
        inferenceStatus = 'fail';
        inferenceMessage = `Inference service error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      const components = {
        configuration: {
          status: configValidation.isValid ? 'pass' : 'fail',
          message: configValidation.isValid ? 'Configuration is valid' : `Config errors: ${configValidation.errors.join(', ')}`
        },
        framework: {
          status: environment.isAvailable ? 'pass' : 'fail',
          message: environment.isAvailable ? `${environment.framework} is available` : `${environment.framework} is not available`
        },
        device: {
          status: deviceHealth.overall === 'critical' ? 'fail' : deviceHealth.overall === 'warning' ? 'warning' : 'pass',
          message: `Device health: ${deviceHealth.overall}`
        },
        inference: {
          status: inferenceStatus,
          message: inferenceMessage
        }
      };

      // 确定整体状态
      const statuses = Object.values(components).map(c => c.status);
      let overall: 'healthy' | 'warning' | 'critical';
      
      if (statuses.includes('fail')) {
        overall = 'critical';
      } else if (statuses.includes('warning')) {
        overall = 'warning';
      } else {
        overall = 'healthy';
      }

      // 生成建议
      const recommendations: string[] = [];
      if (!configValidation.isValid) {
        recommendations.push('Fix configuration errors');
      }
      if (!environment.isAvailable) {
        recommendations.push(`Start ${environment.framework} service`);
      }
      if (inferenceStatus === 'warning') {
        recommendations.push('Pull some models for inference');
      }

      return {
        overall,
        components,
        recommendations
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        overall: 'critical',
        components: {
          configuration: { status: 'fail', message: 'Health check failed' },
          framework: { status: 'fail', message: 'Health check failed' },
          device: { status: 'fail', message: 'Health check failed' },
          inference: { status: 'fail', message: 'Health check failed' }
        },
        recommendations: ['Restart the application']
      };
    }
  }

  /**
   * 获取初始化结果
   */
  getInitializationResult(): AppInitializationResult | null {
    return this.initializationResult;
  }

  /**
   * 检查应用是否已准备就绪
   */
  isAppReady(): boolean {
    return this.isInitialized && 
           this.initializationResult?.success === true && 
           this.initializationResult?.frameworkAvailable === true;
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 初始化应用
   */
  private async initializeApplication(): Promise<AppInitializationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // 1. 验证配置
      const configValidation = this.localConfigService.validateConfig();
      if (!configValidation.isValid) {
        errors.push(...configValidation.errors);
      }
      warnings.push(...configValidation.warnings);

      // 2. 检测环境
      const environment = await this.environmentDetector.detectCurrentEnvironment();
      
      if (!environment.framework) {
        errors.push('No framework configured');
        recommendations.push('Configure a framework (ollama or vllm)');
      } else if (!environment.isAvailable) {
        errors.push(`Framework ${environment.framework} is not available`);
        recommendations.push(`Start ${environment.framework} service`);
      } else if (!environment.models || environment.models.length === 0) {
        warnings.push(`No models available in ${environment.framework}`);
        recommendations.push(`Pull some models for ${environment.framework}`);
      }

      // 3. 检查设备状态
      const deviceHealth = await this.deviceStatusService.performHealthCheck();
      if (deviceHealth.overall === 'critical') {
        errors.push('Device health is critical');
      } else if (deviceHealth.overall === 'warning') {
        warnings.push('Device health has warnings');
      }
      recommendations.push(...deviceHealth.recommendations);

      return {
        success: errors.length === 0,
        framework: environment.framework,
        frameworkAvailable: environment.isAvailable,
        configValid: configValidation.isValid,
        errors,
        warnings,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        framework: null,
        frameworkAvailable: false,
        configValid: false,
        errors: [`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        recommendations: ['Check logs and configuration']
      };
    }
  }
}
