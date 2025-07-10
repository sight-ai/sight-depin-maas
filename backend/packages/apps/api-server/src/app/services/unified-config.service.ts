import { Injectable, Logger } from '@nestjs/common';
import {
  LocalConfigService,
  EnhancedUnifiedConfigService,
  IConfigManager,
  ConfigType,
  ConfigScope
} from '@saito/common';
import { VllmConfigService, VllmMemoryConfig, VllmFullConfig } from '@saito/model-inference-framework-management';

/**
 * 统一配置管理服务
 * 
 * 职责：
 * 1. 整合多个配置服务的功能
 * 2. 提供统一的配置接口
 * 3. 减少配置管理的重复代码
 * 4. 遵循单一职责原则
 */
@Injectable()
export class UnifiedConfigService {
  private readonly logger = new Logger(UnifiedConfigService.name);

  private appConfigManager: IConfigManager;
  private frameworkConfigManager: IConfigManager;

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly vllmConfigService: VllmConfigService,
    private readonly enhancedUnifiedConfigService: EnhancedUnifiedConfigService
  ) {
    // 初始化配置管理器
    this.appConfigManager = this.enhancedUnifiedConfigService.getAppConfigManager();
    this.frameworkConfigManager = this.enhancedUnifiedConfigService.getFrameworkConfigManager();
  }

  // =============================================================================
  // 应用级配置管理
  // =============================================================================

  /**
   * 获取当前推理框架
   */
  getCurrentFramework(): 'ollama' | 'vllm' | null {
    return this.localConfigService.getClientType();
  }

  /**
   * 设置推理框架
   */
  setCurrentFramework(framework: 'ollama' | 'vllm'): boolean {
    return this.localConfigService.setClientType(framework);
  }

  /**
   * 获取应用配置 - 使用新的统一配置管理器
   */
  async getAppConfig(): Promise<{
    framework: 'ollama' | 'vllm' | null;
    environment: string;
    logLevel: string;
    enableMetrics: boolean;
    lastUpdated: string;
  }> {
    return {
      framework: this.getCurrentFramework(),
      environment: await this.appConfigManager.get('environment', process.env.NODE_ENV || 'production'),
      logLevel: await this.appConfigManager.get('logLevel', process.env.LOG_LEVEL || 'info'),
      enableMetrics: await this.appConfigManager.get('enableMetrics', process.env.ENABLE_METRICS === 'true'),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 更新应用配置 - 使用新的统一配置管理器
   */
  async updateAppConfig(config: {
    environment?: string;
    logLevel?: string;
    enableMetrics?: boolean;
  }): Promise<boolean> {
    try {
      let allSuccess = true;

      if (config.environment !== undefined) {
        const success = await this.appConfigManager.set('environment', config.environment);
        if (!success) allSuccess = false;
      }

      if (config.logLevel !== undefined) {
        const success = await this.appConfigManager.set('logLevel', config.logLevel);
        if (!success) allSuccess = false;
      }

      if (config.enableMetrics !== undefined) {
        const success = await this.appConfigManager.set('enableMetrics', config.enableMetrics);
        if (!success) allSuccess = false;
      }

      if (allSuccess) {
        this.logger.log('App config updated successfully using unified config manager');
      }

      return allSuccess;
    } catch (error) {
      this.logger.error('Failed to update app config:', error);
      return false;
    }
  }

  // =============================================================================
  // vLLM 配置管理
  // =============================================================================

  /**
   * 获取 vLLM 内存配置
   */
  getVllmMemoryConfig(): VllmMemoryConfig {
    return this.vllmConfigService.getMemoryConfig();
  }

  /**
   * 设置 vLLM 内存配置
   */
  setVllmMemoryConfig(config: Partial<VllmMemoryConfig>): boolean {
    return this.vllmConfigService.setMemoryConfig(config);
  }

  /**
   * 获取 vLLM 完整配置
   */
  getVllmFullConfig(): VllmFullConfig {
    return this.vllmConfigService.getFullConfig();
  }

  /**
   * 重置 vLLM 配置到默认值
   */
  resetVllmConfig(): boolean {
    return this.vllmConfigService.resetToDefaults();
  }

  // =============================================================================
  // 通用配置管理
  // =============================================================================

  /**
   * 获取配置值
   */
  getConfig<T = any>(configFile: string, key: string, gatewayPath?: string): T | null {
    return this.localConfigService.get<T>(configFile, key, gatewayPath);
  }

  /**
   * 设置配置值
   */
  setConfig<T = any>(configFile: string, key: string, value: T, gatewayPath?: string): boolean {
    return this.localConfigService.set(configFile, key, value, gatewayPath);
  }

  /**
   * 检查配置是否存在
   */
  hasConfig(configFile: string, key: string, gatewayPath?: string): boolean {
    return this.localConfigService.has(configFile, key, gatewayPath);
  }

  /**
   * 获取整个配置文件
   */
  getAllConfig(configFile: string, gatewayPath?: string): Record<string, any> | null {
    return this.localConfigService.getAll(configFile, gatewayPath);
  }

  /**
   * 删除配置
   */
  deleteConfig(configFile: string, key: string, gatewayPath?: string): boolean {
    return this.localConfigService.delete(configFile, key, gatewayPath);
  }

  // =============================================================================
  // 配置验证和健康检查
  // =============================================================================

  /**
   * 验证配置完整性
   */
  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查推理框架配置
      const framework = this.getCurrentFramework();
      if (!framework) {
        errors.push('No inference framework is configured');
      } else {
        // 检查框架特定配置
        if (framework === 'vllm') {
          const vllmConfig = this.getVllmMemoryConfig();
          if (!vllmConfig.gpuMemoryUtilization) {
            warnings.push('vLLM GPU memory utilization is not configured');
          }
          if (!vllmConfig.maxModelLen) {
            warnings.push('vLLM max model length is not configured');
          }
        }
      }

      // 检查配置目录权限
      const configValidation = this.localConfigService.validateConfig();
      errors.push(...configValidation.errors);
      warnings.push(...configValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error('Configuration validation failed:', error);
      return {
        isValid: false,
        errors: ['Configuration validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings
      };
    }
  }

  /**
   * 获取配置健康状态
   */
  getConfigHealth(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: any;
  } {
    const validation = this.validateConfiguration();
    
    if (!validation.isValid) {
      return {
        status: 'error',
        message: 'Configuration has errors',
        details: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      };
    }

    if (validation.warnings.length > 0) {
      return {
        status: 'warning',
        message: 'Configuration has warnings',
        details: {
          warnings: validation.warnings
        }
      };
    }

    return {
      status: 'healthy',
      message: 'Configuration is healthy',
      details: {
        framework: this.getCurrentFramework(),
        configFiles: ['config.json', 'vllm-config.json']
      }
    };
  }

  // =============================================================================
  // 配置备份和恢复
  // =============================================================================

  /**
   * 备份当前配置
   */
  backupConfiguration(): {
    success: boolean;
    backupPath?: string;
    error?: string;
  } {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupData = {
        timestamp,
        framework: this.getCurrentFramework(),
        appConfig: this.getAppConfig(),
        vllmConfig: this.getVllmFullConfig(),
        allConfigs: {
          'config.json': this.getAllConfig('config.json'),
          'vllm-config.json': this.getAllConfig('vllm-config.json')
        }
      };

      const backupFile = `config-backup-${timestamp}.json`;
      const success = this.setConfig(backupFile, 'backup', backupData);

      if (success) {
        this.logger.log(`Configuration backed up to ${backupFile}`);
        return {
          success: true,
          backupPath: backupFile
        };
      } else {
        return {
          success: false,
          error: 'Failed to save backup file'
        };
      }
    } catch (error) {
      this.logger.error('Configuration backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取配置摘要 - 增强版
   */
  async getConfigSummary(): Promise<{
    framework: string | null;
    configFiles: string[];
    lastModified: string;
    health: string;
    totalConfigs: number;
    configsByType: Record<string, number>;
  }> {
    const health = this.getConfigHealth();
    const stats = await this.getConfigStats();

    return {
      framework: this.getCurrentFramework(),
      configFiles: ['config.json', 'vllm-config.json'],
      lastModified: new Date().toISOString(),
      health: health.status,
      totalConfigs: stats.totalConfigs,
      configsByType: stats.configsByType
    };
  }

  // =============================================================================
  // 新增：统一配置管理方法
  // =============================================================================

  /**
   * 验证所有配置
   */
  async validateAllConfigs(): Promise<{
    isValid: boolean;
    results: Record<string, { valid: boolean; errors: number; warnings: number }>;
  }> {
    try {
      const validationResults = await this.enhancedUnifiedConfigService.validateAllConfigs();
      const results: Record<string, { valid: boolean; errors: number; warnings: number }> = {};

      for (const [type, result] of Object.entries(validationResults)) {
        results[type] = {
          valid: result.isValid,
          errors: result.errors.filter(e => e.severity === 'error').length,
          warnings: result.warnings.length + result.errors.filter(e => e.severity === 'warning').length
        };
      }

      const isValid = Object.values(results).every(r => r.valid);

      return { isValid, results };
    } catch (error) {
      this.logger.error('Failed to validate all configs:', error);
      return {
        isValid: false,
        results: {}
      };
    }
  }

  /**
   * 备份所有配置 - 使用新的统一配置管理器
   */
  async backupAllConfigsEnhanced(description?: string): Promise<{ success: boolean; backupId?: string; message: string }> {
    try {
      const backup = await this.enhancedUnifiedConfigService.backupAllConfigs(description);
      return {
        success: true,
        backupId: backup.id,
        message: `Configuration backup created successfully: ${backup.id}`
      };
    } catch (error) {
      this.logger.error('Failed to backup configs:', error);
      return {
        success: false,
        message: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 重置所有配置到默认值
   */
  async resetAllConfigs(): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.enhancedUnifiedConfigService.resetAllConfigs();
      return {
        success,
        message: success ? 'All configurations reset to defaults successfully' : 'Failed to reset some configurations'
      };
    } catch (error) {
      this.logger.error('Failed to reset configs:', error);
      return {
        success: false,
        message: `Failed to reset configurations: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取配置统计信息
   */
  async getConfigStats(): Promise<{
    totalConfigs: number;
    configsByType: Record<string, number>;
    healthStatus: string;
    lastUpdated: string;
  }> {
    try {
      return await this.enhancedUnifiedConfigService.getConfigStats();
    } catch (error) {
      this.logger.error('Failed to get config stats:', error);
      return {
        totalConfigs: 0,
        configsByType: {},
        healthStatus: 'error',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 获取增强的配置健康状态
   */
  async getEnhancedConfigHealthStatus(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    detailedStatus: any;
  }> {
    try {
      // 使用新的统一配置健康检查
      const healthStatus = await this.enhancedUnifiedConfigService.getHealthStatus();

      const issues: string[] = [];
      const recommendations: string[] = [];

      // 收集所有错误和警告
      for (const [configType, details] of Object.entries(healthStatus.details)) {
        if (!details.valid) {
          issues.push(`${configType} configuration has ${details.errors} errors`);
        }
        if (details.warnings > 0) {
          issues.push(`${configType} configuration has ${details.warnings} warnings`);
        }
      }

      // 检查基本配置
      const framework = this.getCurrentFramework();
      if (!framework) {
        issues.push('No inference framework is configured');
        recommendations.push('Set up either Ollama or vLLM framework');
      }

      // 添加通用建议
      if (healthStatus.status === 'error') {
        recommendations.push('Review and fix configuration errors');
      } else if (healthStatus.status === 'warning') {
        recommendations.push('Review configuration warnings for optimal performance');
      }

      return {
        isHealthy: healthStatus.status === 'healthy',
        issues,
        recommendations,
        detailedStatus: healthStatus
      };

    } catch (error) {
      this.logger.error('Failed to get enhanced config health status:', error);
      return {
        isHealthy: false,
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Check logs and restart the service'],
        detailedStatus: null
      };
    }
  }
}
