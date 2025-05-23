#!/usr/bin/env node

import { Command } from 'commander';
import { bootstrap } from '@saito/api-server/bootstrap';
import { DeviceCommands } from './commands/device';
import { ModelCommands } from './commands/models';
import { AppServices } from './services/app-services';
import { ProcessManager } from './services/process-manager';
import { UIUtils } from './utils/ui';
import inquirer from 'inquirer';

const program = new Command();

/**
 * 交互式CLI模式
 */
async function startInteractiveCli(): Promise<void> {
  UIUtils.clear();
  UIUtils.showTitle();

  // 检查服务健康状态
  const healthSpinner = UIUtils.createSpinner('Checking services...');
  healthSpinner.start();

  const health = await AppServices.checkServicesHealth();
  healthSpinner.stop();

  if (!health.backend) {
    UIUtils.error('Backend services are not available');
    UIUtils.info('Please start the backend server first: sight start');
    return;
  }

  if (!health.ollama) {
    UIUtils.warning('Ollama service is not available');
    UIUtils.info('Some model features may not work. Please start Ollama: ollama serve');
  }

  while (true) {
    try {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📋 View device status', value: 'device-status' },
            { name: '🔧 Register device', value: 'device-register' },
            { name: '❌ Unregister device', value: 'device-unregister' },
            new inquirer.Separator(),
            { name: '📦 List local models', value: 'models-list' },
            { name: '📤 Report models', value: 'models-report' },
            { name: '📊 Model report status', value: 'models-status' },
            new inquirer.Separator(),
            { name: '🚀 Start backend server', value: 'start-server' },
            { name: '� Stop backend server', value: 'stop-server' },
            { name: '📊 Server status', value: 'server-status' },
            { name: '📋 View server logs', value: 'view-logs' },
            { name: '�🔄 Refresh service status', value: 'refresh' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      console.log('');

      switch (action) {
        case 'device-status':
          await DeviceCommands.status();
          break;
        case 'device-register':
          await DeviceCommands.register();
          break;
        case 'device-unregister':
          await DeviceCommands.unregister();
          break;
        case 'models-list':
          await ModelCommands.list();
          break;
        case 'models-report':
          await ModelCommands.report();
          break;
        case 'models-status':
          await ModelCommands.status();
          break;
        case 'start-server':
          UIUtils.info('Starting backend server in background...');
          const startResult = ProcessManager.startDaemonProcess();
          if (startResult.success) {
            UIUtils.success('Backend server started in background');
            UIUtils.info(`Process ID: ${startResult.pid}`);
          } else {
            UIUtils.error(`Failed to start server: ${startResult.error}`);
          }
          break;
        case 'stop-server':
          UIUtils.info('Stopping backend server...');
          const stopResult = ProcessManager.stopDaemonProcess();
          if (stopResult.success) {
            UIUtils.success('Backend server stopped successfully');
          } else {
            UIUtils.error(`Failed to stop server: ${stopResult.error}`);
          }
          break;
        case 'server-status':
          const status = ProcessManager.getServerStatus();
          if (status.running) {
            UIUtils.success('Backend server is running');
            console.log(`  Process ID: ${status.pid}`);
            console.log(`  Started: ${status.startTime}`);
          } else {
            UIUtils.warning('Backend server is not running');
          }
          break;
        case 'view-logs':
          const logInfo = ProcessManager.getLogFileInfo();
          if (!logInfo.exists) {
            UIUtils.warning('No log file found');
            UIUtils.info('Backend server may not have been started in daemon mode yet');
          } else {
            console.log(`📁 Log file: ${logInfo.path}`);
            console.log(`📊 Size: ${(logInfo.size! / 1024).toFixed(2)} KB`);
            console.log(`🕒 Last modified: ${logInfo.lastModified!.toLocaleString()}`);
            console.log('');

            const logResult = ProcessManager.readLogs(30); // 显示最后30行
            if (logResult.success && logResult.logs) {
              if (logResult.logs.length === 0) {
                UIUtils.info('Log file is empty');
              } else {
                UIUtils.info(`Showing last ${logResult.logs.length} lines:`);
                console.log('');
                console.log('─'.repeat(60));
                logResult.logs.forEach(line => {
                  console.log(line);
                });
                console.log('─'.repeat(60));
              }
            } else {
              UIUtils.error(`Failed to read logs: ${logResult.error}`);
            }
          }
          break;
        case 'refresh':
          UIUtils.clear();
          UIUtils.showTitle();
          const newHealth = await AppServices.checkServicesHealth();
          if (newHealth.backend) {
            UIUtils.success('Backend services are available');
          } else {
            UIUtils.error('Backend services are not available');
          }
          if (newHealth.ollama) {
            UIUtils.success('Ollama service is available');
          } else {
            UIUtils.warning('Ollama service is not available');
          }
          break;
        case 'exit':
          UIUtils.info('Goodbye!');
          await AppServices.closeApp();
          process.exit(0);
      }

      // 等待用户按键继续
      await inquirer.prompt([
        {
          type: 'input',
          name: 'continue',
          message: 'Press Enter to continue...'
        }
      ]);

      console.log('');
    } catch (error) {
      UIUtils.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      break;
    }
  }
}

/**
 * 程序配置
 */
program
  .name('sight')
  .description('Sight AI Command Line Interface')
  .version('1.0.0');

/**
 * 启动服务器命令
 */
program
  .command('start')
  .description('Start the Sight AI backend server')
  .option('-d, --daemon', 'Run server in background mode')
  .action(async (options) => {
    try {
      UIUtils.showSection('Starting Backend Server');

      if (options.daemon) {
        // 后台模式：使用 ProcessManager 创建独立进程
        UIUtils.info('Starting server in background mode...');

        const result = ProcessManager.startDaemonProcess();

        if (result.success) {
          UIUtils.success('Backend server started in background');
          UIUtils.info(`Process ID: ${result.pid}`);
          UIUtils.info('You can now use other commands while the server runs in background');

          // 给服务器一些时间启动
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          UIUtils.error(`Failed to start background server: ${result.error}`);
          process.exit(1);
        }
      } else {
        // 前台模式：等待 bootstrap 完成
        UIUtils.info('Starting server in foreground mode...');
        await bootstrap();
      }
    } catch (error) {
      UIUtils.error(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * 停止服务器命令
 */
program
  .command('stop')
  .description('Stop the Sight AI backend server')
  .action(async () => {
    try {
      UIUtils.showSection('Stopping Backend Server');

      const spinner = UIUtils.createSpinner('Stopping server...');
      spinner.start();

      const result = ProcessManager.stopDaemonProcess();
      spinner.stop();

      if (result.success) {
        UIUtils.success('Backend server stopped successfully');
      } else {
        UIUtils.error(`Failed to stop server: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      UIUtils.error(`Failed to stop server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * 服务器状态命令
 */
program
  .command('server-status')
  .description('Check backend server status')
  .action(async () => {
    try {
      UIUtils.showSection('Backend Server Status');

      const status = ProcessManager.getServerStatus();

      if (status.running) {
        UIUtils.success('Backend server is running');
        console.log('');
        console.log(`  Process ID: ${status.pid}`);
        console.log(`  Started: ${status.startTime}`);
        console.log(`  Executable: ${status.executable}`);
      } else {
        UIUtils.warning('Backend server is not running');
        UIUtils.info('Use "sight start --daemon" to start the server in background');
      }
    } catch (error) {
      UIUtils.error(`Failed to check server status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * 查看后台服务日志命令
 */
program
  .command('logs')
  .description('View backend server logs')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('-f, --follow', 'Follow log output (not implemented yet)')
  .option('-c, --clear', 'Clear log file')
  .action(async (options) => {
    try {
      if (options.clear) {
        UIUtils.showSection('Clearing Backend Server Logs');

        const result = ProcessManager.clearLogs();
        if (result.success) {
          UIUtils.success('Log file cleared successfully');
        } else {
          UIUtils.error(`Failed to clear logs: ${result.error}`);
          process.exit(1);
        }
        return;
      }

      UIUtils.showSection('Backend Server Logs');

      // 检查服务器状态
      const status = ProcessManager.getServerStatus();
      if (!status.running) {
        UIUtils.warning('Backend server is not running');
        UIUtils.info('Use "sight start --daemon" to start the server in background');
        console.log('');
      }

      // 获取日志文件信息
      const logInfo = ProcessManager.getLogFileInfo();
      if (!logInfo.exists) {
        UIUtils.warning('No log file found');
        UIUtils.info('Backend server may not have been started in daemon mode yet');
        return;
      }

      // 显示日志文件信息
      console.log(`📁 Log file: ${logInfo.path}`);
      console.log(`📊 Size: ${(logInfo.size! / 1024).toFixed(2)} KB`);
      console.log(`🕒 Last modified: ${logInfo.lastModified!.toLocaleString()}`);
      console.log('');

      // 读取日志
      const lines = parseInt(options.lines, 10) || 50;
      const result = ProcessManager.readLogs(lines);

      if (result.success && result.logs) {
        if (result.logs.length === 0) {
          UIUtils.info('Log file is empty');
        } else {
          UIUtils.info(`Showing last ${result.logs.length} lines:`);
          console.log('');
          console.log('─'.repeat(80));
          result.logs.forEach(line => {
            console.log(line);
          });
          console.log('─'.repeat(80));

          if (options.follow) {
            UIUtils.info('Follow mode is not implemented yet. Use "sight logs" to refresh.');
          }
        }
      } else {
        UIUtils.error(`Failed to read logs: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      UIUtils.error(`Failed to read logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * 交互式CLI命令
 */
program
  .command('cli')
  .description('Start interactive CLI mode')
  .action(async () => {
    try {
      await startInteractiveCli();
    } catch (error) {
      UIUtils.error(`CLI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * 设备注册命令
 */
program
  .command('register')
  .description('Register device with gateway')
  .option('-c, --code <code>', 'Registration code')
  .option('-g, --gateway <address>', 'Gateway address', 'https://gateway.saito.ai')
  .option('-r, --reward <address>', 'Reward address')
  .option('-k, --key <key>', 'Authentication key')
  .option('-b, --base-path <path>', 'API server base path for WebSocket connection')
  .action(async (options) => {
    try {
      await DeviceCommands.register({
        code: options.code,
        gatewayAddress: options.gateway,
        rewardAddress: options.reward,
        key: options.key,
        basePath: options.basePath
      });
    } catch (error) {
      UIUtils.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * 设备状态命令
 */
program
  .command('status')
  .description('Show current registration status')
  .action(async () => {
    try {
      await DeviceCommands.status();
    } catch (error) {
      UIUtils.error(`Status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * 取消注册命令
 */
program
  .command('unregister')
  .description('Clear registration information')
  .action(async () => {
    try {
      await DeviceCommands.unregister();
      UIUtils.showSection('Stopping Backend Server');

      const spinner = UIUtils.createSpinner('Stopping server...');
      spinner.start();

      const result = ProcessManager.stopDaemonProcess();
      spinner.stop();

      if (result.success) {
        UIUtils.success('Backend server stopped successfully');
      } else {
        UIUtils.error(`Failed to stop server: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      UIUtils.error(`Unregistration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * 模型管理命令组
 */
const modelsCommand = program
  .command('models')
  .description('Model management commands');

modelsCommand
  .command('list')
  .description('List available local models')
  .action(async () => {
    try {
      await ModelCommands.list();
    } catch (error) {
      UIUtils.error(`Models list error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

modelsCommand
  .command('report')
  .description('Interactively select and report models')
  .action(async () => {
    try {
      await ModelCommands.report();
    } catch (error) {
      UIUtils.error(`Models report error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

modelsCommand
  .command('report-all')
  .description('Report all local models')
  .action(async () => {
    try {
      await ModelCommands.reportAll();
    } catch (error) {
      UIUtils.error(`Models report-all error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

modelsCommand
  .command('status')
  .description('Show reported models status')
  .action(async () => {
    try {
      await ModelCommands.status();
    } catch (error) {
      UIUtils.error(`Models status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * 主程序入口
 */
async function main() {
  try {
    // 如果没有参数，显示帮助
    if (process.argv.length <= 2) {
      UIUtils.showTitle();
      program.help();
    }

    // 解析命令行参数
    await program.parseAsync(process.argv);
  } catch (error) {
    UIUtils.error(`Program error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// 启动程序
main().catch((error) => {
  UIUtils.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
