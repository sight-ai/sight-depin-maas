#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { CliServiceOrchestrator } from './services/cli-service.orchestrator';
import { 
  CliConfig, 
  MessageType, 
  BoxType,
  CommandCategory 
} from './abstractions/cli.interfaces';
import { bootstrap } from '@saito/api-server/bootstrap';

// 加载环境变量
dotenv.config();

/**
 * 重构后的CLI主入口 
 * 使用依赖注入和服务协调器模式
 */
class RefactoredCliApplication {
  private readonly cliService: CliServiceOrchestrator;
  private readonly program: Command;

  constructor() {
    // 初始化CLI配置
    const config: Partial<CliConfig> = {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8716',
      timeout: parseInt(process.env.CLI_TIMEOUT || '10000'),
      retries: parseInt(process.env.CLI_RETRIES || '3'),
      logLevel: (process.env.CLI_LOG_LEVEL as any) || 'info',
      enableColors: process.env.CLI_COLORS !== 'false',
      enableSpinners: process.env.CLI_SPINNERS !== 'false',
      storagePath: process.env.SIGHTAI_DATA_DIR
    };

    // 初始化服务协调器
    this.cliService = new CliServiceOrchestrator(config);
    
    // 初始化命令行程序
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * 运行CLI应用
   */
  async run(): Promise<void> {
    try {
      // 如果没有参数，显示交互式菜单
      if (process.argv.length <= 2) {
        await this.showInteractiveMenu();
        return;
      }

      // 解析命令行参数
      await this.program.parseAsync(process.argv);
    } catch (error) {
      this.cliService.showMessage(
        `CLI Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MessageType.ERROR
      );
      process.exit(1);
    }
  }

  /**
   * 设置命令
   */
  private setupCommands(): void {
    this.program
      .name('sight')
      .description('SightAI CLI - Command Line Interface for Sight AI Mining Platform')
      .version('2.0.0');

    // 设备管理命令
    this.setupDeviceCommands();
    
    // 模型管理命令
    this.setupModelCommands();
    
    // 进程管理命令
    this.setupProcessCommands();
    
    // 系统命令
    this.setupSystemCommands();
  }

  /**
   * 设置设备管理命令
   */
  private setupDeviceCommands(): void {
    const deviceCmd = this.program
      .command('device')
      .description('Device management commands');

    deviceCmd
      .command('register')
      .description('Register device with gateway')
      .option('-c, --code <code>', 'Registration code')
      .option('-g, --gateway <url>', 'Gateway address')
      .option('-r, --reward <address>', 'Reward address')
      .option('-k, --key <key>', 'Authentication key')
      .action(async (options) => {
        const result = await this.cliService.register(options);
        this.handleCommandResult(result);
      });

    deviceCmd
      .command('unregister')
      .description('Unregister device from gateway')
      .action(async () => {
        const result = await this.cliService.unregister();
        this.handleCommandResult(result);
      });

    deviceCmd
      .command('status')
      .description('Show device status')
      .action(async () => {
        const result = await this.cliService.getDeviceStatus();
        this.handleCommandResult(result);
      });

    // 向后兼容的顶级命令
    this.program
      .command('register')
      .description('Register device with gateway')
      .option('-c, --code <code>', 'Registration code')
      .option('-g, --gateway <url>', 'Gateway address')
      .option('-r, --reward <address>', 'Reward address')
      .option('-k, --key <key>', 'Authentication key')
      .action(async (options) => {
        const result = await this.cliService.register(options);
        this.handleCommandResult(result);
      });

    this.program
      .command('status')
      .description('Show device status')
      .action(async () => {
        const result = await this.cliService.getDeviceStatus();
        this.handleCommandResult(result);
      });
  }

  /**
   * 设置模型管理命令
   */
  private setupModelCommands(): void {
    const modelsCmd = this.program
      .command('models')
      .description('Model management commands');

    modelsCmd
      .command('list')
      .description('List available models')
      .option('--format <format>', 'Output format (table|json)', 'table')
      .action(async (options) => {
        const result = await this.cliService.listModels();
        this.handleCommandResult(result);
      });

    modelsCmd
      .command('report [models...]')
      .description('Report models to gateway')
      .option('--all', 'Report all available models')
      .action(async (models, options) => {
        const result = await this.cliService.reportModels(options.all ? [] : models);
        this.handleCommandResult(result);
      });
  }

  /**
   * 设置进程管理命令
   */
  private setupProcessCommands(): void {
    this.program
      .command('start')
      .description('Start backend server')
      .option('--daemon', 'Run as daemon process')
      .option('--port <port>', 'Server port', '8716')
      .action(async (options) => {
        if (options.daemon) {
          const result = await this.cliService.startServer(true, options.port);
          this.handleCommandResult(result);
        } else {
          // 前台模式 - 启动实际的服务器
          await this.startForegroundServer();
        }
      });

    this.program
      .command('stop')
      .description('Stop backend server')
      .action(async () => {
        const result = await this.cliService.stopServer();
        this.handleCommandResult(result);
      });

    this.program
      .command('restart')
      .description('Restart backend server')
      .action(async () => {
        const result = await this.cliService.restartServer();
        this.handleCommandResult(result);
      });

    this.program
      .command('server-status')
      .description('Show server status')
      .action(async () => {
        const result = await this.cliService.getServerStatus();
        this.handleCommandResult(result);
      });
  }

  /**
   * 设置系统命令
   */
  private setupSystemCommands(): void {
    this.program
      .command('health')
      .description('Check system health')
      .option('--detailed', 'Show detailed diagnostics')
      .action(async (options) => {
        if (options.detailed) {
          const result = await this.cliService.performFullHealthCheck();
          this.handleCommandResult(result);
        } else {
          const health = await this.cliService.checkHealth();
          this.showHealthStatus(health);
        }
      });

    this.program
      .command('logs')
      .description('Show application logs')
      .option('--lines <n>', 'Number of lines to show', '50')
      .option('--follow', 'Follow log output')
      .action(async (options) => {
        const result = await this.cliService.viewLogs(
          parseInt(options.lines),
          options.follow
        );
        this.handleCommandResult(result);
      });

    this.program
      .command('version')
      .description('Show version information')
      .action(() => {
        this.showVersionInfo();
      });
  }

  /**
   * 显示交互式菜单
   */
  private async showInteractiveMenu(): Promise<void> {
    this.cliService.clear();
    this.showTitle();

    // 检查服务健康状态
    const healthSpinner = this.cliService.showSpinner('Checking services...');
    healthSpinner.start();

    const health = await this.cliService.checkHealth();
    healthSpinner.stop();

    this.showHealthSummary(health);

    // 显示主菜单
    const choices = [
      { name: '📋 View device status', value: 'device-status' },
      { name: '🔧 Register device', value: 'device-register' },
      { name: '❌ Unregister device', value: 'device-unregister' },
      { name: '📦 List models', value: 'models-list' },
      { name: '📤 Report models', value: 'models-report' },
      { name: '🚀 Start server', value: 'server-start' },
      { name: '🛑 Stop server', value: 'server-stop' },
      { name: '📊 Server status', value: 'server-status' },
      { name: '🏥 Health check', value: 'health-check' },
      { name: '📝 View logs', value: 'view-logs' },
      { name: '❓ Help', value: 'help' },
      { name: '🚪 Exit', value: 'exit' }
    ];

    while (true) {
      const action = await this.cliService.select('What would you like to do?', choices);

      try {
        if (action === 'exit') {
          this.cliService.showMessage('Goodbye!', MessageType.INFO);
          break;
        }

        await this.handleInteractiveAction(action);
      } catch (error) {
        this.cliService.showMessage(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          MessageType.ERROR
        );
      }

      // 等待用户按键继续
      await this.cliService.input('\nPress Enter to continue...');
      this.cliService.clear();
    }
  }

  /**
   * 处理交互式操作
   */
  private async handleInteractiveAction(action: string): Promise<void> {
    switch (action) {
      case 'device-status':
        const statusResult = await this.cliService.getDeviceStatus();
        this.handleCommandResult(statusResult);
        break;

      case 'device-register':
        const registerResult = await this.cliService.register({});
        this.handleCommandResult(registerResult);
        break;

      case 'device-unregister':
        const unregisterResult = await this.cliService.unregister();
        this.handleCommandResult(unregisterResult);
        break;

      case 'models-list':
        const modelsResult = await this.cliService.listModels();
        this.handleCommandResult(modelsResult);
        break;

      case 'models-report':
        const reportResult = await this.cliService.reportModels([]);
        this.handleCommandResult(reportResult);
        break;

      case 'server-start':
        const startDaemon = await this.cliService.confirm('Start as daemon?', true);
        const startResult = await this.cliService.startServer(startDaemon);
        this.handleCommandResult(startResult);
        break;

      case 'server-stop':
        const stopResult = await this.cliService.stopServer();
        this.handleCommandResult(stopResult);
        break;

      case 'server-status':
        const serverStatusResult = await this.cliService.getServerStatus();
        this.handleCommandResult(serverStatusResult);
        break;

      case 'health-check':
        const healthResult = await this.cliService.performFullHealthCheck();
        this.handleCommandResult(healthResult);
        break;

      case 'view-logs':
        const lines = await this.cliService.input('Number of lines to show:', '50');
        const logsResult = await this.cliService.viewLogs(parseInt(lines) || 50);
        this.handleCommandResult(logsResult);
        break;

      case 'help':
        this.showHelp();
        break;
    }
  }

  /**
   * 启动前台服务器
   */
  private async startForegroundServer(): Promise<void> {
    this.cliService.showMessage('Starting SightAI server in foreground mode...', MessageType.INFO);
    this.cliService.showMessage('Press Ctrl+C to stop the server', MessageType.INFO);

    try {
      // 处理优雅关闭
      process.on('SIGINT', async () => {
        this.cliService.showMessage('\nShutting down server...', MessageType.INFO);
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        this.cliService.showMessage('\nShutting down server...', MessageType.INFO);
        process.exit(0);
      });

      // 启动NestJS应用 (bootstrap 函数会处理应用的启动和监听)
      await bootstrap();

    } catch (error) {
      this.cliService.showMessage(
        `Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MessageType.ERROR
      );
      process.exit(1);
    }
  }

  /**
   * 处理命令结果
   */
  private handleCommandResult(result: any): void {
    if (result.success) {
      if (result.data) {
        // 结果已经在命令处理器中显示了
      } else {
        this.cliService.showMessage('Operation completed successfully', MessageType.SUCCESS);
      }
    } else {
      this.cliService.showMessage(
        result.error || 'Operation failed',
        MessageType.ERROR
      );
    }
  }

  /**
   * 显示标题
   */
  private showTitle(): void {
    const title = `
  ███████╗██╗ ██████╗ ██╗  ██╗████████╗     █████╗ ██╗
  ██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝    ██╔══██╗██║
  ███████╗██║██║  ███╗███████║   ██║       ███████║██║
  ╚════██║██║██║   ██║██╔══██║   ██║       ██╔══██║██║
  ███████║██║╚██████╔╝██║  ██║   ██║       ██║  ██║██║
  ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝
    `;

    console.log(title);
    console.log('           Command Line Interface for Sight AI Mining Platform');
    console.log('                              Version 2.0.0 (Refactored)');
    console.log('');
  }

  /**
   * 显示健康状态摘要
   */
  private showHealthSummary(health: any): void {
    const status = health.status || 'unknown';
    const statusColors = {
      healthy: MessageType.SUCCESS,
      degraded: MessageType.WARNING,
      unhealthy: MessageType.ERROR
    };

    this.cliService.showMessage(
      `System Status: ${status.toUpperCase()}`,
      statusColors[status as keyof typeof statusColors] || MessageType.INFO
    );

    if (health.issues && health.issues.length > 0) {
      console.log('Issues:');
      health.issues.forEach((issue: string) => {
        this.cliService.showMessage(`• ${issue}`, MessageType.WARNING);
      });
    }

    console.log('');
  }

  /**
   * 显示健康状态
   */
  private showHealthStatus(health: any): void {
    this.cliService.showBox(
      'System Health',
      `Status: ${health.status}\n` +
      `Components: ${Object.entries(health.components).map(([name, status]) => `${name}: ${status ? 'OK' : 'FAIL'}`).join(', ')}\n` +
      `Last Check: ${health.lastCheck}`,
      health.status === 'healthy' ? BoxType.SUCCESS : 
      health.status === 'degraded' ? BoxType.WARNING : BoxType.ERROR
    );
  }

  /**
   * 显示版本信息
   */
  private showVersionInfo(): void {
    this.cliService.showBox(
      'Version Information',
      `SightAI CLI: 2.0.0 (Refactored)\n` +
      `Node.js: ${process.version}\n` +
      `Platform: ${process.platform}\n` +
      `Architecture: ${process.arch}`,
      BoxType.INFO
    );
  }

  /**
   * 显示帮助信息
   */
  private showHelp(): void {
    const commands = this.cliService.listAvailableCommands();
    const grouped = commands.reduce((acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(grouped).forEach(([category, cmds]) => {
      this.cliService.showMessage(`\n${category.toUpperCase()} COMMANDS:`, MessageType.INFO);
      cmds.forEach(cmd => {
        console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
      });
    });
  }
}

// 启动应用
async function main() {
  const app = new RefactoredCliApplication();
  await app.run();
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('CLI Application Error:', error);
    process.exit(1);
  });
}
