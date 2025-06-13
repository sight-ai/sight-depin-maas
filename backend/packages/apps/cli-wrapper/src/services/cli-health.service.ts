import {
  ICliHealth,
  IDirectServiceAccess,
  IProcessManager,
  IStorageManager,
  CliHealthResult,
  DiagnosticsResult,
  CliError
} from '../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * CLI健康检查服务 
 * 只负责CLI系统的健康状态检查和诊断，直接使用libs服务
 */
export class CliHealthService implements ICliHealth {
  constructor(
    private readonly serviceAccess: IDirectServiceAccess,
    private readonly processManager: IProcessManager,
    private readonly storageManager: IStorageManager,
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {}

  /**
   * 检查API连接
   */
  async checkApiConnection(): Promise<boolean> {
    try {
      const health = await this.serviceAccess.checkServicesHealth();
      return health.isHealthy;
    } catch {
      return false;
    }
  }

  /**
   * 检查CLI健康状态
   */
  async checkHealth(): Promise<CliHealthResult> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // 并行检查各个组件
      const [servicesCheck, processCheck, storageCheck] = await Promise.allSettled([
        this.checkServicesConnection(),
        this.checkProcessStatus(),
        this.checkStorageAccess()
      ]);

      const components = {
        apiClient: servicesCheck.status === 'fulfilled' && servicesCheck.value,
        processManager: processCheck.status === 'fulfilled' && processCheck.value,
        storageManager: storageCheck.status === 'fulfilled' && storageCheck.value,
        configManager: true // 配置管理器通常总是可用的
      };

      // 收集问题
      if (!components.apiClient) {
        issues.push('Services are not available or unhealthy');
      }
      if (!components.processManager) {
        issues.push('Process manager cannot access process information');
      }
      if (!components.storageManager) {
        issues.push('Storage manager cannot access local storage');
      }

      // 确定整体状态
      const healthyComponents = Object.values(components).filter(Boolean).length;
      const totalComponents = Object.keys(components).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyComponents === totalComponents) {
        status = 'healthy';
      } else if (healthyComponents >= totalComponents / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        components,
        issues,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        components: {
          apiClient: false,
          processManager: false,
          storageManager: false,
          configManager: false
        },
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        lastCheck: new Date()
      };
    }
  }

  /**
   * 检查服务连接
   */
  async checkServicesConnection(): Promise<boolean> {
    try {
      const health = await this.serviceAccess.checkServicesHealth();
      return health.isHealthy;
    } catch {
      return false;
    }
  }

  /**
   * 检查进程状态
   */
  async checkProcessStatus(): Promise<boolean> {
    try {
      const status = await this.processManager.getStatus();
      return status.isRunning;
    } catch {
      return false;
    }
  }

  /**
   * 检查存储访问
   */
  async checkStorageAccess(): Promise<boolean> {
    try {
      await this.storageManager.ensureStorageExists();
      const stats = await this.storageManager.getStorageStats();
      return stats.exists;
    } catch {
      return false;
    }
  }

  /**
   * 执行详细诊断
   */
  async performDiagnostics(): Promise<DiagnosticsResult> {
    const tests: Array<{
      name: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
      duration: number;
    }> = [];

    const recommendations: string[] = [];

    // 测试1: API连接
    const apiTest = await this.runDiagnosticTest(
      'API Connection',
      async () => {
        const health = await this.serviceAccess.checkServicesHealth();
        if (!health.isHealthy) {
          const unhealthyServices = Object.entries(health.services)
            .filter(([, status]) => !status)
            .map(([name]) => name)
            .join(', ');
          throw new Error(`Services unhealthy: ${unhealthyServices || 'Unknown issues'}`);
        }
        return `Services healthy, last check: ${health.lastCheck.toISOString()}`;
      }
    );
    tests.push(apiTest);

    if (apiTest.status === 'fail') {
      recommendations.push('Start the backend server using: sight start --daemon');
      recommendations.push('Check if port 8716 is available');
    }

    // 测试2: 进程管理
    const processTest = await this.runDiagnosticTest(
      'Process Management',
      async () => {
        const status = await this.processManager.getStatus();
        if (status.isRunning) {
          return `Process running (PID: ${status.pid}, uptime: ${this.formatUptime(status.uptime)})`;
        } else {
          throw new Error('No backend process running');
        }
      }
    );
    tests.push(processTest);

    if (processTest.status === 'fail') {
      recommendations.push('Start the backend process using: sight start --daemon');
    }

    // 测试3: 存储访问
    const storageTest = await this.runDiagnosticTest(
      'Storage Access',
      async () => {
        const stats = await this.storageManager.getStorageStats();
        if (!stats.exists) {
          await this.storageManager.ensureStorageExists();
          return 'Storage directory created successfully';
        }
        return `Storage accessible (${stats.files.length} files, ${this.formatBytes(stats.size)})`;
      }
    );
    tests.push(storageTest);

    if (storageTest.status === 'fail') {
      recommendations.push('Check file system permissions for CLI storage directory');
      recommendations.push(`Ensure write access to: ${this.storageManager.getStoragePath()}`);
    }

    // 测试4: 配置验证
    const configTest = await this.runDiagnosticTest(
      'Configuration',
      async () => {
        const registration = await this.storageManager.loadRegistration();
        if (registration?.isRegistered) {
          return `Device registered (ID: ${registration.deviceId})`;
        } else {
          return 'Device not registered (this is normal for new installations)';
        }
      }
    );
    tests.push(configTest);

    if (configTest.status === 'fail') {
      recommendations.push('Register the device using: sight register');
    }

    // 测试5: 网络连接
    const networkTest = await this.runDiagnosticTest(
      'Network Connectivity',
      async () => {
        // 简单的连接测试 - 尝试检查服务健康状态
        const health = await this.serviceAccess.checkServicesHealth();
        if (health.isHealthy) {
          return `Network connection successful`;
        } else {
          throw new Error(`Cannot connect to services`);
        }
      }
    );
    tests.push(networkTest);

    if (networkTest.status === 'fail') {
      recommendations.push('Check network connectivity');
      recommendations.push('Verify firewall settings');
      recommendations.push('Ensure backend server is accessible');
    }

    // 确定整体结果
    const failedTests = tests.filter(t => t.status === 'fail').length;
    const warningTests = tests.filter(t => t.status === 'warning').length;
    
    let overall: 'pass' | 'warning' | 'fail';
    if (failedTests === 0 && warningTests === 0) {
      overall = 'pass';
    } else if (failedTests === 0) {
      overall = 'warning';
    } else {
      overall = 'fail';
    }

    return {
      overall,
      tests,
      recommendations
    };
  }

  /**
   * 运行单个诊断测试
   */
  private async runDiagnosticTest(
    name: string,
    testFn: () => Promise<string>
  ): Promise<{
    name: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();
    
    try {
      const message = await testFn();
      const duration = Date.now() - startTime;
      
      return {
        name,
        status: 'pass',
        message,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        name,
        status: 'fail',
        message,
        duration
      };
    }
  }

  /**
   * 格式化运行时间
   */
  private formatUptime(uptimeMs?: number): string {
    if (!uptimeMs) return 'unknown';
    
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
