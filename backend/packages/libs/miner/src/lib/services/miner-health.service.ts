import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  IMinerHealth,
  ITaskManager,
  IEarningsManager,
  IStatisticsAnalyzer,
  IGatewayConnector,
  IDataAccessLayer,
  HealthCheckResult,
  SystemStatus,
  ConfigurationValidation,
  DiagnosticsResult,
  MinerConfig,
  MinerError,
  TASK_MANAGER,
  EARNINGS_MANAGER,
  STATISTICS_ANALYZER,
  GATEWAY_CONNECTOR,
  DATA_ACCESS_LAYER
} from '../core-contracts/miner-core.contracts';
import { ErrorHandlerService } from '@saito/common';
import * as os from 'os';

/**
 * 矿工健康检查服务 
 * 只负责矿工系统的健康检查和诊断
 */
@Injectable()
export class MinerHealthService implements IMinerHealth {
  private readonly logger = new Logger(MinerHealthService.name);

  constructor(
    @Inject(TASK_MANAGER)
    private readonly taskManager: ITaskManager,
    
    @Inject(EARNINGS_MANAGER)
    private readonly earningsManager: IEarningsManager,
    
    @Inject(STATISTICS_ANALYZER)
    private readonly statisticsAnalyzer: IStatisticsAnalyzer,
    
    @Inject(GATEWAY_CONNECTOR)
    private readonly gatewayConnector: IGatewayConnector,
    
    @Inject(DATA_ACCESS_LAYER)
    private readonly dataAccess: IDataAccessLayer,
    
    @Inject('MINER_CONFIG')
    private readonly config: MinerConfig,
    
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * 执行健康检查
   */
  async checkHealth(): Promise<HealthCheckResult> {
    try {
      this.logger.debug('Starting health check');
      
      const components = await this.checkAllComponents();
      const issues = this.identifyIssues(components);
      const status = this.determineOverallStatus(components, issues);

      const result: HealthCheckResult = {
        status,
        components,
        issues,
        lastCheck: new Date()
      };

      this.logger.debug(`Health check completed. Status: ${status}`);
      return result;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      throw new MinerError('Health check failed', 'HEALTH_CHECK_ERROR', { error });
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      this.logger.debug('Getting system status');
      
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      const networkStatus = await this.checkNetworkStatus();
      const databaseStatus = await this.checkDatabaseStatus();
      const servicesStatus = await this.checkServicesStatus();

      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        network: networkStatus,
        database: databaseStatus,
        services: servicesStatus
      };
    } catch (error) {
      this.logger.error('Failed to get system status:', error);
      throw new MinerError('System status check failed', 'SYSTEM_STATUS_ERROR', { error });
    }
  }

  /**
   * 验证配置
   */
  async validateConfiguration(): Promise<ConfigurationValidation> {
    try {
      this.logger.debug('Validating configuration');
      
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // 验证必需的配置项
      if (this.config.maxRetries < 0) {
        errors.push('maxRetries must be non-negative');
      }
      
      if (this.config.retryDelay < 100) {
        warnings.push('retryDelay is very low, may cause excessive load');
      }
      
      if (this.config.staleTaskThreshold < 60000) {
        warnings.push('staleTaskThreshold is very low, may cause premature task cleanup');
      }
      
      if (this.config.defaultPageSize > 1000) {
        warnings.push('defaultPageSize is very high, may cause memory issues');
      }

      // 性能建议
      if (this.config.maxConcurrentTasks > os.cpus().length * 2) {
        recommendations.push('Consider reducing maxConcurrentTasks based on CPU cores');
      }
      
      if (this.config.taskTimeout < 30000) {
        recommendations.push('Consider increasing taskTimeout for complex tasks');
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        warnings,
        recommendations
      };
    } catch (error) {
      this.logger.error('Configuration validation failed:', error);
      throw new MinerError('Configuration validation failed', 'CONFIG_VALIDATION_ERROR', { error });
    }
  }

  /**
   * 执行诊断
   */
  async performDiagnostics(): Promise<DiagnosticsResult> {
    try {
      this.logger.debug('Starting diagnostics');
      
      const tests = await this.runDiagnosticTests();
      const overall = this.determineDiagnosticStatus(tests);
      const summary = this.generateDiagnosticSummary(tests);
      const recommendations = this.generateDiagnosticRecommendations(tests);

      return {
        overall,
        tests,
        summary,
        recommendations
      };
    } catch (error) {
      this.logger.error('Diagnostics failed:', error);
      throw new MinerError('Diagnostics failed', 'DIAGNOSTICS_ERROR', { error });
    }
  }

  /**
   * 检查所有组件
   */
  private async checkAllComponents(): Promise<HealthCheckResult['components']> {
    const results = await Promise.allSettled([
      this.checkComponent('taskManager', () => this.taskManager.getTaskStats()),
      this.checkComponent('earningsManager', () => this.earningsManager.getEarningsStats()),
      this.checkComponent('statisticsAnalyzer', () => this.statisticsAnalyzer.getPerformanceMetrics()),
      this.checkComponent('gatewayConnector', () => this.gatewayConnector.validateGatewayConnection('', '')),
      this.checkComponent('dataAccess', () => this.dataAccess.loadStatistics())
    ]);

    return {
      taskManager: results[0].status === 'fulfilled' && results[0].value,
      earningsManager: results[1].status === 'fulfilled' && results[1].value,
      statisticsAnalyzer: results[2].status === 'fulfilled' && results[2].value,
      gatewayConnector: results[3].status === 'fulfilled' && results[3].value,
      dataAccess: results[4].status === 'fulfilled' && results[4].value
    };
  }

  /**
   * 检查单个组件
   */
  private async checkComponent(name: string, testFn: () => Promise<any>): Promise<boolean> {
    try {
      await testFn();
      return true;
    } catch (error) {
      this.logger.warn(`Component ${name} health check failed:`, error);
      return false;
    }
  }

  /**
   * 识别问题
   */
  private identifyIssues(components: HealthCheckResult['components']): string[] {
    const issues: string[] = [];
    
    Object.entries(components).forEach(([name, isHealthy]) => {
      if (!isHealthy) {
        issues.push(`${name} is not responding properly`);
      }
    });

    return issues;
  }

  /**
   * 确定整体状态
   */
  private determineOverallStatus(
    components: HealthCheckResult['components'], 
    issues: string[]
  ): HealthCheckResult['status'] {
    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.values(components).length;
    
    if (healthyCount === totalCount) {
      return 'healthy';
    } else if (healthyCount >= totalCount * 0.7) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) / 100; // 转换为百分比
        resolve(Math.min(percentage, 100));
      }, 100);
    });
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    const used = process.memoryUsage();
    const total = os.totalmem();
    return (used.heapUsed / total) * 100;
  }

  /**
   * 获取磁盘使用率
   */
  private async getDiskUsage(): Promise<number> {
    try {
      // 简化的磁盘使用率检查
      const stats = await import('fs').then(fs => fs.promises.stat('.'));
      return 50; // 返回估算值，实际实现需要更复杂的逻辑
    } catch {
      return 0;
    }
  }

  /**
   * 检查网络状态
   */
  private async checkNetworkStatus(): Promise<boolean> {
    try {
      // 简单的网络连接检查
      return await this.gatewayConnector.validateGatewayConnection('', '');
    } catch {
      return false;
    }
  }

  /**
   * 检查数据库状态
   */
  private async checkDatabaseStatus(): Promise<boolean> {
    try {
      await this.dataAccess.loadStatistics();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查服务状态
   */
  private async checkServicesStatus(): Promise<Record<string, boolean>> {
    const services = {
      taskManager: false,
      earningsManager: false,
      statisticsAnalyzer: false,
      gatewayConnector: false,
      dataAccess: false
    };

    try {
      services.taskManager = await this.checkComponent('taskManager', () => this.taskManager.getTaskStats());
      services.earningsManager = await this.checkComponent('earningsManager', () => this.earningsManager.getEarningsStats());
      services.statisticsAnalyzer = await this.checkComponent('statisticsAnalyzer', () => this.statisticsAnalyzer.getPerformanceMetrics());
      services.gatewayConnector = await this.checkComponent('gatewayConnector', () => this.gatewayConnector.validateGatewayConnection('', ''));
      services.dataAccess = await this.checkComponent('dataAccess', () => this.dataAccess.loadStatistics());
    } catch (error) {
      this.logger.warn('Failed to check some services:', error);
    }

    return services;
  }

  /**
   * 运行诊断测试
   */
  private async runDiagnosticTests(): Promise<DiagnosticsResult['tests']> {
    const tests = [
      { name: 'Configuration Validation', test: () => this.validateConfiguration() },
      { name: 'System Resources', test: () => this.getSystemStatus() },
      { name: 'Component Health', test: () => this.checkHealth() },
      { name: 'Database Connectivity', test: () => this.checkDatabaseStatus() },
      { name: 'Network Connectivity', test: () => this.checkNetworkStatus() }
    ];

    const results = [];

    for (const { name, test } of tests) {
      const startTime = Date.now();
      try {
        await test();
        results.push({
          name,
          status: 'pass' as const,
          message: 'Test passed successfully',
          duration: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          name,
          status: 'fail' as const,
          message: error instanceof Error ? error.message : 'Test failed',
          duration: Date.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * 确定诊断状态
   */
  private determineDiagnosticStatus(tests: DiagnosticsResult['tests']): DiagnosticsResult['overall'] {
    const failedTests = tests.filter(t => t.status === 'fail').length;
    const warningTests = tests.filter(t => t.status === 'warning').length;
    
    if (failedTests > 0) {
      return 'fail';
    } else if (warningTests > 0) {
      return 'warning';
    } else {
      return 'pass';
    }
  }

  /**
   * 生成诊断摘要
   */
  private generateDiagnosticSummary(tests: DiagnosticsResult['tests']): string {
    const passed = tests.filter(t => t.status === 'pass').length;
    const failed = tests.filter(t => t.status === 'fail').length;
    const warnings = tests.filter(t => t.status === 'warning').length;
    
    return `Diagnostics completed: ${passed} passed, ${warnings} warnings, ${failed} failed`;
  }

  /**
   * 生成诊断建议
   */
  private generateDiagnosticRecommendations(tests: DiagnosticsResult['tests']): string[] {
    const recommendations: string[] = [];
    
    const failedTests = tests.filter(t => t.status === 'fail');
    if (failedTests.length > 0) {
      recommendations.push('Address failed tests to ensure system stability');
    }
    
    const slowTests = tests.filter(t => t.duration > 5000);
    if (slowTests.length > 0) {
      recommendations.push('Investigate slow response times in system components');
    }
    
    return recommendations;
  }
}
