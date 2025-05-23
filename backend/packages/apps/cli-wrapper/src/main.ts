#!/usr/bin/env node

import { Command } from 'commander';
import { bootstrap } from '@saito/api-server/bootstrap';
import { DeviceCommands } from './commands/device';
import { ModelCommands } from './commands/models';
import { AppServices } from './services/app-services';
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
            { name: '🔄 Refresh service status', value: 'refresh' },
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
          // 在后台启动 bootstrap，不等待完成
          bootstrap().catch(error => {
            UIUtils.error(`Backend server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          });
          UIUtils.success('Backend server started in background');
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
        // 后台模式：不等待 bootstrap 完成
        UIUtils.info('Starting server in background mode...');
        bootstrap().catch(error => {
          UIUtils.error(`Backend server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
        UIUtils.success('Backend server started in background');

        // 给服务器一些时间启动
        await new Promise(resolve => setTimeout(resolve, 2000));
        UIUtils.info('You can now use other commands while the server runs in background');
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
  .action(async () => {
    try {
      await DeviceCommands.register();
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
