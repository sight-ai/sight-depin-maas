import { Injectable, Logger } from '@nestjs/common';
import { LocalConfigService } from '@saito/common';
import { 
  EnvironmentDetectorService, 
  EnvironmentDetectionResult,
  FrameworkAvailabilityResult 
} from './environment-detector.service';
import { 
  DeviceStatusManagerService, 
  DeviceStatusInfo,
  StatusChangeListener 
} from './device-status-manager.service';
import { DeviceSystemService } from './device-system.service';
import { 
  SystemInfo,
  SystemHeartbeatData,
  DeviceStatus
} from '@saito/models';

/**
 * 设备健康检查结果
 */
export interface DeviceHealthCheckResult {
  overall: 'healthy' | 'warning' | 'critical';
  checks: {
    framework: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    };
    system: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    };
    configuration: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    };
    connectivity: {
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    };
  };
  recommendations: string[];
  timestamp: string;
}

/**
 * 设备诊断信息
 */
export interface DeviceDiagnostics {
  deviceInfo: DeviceStatusInfo;
  environment: EnvironmentDetectionResult;
  allFrameworks: FrameworkAvailabilityResult;
  systemInfo: SystemInfo;
  healthCheck: DeviceHealthCheckResult;
  configuration: {
    clientType: string | null;
    hasValidConfig: boolean;
    configErrors: string[];
  };
}

/**
 * 增强的设备状态服务
 * 
 */
@Injectable()
export class EnhancedDeviceStatusService {
  private readonly logger = new Logger(EnhancedDeviceStatusService.name);

  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly environmentDetector: EnvironmentDetectorService,
    private readonly statusManager: DeviceStatusManagerService,
    private readonly systemService: DeviceSystemService
  ) {}

  /**
   * 获取设备状态概览
   */
  async getDeviceStatusOverview(): Promise<DeviceStatusInfo> {
    try {
      return await this.statusManager.getCurrentDeviceStatus();
    } catch (error) {
      this.logger.error('Failed to get device status overview:', error);
      throw error;
    }
  }

  /**
   * 检查当前框架是否在线
   */
  async isCurrentFrameworkOnline(): Promise<boolean> {
    try {
      const environment = await this.environmentDetector.detectCurrentEnvironment();
      return environment.isAvailable;
    } catch (error) {
      this.logger.error('Failed to check framework status:', error);
      return false;
    }
  }

  /**
   * 检查特定框架是否在线
   */
  async isFrameworkOnline(framework: 'ollama' | 'vllm'): Promise<boolean> {
    try {
      return await this.environmentDetector.isFrameworkOnline(framework);
    } catch (error) {
      this.logger.error(`Failed to check ${framework} status:`, error);
      return false;
    }
  }

  /**
   * 获取所有框架的可用性
   */
  async getAllFrameworksStatus(): Promise<FrameworkAvailabilityResult> {
    try {
      return await this.environmentDetector.detectAllFrameworks();
    } catch (error) {
      this.logger.error('Failed to get all frameworks status:', error);
      throw error;
    }
  }

  /**
   * 获取环境状态摘要
   */
  async getEnvironmentSummary(): Promise<{
    current: EnvironmentDetectionResult;
    available: FrameworkAvailabilityResult;
    recommendations: string[];
  }> {
    try {
      return await this.environmentDetector.getEnvironmentSummary();
    } catch (error) {
      this.logger.error('Failed to get environment summary:', error);
      throw error;
    }
  }

  /**
   * 执行设备健康检查
   */
  async performHealthCheck(): Promise<DeviceHealthCheckResult> {
    try {
      this.logger.debug('Performing device health check');

      const [environment, systemInfo, allFrameworks] = await Promise.all([
        this.environmentDetector.detectCurrentEnvironment(),
        this.systemService.collectSystemInfo(),
        this.environmentDetector.detectAllFrameworks()
      ]);

      // 框架检查
      const frameworkCheck = this.checkFrameworkHealth(environment, allFrameworks);
      
      // 系统检查
      const systemCheck = this.checkSystemHealth(systemInfo as any);
      
      // 配置检查
      const configCheck = this.checkConfigurationHealth();
      
      // 连接性检查
      const connectivityCheck = this.checkConnectivityHealth(environment);

      // 确定整体健康状态
      const checks = { framework: frameworkCheck, system: systemCheck, configuration: configCheck, connectivity: connectivityCheck };
      const overall = this.determineOverallHealth(checks);

      // 生成建议
      const recommendations = this.generateHealthRecommendations(checks, environment, allFrameworks);

      return {
        overall,
        checks,
        recommendations,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      
      return {
        overall: 'critical',
        checks: {
          framework: { status: 'fail', message: 'Health check failed' },
          system: { status: 'fail', message: 'Health check failed' },
          configuration: { status: 'fail', message: 'Health check failed' },
          connectivity: { status: 'fail', message: 'Health check failed' }
        },
        recommendations: ['Restart the service and try again'],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取完整的设备诊断信息
   */
  async getDeviceDiagnostics(): Promise<DeviceDiagnostics> {
    try {
      this.logger.debug('Collecting device diagnostics');

      const [deviceInfo, environment, allFrameworks, systemInfo, healthCheck] = await Promise.all([
        this.statusManager.getCurrentDeviceStatus(),
        this.environmentDetector.detectCurrentEnvironment(),
        this.environmentDetector.detectAllFrameworks(),
        this.systemService.collectSystemInfo(),
        this.performHealthCheck()
      ]);

      // 配置诊断
      const clientType = this.localConfigService.getClientType();
      const configValidation = this.localConfigService.validateConfig();

      return {
        deviceInfo,
        environment,
        allFrameworks,
        systemInfo: systemInfo as any,
        healthCheck,
        configuration: {
          clientType,
          hasValidConfig: configValidation.isValid,
          configErrors: configValidation.errors
        }
      };

    } catch (error) {
      this.logger.error('Failed to collect device diagnostics:', error);
      throw error;
    }
  }

  /**
   * 获取心跳数据
   */
  async getHeartbeatData(): Promise<SystemHeartbeatData> {
    try {
      return await this.statusManager.getHeartbeatData();
    } catch (error) {
      this.logger.error('Failed to get heartbeat data:', error);
      throw error;
    }
  }

  /**
   * 添加状态变更监听器
   */
  addStatusChangeListener(listener: StatusChangeListener): void {
    this.statusManager.addStatusChangeListener(listener);
  }

  /**
   * 移除状态变更监听器
   */
  removeStatusChangeListener(listener: StatusChangeListener): void {
    this.statusManager.removeStatusChangeListener(listener);
  }

  /**
   * 手动触发状态检查
   */
  async triggerStatusCheck(): Promise<DeviceStatusInfo> {
    try {
      return await this.statusManager.triggerStatusCheck();
    } catch (error) {
      this.logger.error('Failed to trigger status check:', error);
      throw error;
    }
  }

  // =============================================================================
  // 私有健康检查方法
  // =============================================================================

  private checkFrameworkHealth(environment: EnvironmentDetectionResult, allFrameworks: FrameworkAvailabilityResult) {
    if (!environment.framework) {
      return {
        status: 'fail' as const,
        message: 'No framework configured',
        details: { environment, allFrameworks }
      };
    }

    if (!environment.isAvailable) {
      return {
        status: 'fail' as const,
        message: `Framework ${environment.framework} is not available`,
        details: { error: environment.error }
      };
    }

    if (!environment.models || environment.models.length === 0) {
      return {
        status: 'warning' as const,
        message: `Framework ${environment.framework} is available but has no models`,
        details: { models: environment.models }
      };
    }

    return {
      status: 'pass' as const,
      message: `Framework ${environment.framework} is healthy with ${environment.models.length} models`,
      details: { version: environment.version, models: environment.models }
    };
  }

  private checkSystemHealth(systemInfo: SystemInfo) {
    const issues: string[] = [];

    // 检查内存
    let memoryGB = 0;
    if (typeof systemInfo.memory === 'object' && systemInfo.memory.total) {
      memoryGB = systemInfo.memory.total;
    }
    if (memoryGB < 4) {
      issues.push('Low memory (< 4GB)');
    }

    // 检查 GPU
    if (!systemInfo.gpus || systemInfo.gpus.length === 0) {
      issues.push('No GPU detected');
    }

    if (issues.length > 0) {
      return {
        status: 'warning' as const,
        message: `System issues detected: ${issues.join(', ')}`,
        details: { issues, systemInfo }
      };
    }

    return {
      status: 'pass' as const,
      message: 'System resources are adequate',
      details: { systemInfo }
    };
  }

  private checkConfigurationHealth() {
    const validation = this.localConfigService.validateConfig();
    
    if (!validation.isValid) {
      return {
        status: 'fail' as const,
        message: `Configuration errors: ${validation.errors.join(', ')}`,
        details: { validation }
      };
    }

    if (validation.warnings.length > 0) {
      return {
        status: 'warning' as const,
        message: `Configuration warnings: ${validation.warnings.join(', ')}`,
        details: { validation }
      };
    }

    return {
      status: 'pass' as const,
      message: 'Configuration is valid',
      details: { validation }
    };
  }

  private checkConnectivityHealth(environment: EnvironmentDetectionResult) {
    if (!environment.isAvailable) {
      return {
        status: 'fail' as const,
        message: `Cannot connect to ${environment.framework} at ${environment.baseUrl}`,
        details: { error: environment.error }
      };
    }

    return {
      status: 'pass' as const,
      message: `Successfully connected to ${environment.framework}`,
      details: { baseUrl: environment.baseUrl }
    };
  }

  private determineOverallHealth(checks: any): 'healthy' | 'warning' | 'critical' {
    const statuses = Object.values(checks).map((check: any) => check.status);
    
    if (statuses.includes('fail')) {
      return 'critical';
    }
    
    if (statuses.includes('warning')) {
      return 'warning';
    }
    
    return 'healthy';
  }

  private generateHealthRecommendations(checks: any, environment: EnvironmentDetectionResult, allFrameworks: FrameworkAvailabilityResult): string[] {
    const recommendations: string[] = [];

    if (checks.framework.status === 'fail') {
      if (allFrameworks.recommended) {
        recommendations.push(`Switch to ${allFrameworks.recommended} framework`);
      } else {
        recommendations.push('Install and configure a supported inference framework (Ollama or vLLM)');
      }
    }

    if (checks.framework.status === 'warning' && environment.models?.length === 0) {
      recommendations.push(`Pull some models for ${environment.framework}`);
    }

    if (checks.system.status === 'warning') {
      recommendations.push('Consider upgrading system resources for better performance');
    }

    if (checks.configuration.status === 'fail') {
      recommendations.push('Fix configuration errors in ~/.sightai/config.json');
    }

    if (checks.connectivity.status === 'fail') {
      recommendations.push('Check network connectivity and framework service status');
    }

    return recommendations;
  }
}
