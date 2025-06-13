import { Command } from 'commander';
import { LocalConfigService } from '@saito/common';
import { 
  EnvironmentDetectorService,
  EnhancedDeviceStatusService 
} from '@saito/device-status';
import {
  FrameworkSwitchService,
  ResourceManagerService
} from '@saito/model-inference-framework-management';
import { ModelFramework } from '@saito/models';
import { createTable } from '../../utils/table';
import { formatOutput, formatError, formatSuccess, formatWarning } from '../../utils/ui';

/**
 * 配置管理命令
 * 
 * 提供 CLI 界面来管理应用配置、框架切换、资源限制等
 */
export class ConfigCommand {
  constructor(
    private readonly localConfigService: LocalConfigService,
    private readonly environmentDetector: EnvironmentDetectorService,
    private readonly deviceStatusService: EnhancedDeviceStatusService,
    private readonly frameworkSwitchService: FrameworkSwitchService,
    private readonly resourceManagerService: ResourceManagerService
  ) {}

  /**
   * 注册配置相关命令
   */
  register(program: Command): void {
    const configCmd = program
      .command('config')
      .description('Manage application configuration');

    // 显示当前配置
    configCmd
      .command('show')
      .description('Show current configuration')
      .option('--json', 'Output in JSON format')
      .action(async (options) => {
        await this.showConfig(options);
      });

    // 验证配置
    configCmd
      .command('validate')
      .description('Validate current configuration')
      .action(async () => {
        await this.validateConfig();
      });

    // 切换框架
    configCmd
      .command('switch')
      .description('Switch inference framework')
      .argument('<framework>', 'Framework to switch to (ollama|vllm)')
      .option('--force', 'Force switch without availability check')
      .option('--stop-others', 'Stop other frameworks')
      .option('--no-restart', 'Do not restart backend service')
      .action(async (framework, options) => {
        await this.switchFramework(framework, options);
      });

    // 检测环境
    configCmd
      .command('detect')
      .description('Detect available frameworks')
      .option('--json', 'Output in JSON format')
      .action(async (options) => {
        await this.detectEnvironment(options);
      });

    // 设置资源限制
    configCmd
      .command('resources')
      .description('Manage resource limits')
      .option('--framework <framework>', 'Target framework (ollama|vllm)')
      .option('--gpu-ids <ids>', 'GPU IDs to use (comma-separated)')
      .option('--memory <limit>', 'Memory limit (e.g., "8GB")')
      .option('--show', 'Show current resource configuration')
      .action(async (options) => {
        await this.manageResources(options);
      });

    // 重置配置
    configCmd
      .command('reset')
      .description('Reset configuration to defaults')
      .option('--confirm', 'Confirm the reset operation')
      .action(async (options) => {
        await this.resetConfig(options);
      });

    // 应用状态
    configCmd
      .command('status')
      .description('Show application status')
      .option('--json', 'Output in JSON format')
      .action(async (options) => {
        await this.showStatus(options);
      });

    // 健康检查
    configCmd
      .command('health')
      .description('Perform health check')
      .option('--json', 'Output in JSON format')
      .action(async (options) => {
        await this.performHealthCheck(options);
      });
  }

  /**
   * 显示当前配置
   */
  private async showConfig(options: { json?: boolean }): Promise<void> {
    try {
      const clientType = this.localConfigService.getClientType();
      const appConfig = this.localConfigService.getAppConfig();
      
      if (options.json) {
        console.log(JSON.stringify(appConfig, null, 2));
        return;
      }

      console.log(formatOutput('Current Configuration'));
      console.log('');

      createTable(['Setting', 'Value'], [
        ['Client Type', clientType || 'Not set'],
        ['Framework Config', appConfig.frameworkConfig ? 'Configured' : 'Not configured'],
        ['Last Updated', appConfig.lastUpdated || 'Unknown']
      ]);

      if (appConfig.frameworkConfig) {
        console.log('');
        console.log(formatOutput('Framework Configuration'));
        
        createTable(['Property', 'Value'], [
          ['Framework', appConfig.frameworkConfig.framework],
          ['Base URL', appConfig.frameworkConfig.baseUrl],
          ['Timeout', `${appConfig.frameworkConfig.timeout || 30000}ms`],
          ['Retries', `${appConfig.frameworkConfig.retries || 3}`]
        ]);
      }

    } catch (error) {
      console.error(formatError(`Failed to show configuration: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 验证配置
   */
  private async validateConfig(): Promise<void> {
    try {
      console.log(formatOutput('Validating Configuration...'));
      
      const validation = this.localConfigService.validateConfig();
      
      if (validation.isValid) {
        console.log(formatSuccess('✓ Configuration is valid'));
      } else {
        console.log(formatError('✗ Configuration has errors:'));
        validation.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
      }

      if (validation.warnings.length > 0) {
        console.log(formatWarning('Warnings:'));
        validation.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      }

    } catch (error) {
      console.error(formatError(`Failed to validate configuration: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 切换框架
   */
  private async switchFramework(framework: string, options: any): Promise<void> {
    try {
      if (!['ollama', 'vllm'].includes(framework)) {
        console.error(formatError('Invalid framework. Must be "ollama" or "vllm"'));
        process.exit(1);
      }

      console.log(formatOutput(`Switching to ${framework}...`));

      const result = await this.frameworkSwitchService.switchToFramework(
        framework === 'ollama' ? ModelFramework.OLLAMA : ModelFramework.VLLM,
        {
          force: options.force,
          validateAvailability: !options.force,
          stopOthers: options.stopOthers,
          restartBackend: !options.noRestart
        }
      );

      if (result.success) {
        console.log(formatSuccess(`✓ ${result.message}`));
        
        if (!options.noRestart) {
          console.log(formatWarning('Note: Backend restart is required for changes to take effect'));
        }
      } else {
        console.error(formatError(`✗ ${result.message}`));
        process.exit(1);
      }

    } catch (error) {
      console.error(formatError(`Failed to switch framework: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 检测环境
   */
  private async detectEnvironment(options: { json?: boolean }): Promise<void> {
    try {
      console.log(formatOutput('Detecting Available Frameworks...'));
      
      const summary = await this.environmentDetector.getEnvironmentSummary();
      
      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      console.log('');
      console.log(formatOutput('Current Environment'));
      
      createTable(['Property', 'Value'], [
        ['Framework', summary.current.framework || 'None'],
        ['Available', summary.current.isAvailable ? '✓' : '✗'],
        ['Base URL', summary.current.baseUrl || 'N/A'],
        ['Version', summary.current.version || 'N/A'],
        ['Models', `${summary.current.models?.length || 0} models`]
      ]);

      console.log('');
      console.log(formatOutput('Available Frameworks'));
      
      createTable(['Framework', 'Available', 'Base URL', 'Models'], [
        [
          'Ollama',
          summary.available.ollama.available ? '✓' : '✗',
          summary.available.ollama.baseUrl,
          `${summary.available.ollama.models?.length || 0} models`
        ],
        [
          'vLLM',
          summary.available.vllm.available ? '✓' : '✗',
          summary.available.vllm.baseUrl,
          `${summary.available.vllm.models?.length || 0} models`
        ]
      ]);

      if (summary.available.recommended) {
        console.log('');
        console.log(formatSuccess(`Recommended: ${summary.available.recommended}`));
      }

      if (summary.recommendations.length > 0) {
        console.log('');
        console.log(formatWarning('Recommendations'));
        summary.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }

    } catch (error) {
      console.error(formatError(`Failed to detect environment: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 管理资源
   */
  private async manageResources(options: any): Promise<void> {
    try {
      if (options.show) {
        // 显示当前资源配置
        const systemResources = await this.resourceManagerService.getSystemResources();
        
        console.log(formatOutput('System Resources'));
        console.log('');
        
        createTable(['Resource', 'Details'], [
          ['Total Memory', systemResources.totalMemory],
          ['Available Memory', systemResources.availableMemory],
          ['CPU Cores', systemResources.cpuCores.toString()],
          ['GPUs', systemResources.gpus.length.toString()]
        ]);

        if (systemResources.gpus.length > 0) {
          console.log('');
          console.log(formatOutput('GPU Information'));
          
          createTable(['ID', 'Name', 'Memory'],
            systemResources.gpus.map(gpu => [gpu.id.toString(), gpu.name, gpu.memory])
          );
        }

        return;
      }

      if (!options.framework) {
        console.error(formatError('Framework must be specified with --framework'));
        process.exit(1);
      }

      if (!['ollama', 'vllm'].includes(options.framework)) {
        console.error(formatError('Invalid framework. Must be "ollama" or "vllm"'));
        process.exit(1);
      }

      const limits: any = {};

      if (options.gpuIds) {
        limits.gpuIds = options.gpuIds.split(',').map((id: string) => parseInt(id.trim(), 10));
      }

      if (options.memory) {
        limits.memoryLimit = options.memory;
      }

      if (Object.keys(limits).length === 0) {
        console.error(formatError('No resource limits specified. Use --gpu-ids or --memory'));
        process.exit(1);
      }

      console.log(formatOutput(`Setting resource limits for ${options.framework}...`));

      const result = await this.frameworkSwitchService.setFrameworkResourceLimits(
        options.framework,
        limits
      );

      if (result.success) {
        console.log(formatSuccess(`✓ ${result.message}`));
      } else {
        console.error(formatError(`✗ ${result.message}`));
        process.exit(1);
      }

    } catch (error) {
      console.error(formatError(`Failed to manage resources: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 重置配置
   */
  private async resetConfig(options: { confirm?: boolean }): Promise<void> {
    try {
      if (!options.confirm) {
        console.log(formatWarning('This will reset all configuration to defaults.'));
        console.log('Use --confirm to proceed with the reset.');
        return;
      }

      console.log(formatOutput('Resetting configuration...'));

      const success = this.localConfigService.resetToDefaults();

      if (success) {
        console.log(formatSuccess('✓ Configuration reset to defaults'));
      } else {
        console.error(formatError('✗ Failed to reset configuration'));
        process.exit(1);
      }

    } catch (error) {
      console.error(formatError(`Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 显示应用状态
   */
  private async showStatus(options: { json?: boolean }): Promise<void> {
    try {
      const deviceStatus = await this.deviceStatusService.getDeviceStatusOverview();
      
      if (options.json) {
        console.log(JSON.stringify(deviceStatus, null, 2));
        return;
      }

      console.log(formatOutput('Application Status'));
      console.log('');

      createTable(['Component', 'Status'], [
        ['Device Status', deviceStatus.status],
        ['Framework Type', deviceStatus.framework.type || 'None'],
        ['Framework Available', deviceStatus.framework.available ? '✓' : '✗'],
        ['Framework Version', deviceStatus.framework.version || 'N/A'],
        ['Available Models', deviceStatus.framework.models.length.toString()],
        ['Last Updated', deviceStatus.lastUpdated]
      ]);

    } catch (error) {
      console.error(formatError(`Failed to show status: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(options: { json?: boolean }): Promise<void> {
    try {
      console.log(formatOutput('Performing Health Check...'));
      
      const healthCheck = await this.deviceStatusService.performHealthCheck();
      
      if (options.json) {
        console.log(JSON.stringify(healthCheck, null, 2));
        return;
      }

      console.log('');
      const healthStatus = `Overall Health: ${healthCheck.overall.toUpperCase()}`;
      if (healthCheck.overall === 'healthy') {
        console.log(formatSuccess(healthStatus));
      } else if (healthCheck.overall === 'warning') {
        console.log(formatWarning(healthStatus));
      } else {
        console.log(formatError(healthStatus));
      }

      console.log('');
      console.log(formatOutput('Component Health'));
      
      createTable(['Component', 'Status', 'Message'],
        Object.entries(healthCheck.checks).map(([component, check]) => {
          const statusIcon = check.status === 'pass' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
          return [component, `${statusIcon} ${check.status}`, check.message];
        })
      );

      if (healthCheck.recommendations.length > 0) {
        console.log('');
        console.log(formatWarning('Recommendations'));
        healthCheck.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }

    } catch (error) {
      console.error(formatError(`Failed to perform health check: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }
}
