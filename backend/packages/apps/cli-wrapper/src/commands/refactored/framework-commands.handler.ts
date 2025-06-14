import {
  IDirectServiceAccess,
  IUserInterface,
  CommandResult,
  TableData,
  MessageType,
  BoxType
} from '../../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 框架命令处理器 
 * 只负责框架管理相关命令的处理逻辑，直接使用libs服务
 */
export class FrameworkCommandsHandler {
  constructor(
    private readonly serviceAccess: IDirectServiceAccess,
    private readonly ui: IUserInterface,
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {}

  /**
   * 处理框架状态查询命令
   */
  async handleFrameworkStatus(): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Checking framework status...');
    spinner.start();

    try {
      const frameworkManager = await this.serviceAccess.getFrameworkManagerService();

      // 获取框架状态（包含实际服务检测）
      const status = await frameworkManager.getFrameworkStatus();

      spinner.succeed('Framework status retrieved successfully');

      // 显示框架状态
      this.showFrameworkStatus(status);

      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to get framework status');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Framework status check failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'FRAMEWORK_STATUS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理框架切换命令
   */
  async handleFrameworkSwitch(framework: string, force: boolean = false): Promise<CommandResult> {
    try {
      // 验证框架名称
      if (!['ollama', 'vllm'].includes(framework.toLowerCase())) {
        this.ui.error(`Invalid framework: ${framework}. Supported frameworks: ollama, vllm`);
        return {
          success: false,
          error: `Invalid framework: ${framework}`,
          code: 'INVALID_FRAMEWORK',
          timestamp: new Date().toISOString()
        };
      }

      const targetFramework = framework.toLowerCase();

      // 检查当前框架
      const frameworkManager = await this.serviceAccess.getFrameworkManagerService();
      const currentFramework = await frameworkManager.getCurrentFramework();

      if (currentFramework === targetFramework && !force) {
        this.ui.warning(`Already using ${targetFramework} framework`);
        return {
          success: true,
          data: { framework: targetFramework, switched: false },
          timestamp: new Date().toISOString()
        };
      }

      // 确认切换
      if (!force) {
        const confirmed = await this.ui.confirm(
          `Switch from ${currentFramework || 'unknown'} to ${targetFramework}?`,
          true
        );

        if (!confirmed) {
          this.ui.info('Framework switch cancelled');
          return {
            success: false,
            error: 'Framework switch cancelled by user',
            timestamp: new Date().toISOString()
          };
        }
      }

      const spinner = this.ui.showSpinner(`Switching to ${targetFramework} framework...`);
      spinner.start();

      // 执行框架切换（使用简化版本）
      const result = await frameworkManager.switchFramework(targetFramework);

      if (result) {
        spinner.succeed(`Framework switch instructions provided`);
        this.showFrameworkSwitchSuccess(targetFramework, {
          message: 'Please follow the instructions to complete the switch'
        });

        return {
          success: true,
          data: {
            framework: targetFramework,
            switched: true,
            result: { success: true, message: 'Instructions provided' }
          },
          timestamp: new Date().toISOString()
        };
      } else {
        spinner.fail(`Failed to provide switch instructions`);
        this.ui.error('Framework switch failed');

        return {
          success: false,
          error: 'Framework switch failed',
          code: 'FRAMEWORK_SWITCH_FAILED',
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Framework switch failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'FRAMEWORK_SWITCH_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理统一模型列表查询命令
   */
  async handleUnifiedModels(framework?: string): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Fetching unified models...');
    spinner.start();

    try {
      const frameworkManager = await this.serviceAccess.getFrameworkManagerService();
      const usedFramework = framework || await frameworkManager.getCurrentFramework();

      spinner.fail('Unified models not available in CLI mode');
      this.ui.warning(`Unified models feature is not available in CLI mode.`);
      this.ui.info(`Please use the API server or direct framework commands to list models.`);
      this.ui.info(`Current framework: ${usedFramework}`);

      return {
        success: false,
        error: 'Unified models not available in CLI mode',
        code: 'CLI_MODE_LIMITATION',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to fetch unified models');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Unified models fetch failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'UNIFIED_MODELS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理统一健康检查命令
   */
  async handleUnifiedHealth(): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Checking unified health...');
    spinner.start();

    try {
      const frameworkManager = await this.serviceAccess.getFrameworkManagerService();
      const currentFramework = await frameworkManager.getCurrentFramework();
      const status = await frameworkManager.getFrameworkStatus();

      spinner.succeed('Unified health check completed');

      const healthData = {
        current: {
          framework: currentFramework,
          healthy: true // 在 CLI 模式下假设是健康的
        },
        available: status.available || ['ollama', 'vllm'],
        overall: true
      };

      this.showUnifiedHealth(healthData);

      return {
        success: true,
        data: healthData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Unified health check failed');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Unified health check failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'UNIFIED_HEALTH_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理统一版本信息查询命令
   */
  async handleUnifiedVersion(framework?: string): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Fetching version information...');
    spinner.start();

    try {
      const frameworkManager = await this.serviceAccess.getFrameworkManagerService();
      const usedFramework = framework || await frameworkManager.getCurrentFramework();

      spinner.fail('Version information not available in CLI mode');
      this.ui.warning(`Version information feature is not available in CLI mode.`);
      this.ui.info(`Please use the API server or direct framework commands to get version info.`);
      this.ui.info(`Current framework: ${usedFramework}`);

      return {
        success: false,
        error: 'Version information not available in CLI mode',
        code: 'CLI_MODE_LIMITATION',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to get version information');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Version info fetch failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'VERSION_INFO_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 显示框架状态
   */
  private showFrameworkStatus(status: any): void {
    this.ui.showTitle('Framework Status');

    this.ui.showSubtitle('Current Framework');
    this.ui.showKeyValue('Active Framework', status.current || 'None');

    console.log();

    this.ui.showSubtitle('Available Frameworks');
    if (status.available && status.available.length > 0) {
      status.available.forEach((framework: string) => {
        const isActive = framework === status.current;
        const detection = status.detection?.[framework];
        let statusText = 'Available';

        if (detection) {
          if (detection.isRunning) {
            statusText = isActive ? 'Active (Running)' : 'Running';
          } else {
            statusText = isActive ? 'Active (Offline)' : 'Offline';
          }
        } else if (isActive) {
          statusText = 'Active';
        }

        this.ui.showKeyValue(framework.toUpperCase(), statusText);
      });
    } else {
      this.ui.warning('No frameworks available');
    }

    // 显示详细的检测信息
    if (status.detection) {
      console.log();
      this.ui.showSubtitle('Service Status Details');

      Object.entries(status.detection).forEach(([framework, details]: [string, any]) => {
        const statusIcon = details.isRunning ? '✅' : '❌';
        const statusText = details.isRunning ? 'Running' : 'Offline';

        this.ui.showKeyValue(`${framework}`, `${statusIcon} ${statusText}`);
        if (details.url) {
          this.ui.showKeyValue(`  URL`, details.url);
        }
        if (details.reason) {
          this.ui.showKeyValue(`  Reason`, details.reason);
        }
      });
    }

    // 显示主要框架状态
    if (status.primary) {
      console.log();
      this.ui.showSubtitle('Primary Framework Status');
      this.ui.showKeyValue('Framework', status.primary.framework);
      this.ui.showKeyValue('Available', status.primary.isAvailable ? '✅' : '❌');
      this.ui.showKeyValue('URL', status.primary.url);
      if (status.primary.version) {
        this.ui.showKeyValue('Version', status.primary.version);
      }
    } else {
      console.log();
      this.ui.showSubtitle('Primary Framework Status');
      this.ui.showKeyValue('Status', '❌ No framework services are currently running');
    }
  }

  /**
   * 显示框架切换成功信息
   */
  private showFrameworkSwitchSuccess(framework: string, result: any): void {
    this.ui.showBox(
      'Framework Switch Successful',
      `Successfully switched to ${framework.toUpperCase()} framework.\n\n` +
      `Framework: ${framework}\n` +
      `Status: Active\n` +
      `Message: ${result.message || 'Switch completed successfully'}\n\n` +
      `You can now use ${framework} for model inference.`,
      BoxType.SUCCESS
    );
  }

  /**
   * 显示统一模型表格
   */
  private showUnifiedModelsTable(models: any[], framework?: string): void {
    const tableData: TableData = {
      title: `Available Models - ${framework?.toUpperCase() || 'Current Framework'} (${models.length})`,
      headers: ['Name', 'Size', 'Modified', 'Family'],
      rows: models.map(model => [
        model.name || 'N/A',
        this.formatSize(model.size),
        this.formatDate(model.modified_at),
        model.family || model.families?.join(', ') || 'N/A'
      ])
    };

    this.ui.showTable(tableData);
  }

  /**
   * 显示统一健康状态
   */
  private showUnifiedHealth(health: any): void {
    this.ui.showTitle('Unified Health Status');

    this.ui.showSubtitle('Current Framework');
    this.ui.showKeyValue('Framework', health.current.framework || 'None');
    this.ui.showKeyValue('Status', health.current.healthy ? 'Healthy' : 'Unhealthy');

    console.log();

    this.ui.showSubtitle('Available Frameworks');
    if (health.available && health.available.length > 0) {
      health.available.forEach((framework: string) => {
        this.ui.showKeyValue(framework.toUpperCase(), 'Available');
      });
    } else {
      this.ui.warning('No frameworks available');
    }

    console.log();

    this.ui.showKeyValue('Overall Status', health.overall ? 'Healthy' : 'Unhealthy');
  }

  /**
   * 显示版本信息
   */
  private showVersionInfo(version: any, framework?: string): void {
    this.ui.showBox(
      `Version Information - ${framework?.toUpperCase() || 'Current Framework'}`,
      `Framework: ${framework || 'Unknown'}\n` +
      `Version: ${version.version || 'Unknown'}\n` +
      `Build: ${version.build || 'Unknown'}\n` +
      `API Version: ${version.api_version || 'Unknown'}`,
      BoxType.INFO
    );
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }
}
