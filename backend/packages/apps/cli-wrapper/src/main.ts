#!/usr/bin/env node

import { Command } from 'commander';
import { bootstrap } from '@saito/api-server/bootstrap';
import { DeviceCommands } from './commands/device';
import { ModelCommands } from './commands/models';
import { VllmCommands } from './commands/vllm';
import { OllamaCommands } from './commands/ollama';
import { createTransportCommand } from './commands/transport';
import { AppServices } from './services/app-services';
import { ProcessManagerService } from './services/process-manager';
import { UIUtils } from './utils/ui';

import inquirer from 'inquirer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
function loadEnvironmentVariables() {
  // Try to find .env file in current directory or parent directories
  let currentDir = process.cwd();
  let envPath: string | null = null;

  // Look for .env file up to 5 levels up
  for (let i = 0; i < 5; i++) {
    const potentialEnvPath = path.join(currentDir, '.env');
    if (fs.existsSync(potentialEnvPath)) {
      envPath = potentialEnvPath;
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  if (envPath) {
    dotenv.config({ path: envPath });
    console.log(`Loaded environment variables from: ${envPath}`);
  }
}

// Load environment variables at startup
loadEnvironmentVariables();



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

  if (!health.framework) {
    UIUtils.warning(`${health.frameworkType || 'Model inference'} service is not available`);
    UIUtils.info('Some model features may not work. Check framework status: sight framework status');
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
            { name: '🔄 Framework status', value: 'framework-status' },
            { name: '🔀 Switch framework', value: 'framework-switch' },
            { name: '🏥 Framework health', value: 'framework-health' },
            new inquirer.Separator(),
            { name: '🌐 Transport status', value: 'transport-status' },
            { name: '🔄 Switch transport', value: 'transport-switch' },
            new inquirer.Separator(),
            { name: '⚙️  vLLM configuration', value: 'vllm-config' },
            { name: '🎛️  Set GPU memory', value: 'vllm-gpu-memory' },
            { name: '🔧 Configure vLLM', value: 'vllm-configure' },
            { name: '🚀 Start vLLM service', value: 'vllm-start' },
            { name: '🛑 Stop vLLM service', value: 'vllm-stop' },
            { name: '🔄 Restart vLLM service', value: 'vllm-restart' },
            { name: '📊 vLLM process status', value: 'vllm-status' },
            new inquirer.Separator(),
            { name: '🦙 Start Ollama service', value: 'ollama-start' },
            { name: '🛑 Stop Ollama service', value: 'ollama-stop' },
            { name: '🔄 Restart Ollama service', value: 'ollama-restart' },
            { name: '📊 Ollama process status', value: 'ollama-status' },
            { name: '🔧 Configure Ollama', value: 'ollama-configure' },
            { name: '📋 List Ollama models', value: 'ollama-models' },
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
        case 'framework-status':
          UIUtils.showSection('Framework Status');
          const frameworkStatus = await AppServices.getFrameworkStatus();
          if (frameworkStatus.success) {
            const data = frameworkStatus.data;
            UIUtils.success(`Current Framework: ${data.current}`);
            console.log('');
            console.log('📊 Available Frameworks:');
            data.available.forEach((fw: string) => {
              console.log(`  ✅ ${fw}`);
            });
            if (data.available.length === 0) {
              UIUtils.warning('No frameworks are currently available');
            }
          } else {
            UIUtils.error(`Failed to get framework status: ${frameworkStatus.error}`);
          }
          break;
        case 'framework-switch':
          UIUtils.showSection('Switch Framework');
          const { framework } = await inquirer.prompt([
            {
              type: 'list',
              name: 'framework',
              message: 'Select framework to switch to:',
              choices: [
                { name: 'Ollama', value: 'ollama' },
                { name: 'vLLM', value: 'vllm' }
              ]
            }
          ]);

          const { force } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'force',
              message: 'Force switch even if framework is not available?',
              default: false
            }
          ]);

          UIUtils.info(`Switching to framework: ${framework}...`);
          const switchResult = await AppServices.switchFramework(framework, force);
          if (switchResult.success) {
            UIUtils.success(switchResult.message);
          } else {
            UIUtils.error(`Failed to switch framework: ${switchResult.error}`);
          }
          break;
        case 'framework-health':
          UIUtils.showSection('Framework Health');
          const healthStatus = await AppServices.getUnifiedHealth();
          if (healthStatus.success) {
            const data = healthStatus.data;
            console.log(`Current Framework: ${data.currentFramework || 'None'}`);
            console.log('');
            console.log('Available Frameworks:');
            data.availableFrameworks.forEach((fw: string) => {
              console.log(`  ✅ ${fw}`);
            });
            console.log('');
            console.log('Service Status:');
            Object.entries(data.serviceStatus).forEach(([framework, status]) => {
              console.log(`  ${framework}: ${status ? '✅' : '❌'}`);
            });
          } else {
            UIUtils.error(`Failed to get health status: ${healthStatus.error}`);
          }
          break;
        case 'transport-status':
          UIUtils.showSection('Transport Status');
          try {
            const { TransportConfigService } = await import('@saito/tunnel');
            const { EventEmitter2 } = await import('@nestjs/event-emitter');
            const eventEmitter = new EventEmitter2();
            const configService = new TransportConfigService(eventEmitter);

            const config = configService.getCurrentConfig();
            console.log(`Current Transport Type: ${config.type}`);
            console.log(`Updated At: ${config.updatedAt}`);
            console.log(`Requires Restart: ${config.requiresRestart ? 'Yes' : 'No'}`);
          } catch (error) {
            UIUtils.error(`Failed to get transport status: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          break;
        case 'transport-switch':
          UIUtils.showSection('Switch Transport Type');
          try {
            const { type } = await inquirer.prompt([
              {
                type: 'list',
                name: 'type',
                message: 'Select transport type:',
                choices: [
                  { name: 'Socket (WebSocket)', value: 'socket' },
                  { name: 'Libp2p (Peer-to-peer)', value: 'libp2p' }
                ]
              }
            ]);

            const { restart } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'restart',
                message: 'Restart application after switching?',
                default: true
              }
            ]);

            const { TransportConfigService, TransportSwitcherService } = await import('@saito/tunnel');
            const { EventEmitter2 } = await import('@nestjs/event-emitter');
            const eventEmitter = new EventEmitter2();
            const configService = new TransportConfigService(eventEmitter);
            const switcherService = new TransportSwitcherService(configService, eventEmitter);

            UIUtils.info(`Switching to ${type} transport...`);
            await switcherService.switchTransport(type, restart, 3000);

            if (restart) {
              UIUtils.success(`Transport switched to ${type}. Application will restart in 3 seconds.`);
            } else {
              UIUtils.success(`Transport switched to ${type}. Please restart the application manually.`);
            }
          } catch (error) {
            UIUtils.error(`Failed to switch transport: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          break;
        case 'vllm-config':
          await VllmCommands.getConfig();
          break;
        case 'vllm-gpu-memory':
          await VllmCommands.setGpuMemory();
          break;
        case 'vllm-configure':
          await VllmCommands.configureInteractive();
          break;
        case 'vllm-start':
          await VllmCommands.startService();
          break;
        case 'vllm-stop':
          await VllmCommands.stopService();
          break;
        case 'vllm-restart':
          await VllmCommands.restartService();
          break;
        case 'vllm-status':
          await VllmCommands.getProcessStatus();
          break;
        case 'ollama-start':
          await OllamaCommands.startService();
          break;
        case 'ollama-stop':
          await OllamaCommands.stopService();
          break;
        case 'ollama-restart':
          await OllamaCommands.restartService();
          break;
        case 'ollama-status':
          await OllamaCommands.getProcessStatus();
          break;
        case 'ollama-configure':
          await OllamaCommands.showConfiguration();
          break;
        case 'ollama-models':
          await OllamaCommands.listModels();
          break;
        case 'start-server':
          UIUtils.info('Starting backend server in background...');
          const startResult = ProcessManagerService.startDaemonProcess();
          if (startResult.success) {
            UIUtils.success('Backend server started in background');
            UIUtils.info(`Process ID: ${startResult.pid}`);
          } else {
            UIUtils.error(`Failed to start server: ${startResult.error}`);
          }
          break;
        case 'stop-server':
          UIUtils.info('Stopping backend server...');
          const stopResult = ProcessManagerService.stopDaemonProcess();
          if (stopResult.success) {
            UIUtils.success('Backend server stopped successfully');
          } else {
            UIUtils.error(`Failed to stop server: ${stopResult.error}`);
          }
          break;
        case 'server-status':
          const serverStatus = ProcessManagerService.getServerStatus();

          UIUtils.showSection('Service Status');

          // 后台服务器状态
          console.log('🖥️  Backend Server:');
          if (serverStatus.running) {
            console.log(`  Status: ✅ Running`);
            console.log(`  Process ID: ${serverStatus.pid}`);
            console.log(`  Started: ${serverStatus.startTime}`);
          } else {
            console.log(`  Status: ❌ Not running`);
          }
          break;
        case 'view-logs':
          const logInfo = ProcessManagerService.getLogFileInfo();
          if (!logInfo.exists) {
            UIUtils.warning('No log file found');
            UIUtils.info('Backend server may not have been started in daemon mode yet');
          } else {
            console.log(`📁 Log file: ${logInfo.path}`);
            console.log(`📊 Size: ${(logInfo.size! / 1024).toFixed(2)} KB`);
            console.log(`🕒 Last modified: ${logInfo.lastModified!.toLocaleString()}`);
            console.log('');

            const logResult = ProcessManagerService.readLogs(30); // 显示最后30行
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

          // 检查所有服务状态
          const newHealth = await AppServices.checkServicesHealth();
          const backendStatus = ProcessManagerService.getServerStatus();

          console.log('📊 Service Status:');
          console.log('');

          // 后台服务状态
          if (newHealth.backend) {
            UIUtils.success('✅ Backend services are available');
          } else {
            UIUtils.error('❌ Backend services are not available');
          }

          // 框架服务状态
          if (newHealth.framework) {
            UIUtils.success(`✅ ${newHealth.frameworkType || 'Model inference'} service is available`);
          } else {
            UIUtils.warning(`⚠️  ${newHealth.frameworkType || 'Model inference'} service is not available`);
          }

          console.log('');
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
  .version('1.0.0')
  .option('--transport <type>', 'Set transport type (socket|libp2p)', 'libp2p');

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

      // 获取全局transport选项
      const globalTransport = program.opts().transport;

      if (options.daemon) {
        // 后台模式：使用 ProcessManager 创建独立进程
        UIUtils.info('Starting server in background mode...');

        // 检查是否已有进程在运行
        const serverStatus = ProcessManagerService.getServerStatus();

        if (serverStatus.running) {
          UIUtils.warning(`Backend server is already running (PID: ${serverStatus.pid})`);
          UIUtils.info(`Use 'sight stop' to stop the server first, or 'sight transport switch <type>' to change transport type`);
        } else {
          // 没有运行的服务，正常启动
          const args = globalTransport ? [`--transport`, globalTransport] : [];
          const result = ProcessManagerService.startDaemonProcess(args);

          if (result.success) {
            UIUtils.success('Backend server started in background');
            UIUtils.info(`Process ID: ${result.pid}`);

            // 获取实际使用的传输类型
            // Display the actual transport type being used for startup
            UIUtils.info(`Transport type: ${globalTransport}`);
            UIUtils.info(`You can now use other commands while the server runs in background`);
          } else {
            UIUtils.error(`Failed to start background server: ${result.error}`);
            process.exit(1);
          }
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
  .description('Stop backend server')
  .action(async () => {
    try {
      UIUtils.showSection('Stopping Backend Server');

      console.log('🔄 Stopping backend server...');
      const result = ProcessManagerService.stopDaemonProcess();

      if (result.success) {
        UIUtils.success('Backend server stopped successfully');
      } else {
        UIUtils.error(`Failed to stop backend server: ${result.error}`);
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

      const status = ProcessManagerService.getServerStatus();

      // 后台服务器状态
      console.log('🖥️  Backend Server:');
      if (status.running) {
        console.log(`  Status: ✅ Running`);
        console.log(`  Process ID: ${status.pid}`);
        console.log(`  Started: ${status.startTime}`);
        console.log(`  Executable: ${status.executable}`);
      } else {
        console.log(`  Status: ❌ Not running`);
        console.log(`  Use "sight start --daemon" to start the server in background`);
      }
    } catch (error) {
      UIUtils.error(`Failed to check service status: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        const result = ProcessManagerService.clearLogs();
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
      const status = ProcessManagerService.getServerStatus();
      if (!status.running) {
        UIUtils.warning('Backend server is not running');
        UIUtils.info('Use "sight start --daemon" to start the server in background');
        console.log('');
      }

      // 获取日志文件信息
      const logInfo = ProcessManagerService.getLogFileInfo();
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
      const result = ProcessManagerService.readLogs(lines);

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
  .option('-b, --base-path <path>', 'API server base path for WebSocket connection')
  .action(async (options) => {
    try {
      await DeviceCommands.register({
        code: options.code,
        gatewayAddress: options.gateway,
        rewardAddress: options.reward,
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

      const spinner = UIUtils.createSpinner('Stopping backend server...');
      spinner.start();

      const result = ProcessManagerService.stopDaemonProcess();
      spinner.stop();

      // 显示结果
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
 * Ollama管理命令组
 */
const ollamaCommand = program
  .command('ollama')
  .description('Ollama configuration and management commands');

ollamaCommand
  .command('start')
  .description('Start Ollama service')
  .option('-h, --host <host>', 'Host to bind to')
  .option('-p, --port <port>', 'Port to run on')
  .option('-o, --origins <origins>', 'Allowed origins (comma-separated)')
  .option('-m, --models <models>', 'Models to preload (comma-separated)')
  .option('-k, --keep-alive <duration>', 'Keep alive duration')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Enable verbose mode')
  .option('-l, --log-level <level>', 'Log level')
  .action(async (options) => {
    try {
      const config: any = {};

      if (options.host) config.host = options.host;
      if (options.port) {
        const port = parseInt(options.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          UIUtils.error('Port must be between 1 and 65535');
          process.exit(1);
        }
        config.port = port;
      }
      if (options.origins) config.origins = options.origins.split(',').map((s: string) => s.trim());
      if (options.models) config.models = options.models.split(',').map((s: string) => s.trim());
      if (options.keepAlive) config.keepAlive = options.keepAlive;
      if (options.debug) config.debug = true;
      if (options.verbose) config.verbose = true;
      if (options.logLevel) config.logLevel = options.logLevel;

      await OllamaCommands.startService();
    } catch (error) {
      UIUtils.error(`Ollama start error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

ollamaCommand
  .command('stop')
  .description('Stop Ollama service')
  .action(async () => {
    try {
      await OllamaCommands.stopService();
    } catch (error) {
      UIUtils.error(`Ollama stop error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

ollamaCommand
  .command('restart')
  .description('Restart Ollama service with new configuration')
  .option('-h, --host <host>', 'Host to bind to')
  .option('-p, --port <port>', 'Port to run on')
  .option('-o, --origins <origins>', 'Allowed origins (comma-separated)')
  .option('-m, --models <models>', 'Models to preload (comma-separated)')
  .option('-k, --keep-alive <duration>', 'Keep alive duration')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Enable verbose mode')
  .option('-l, --log-level <level>', 'Log level')
  .action(async (options) => {
    try {
      const config: any = {};

      if (options.host) config.host = options.host;
      if (options.port) {
        const port = parseInt(options.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          UIUtils.error('Port must be between 1 and 65535');
          process.exit(1);
        }
        config.port = port;
      }
      if (options.origins) config.origins = options.origins.split(',').map((s: string) => s.trim());
      if (options.models) config.models = options.models.split(',').map((s: string) => s.trim());
      if (options.keepAlive) config.keepAlive = options.keepAlive;
      if (options.debug) config.debug = true;
      if (options.verbose) config.verbose = true;
      if (options.logLevel) config.logLevel = options.logLevel;

      await OllamaCommands.restartService();
    } catch (error) {
      UIUtils.error(`Ollama restart error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

ollamaCommand
  .command('status')
  .description('Show Ollama process status')
  .action(async () => {
    try {
      await OllamaCommands.getProcessStatus();
    } catch (error) {
      UIUtils.error(`Ollama status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

ollamaCommand
  .command('configure')
  .description('Interactive Ollama configuration')
  .action(async () => {
    try {
      await OllamaCommands.showConfiguration();
    } catch (error) {
      UIUtils.error(`Ollama configure error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

ollamaCommand
  .command('models')
  .description('List available Ollama models')
  .action(async () => {
    try {
      await OllamaCommands.listModels();
    } catch (error) {
      UIUtils.error(`Ollama models error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

ollamaCommand
  .command('pull')
  .description('Pull an Ollama model')
  .argument('[model]', 'Model name to pull')
  .action(async (model) => {
    try {
      await OllamaCommands.pullModel(model);
    } catch (error) {
      UIUtils.error(`Ollama pull error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * vLLM管理命令组
 */
const vllmCommand = program
  .command('vllm')
  .description('vLLM configuration and management commands');

vllmCommand
  .command('config')
  .description('Show current vLLM configuration')
  .action(async () => {
    try {
      await VllmCommands.getConfig();
    } catch (error) {
      UIUtils.error(`vLLM config error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('gpu-memory')
  .description('Set GPU memory utilization')
  .option('-m, --memory <utilization>', 'GPU memory utilization (0.1-1.0)')
  .action(async (options) => {
    try {
      const memoryUtilization = options.memory ? parseFloat(options.memory) : undefined;
      if (memoryUtilization !== undefined && (isNaN(memoryUtilization) || memoryUtilization < 0.1 || memoryUtilization > 1.0)) {
        UIUtils.error('GPU memory utilization must be between 0.1 and 1.0');
        process.exit(1);
      }
      await VllmCommands.setGpuMemory(memoryUtilization);
    } catch (error) {
      UIUtils.error(`vLLM GPU memory error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('configure')
  .description('Interactive vLLM configuration')
  .action(async () => {
    try {
      await VllmCommands.configureInteractive();
    } catch (error) {
      UIUtils.error(`vLLM configure error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('reset')
  .description('Reset vLLM configuration to defaults')
  .action(async () => {
    try {
      await VllmCommands.resetConfig();
    } catch (error) {
      UIUtils.error(`vLLM reset error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('start')
  .description('Start vLLM service with current configuration')
  .option('-m, --model <model>', 'Model to load')
  .option('-g, --gpu-memory <utilization>', 'GPU memory utilization (0.1-1.0)')
  .option('-t, --tensor-parallel <size>', 'Tensor parallel size')
  .option('-s, --max-seqs <number>', 'Maximum number of sequences')
  .option('-p, --port <port>', 'Port to run on')
  .action(async (options) => {
    try {
      const config: any = {};

      if (options.model) config.model = options.model;
      if (options.gpuMemory) {
        const mem = parseFloat(options.gpuMemory);
        if (isNaN(mem) || mem < 0.1 || mem > 1.0) {
          UIUtils.error('GPU memory utilization must be between 0.1 and 1.0');
          process.exit(1);
        }
        config.gpuMemoryUtilization = mem;
      }
      if (options.tensorParallel) {
        const tp = parseInt(options.tensorParallel);
        if (isNaN(tp) || tp < 1) {
          UIUtils.error('Tensor parallel size must be a positive integer');
          process.exit(1);
        }
        config.tensorParallelSize = tp;
      }
      if (options.maxSeqs) {
        const ms = parseInt(options.maxSeqs);
        if (isNaN(ms) || ms < 1) {
          UIUtils.error('Max sequences must be a positive integer');
          process.exit(1);
        }
        config.maxNumSeqs = ms;
      }
      if (options.port) {
        const port = parseInt(options.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          UIUtils.error('Port must be between 1 and 65535');
          process.exit(1);
        }
        config.port = port;
      }

      await VllmCommands.startService(Object.keys(config).length > 0 ? config : undefined);
    } catch (error) {
      UIUtils.error(`vLLM start error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('stop')
  .description('Stop vLLM service')
  .action(async () => {
    try {
      await VllmCommands.stopService();
    } catch (error) {
      UIUtils.error(`vLLM stop error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('restart')
  .description('Restart vLLM service with new configuration')
  .option('-m, --model <model>', 'Model to load')
  .option('-g, --gpu-memory <utilization>', 'GPU memory utilization (0.1-1.0)')
  .option('-t, --tensor-parallel <size>', 'Tensor parallel size')
  .option('-s, --max-seqs <number>', 'Maximum number of sequences')
  .option('-p, --port <port>', 'Port to run on')
  .action(async (options) => {
    try {
      const config: any = {};

      if (options.model) config.model = options.model;
      if (options.gpuMemory) {
        const mem = parseFloat(options.gpuMemory);
        if (isNaN(mem) || mem < 0.1 || mem > 1.0) {
          UIUtils.error('GPU memory utilization must be between 0.1 and 1.0');
          process.exit(1);
        }
        config.gpuMemoryUtilization = mem;
      }
      if (options.tensorParallel) {
        const tp = parseInt(options.tensorParallel);
        if (isNaN(tp) || tp < 1) {
          UIUtils.error('Tensor parallel size must be a positive integer');
          process.exit(1);
        }
        config.tensorParallelSize = tp;
      }
      if (options.maxSeqs) {
        const ms = parseInt(options.maxSeqs);
        if (isNaN(ms) || ms < 1) {
          UIUtils.error('Max sequences must be a positive integer');
          process.exit(1);
        }
        config.maxNumSeqs = ms;
      }
      if (options.port) {
        const port = parseInt(options.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          UIUtils.error('Port must be between 1 and 65535');
          process.exit(1);
        }
        config.port = port;
      }

      await VllmCommands.restartService(Object.keys(config).length > 0 ? config : undefined);
    } catch (error) {
      UIUtils.error(`vLLM restart error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

vllmCommand
  .command('status')
  .description('Show vLLM process status')
  .action(async () => {
    try {
      await VllmCommands.getProcessStatus();
    } catch (error) {
      UIUtils.error(`vLLM status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });



/**
 * 框架管理命令组
 */
const frameworkCommand = program
  .command('framework')
  .description('Model inference framework management commands');

frameworkCommand
  .command('status')
  .description('Show current framework status and availability')
  .action(async () => {
    try {
      UIUtils.showSection('Framework Status');

      const spinner = UIUtils.createSpinner('Checking framework status...');
      spinner.start();

      const response = await AppServices.getFrameworkStatus();
      spinner.stop();

      if (response.success) {
        const data = response.data;

        UIUtils.success(`Current Framework: ${data.current}`);
        console.log('');

        console.log('📊 Available Frameworks:');
        data.available.forEach((fw: string) => {
          console.log(`  ✅ ${fw}`);
        });

        if (data.available.length === 0) {
          UIUtils.warning('No frameworks are currently available');
          console.log('');
          UIUtils.showBox(
            'Framework Setup Required',
            '🚀 Please start one of the following inference frameworks:\n\n' +
            '• Ollama: Run "ollama serve" in terminal\n' +
            '• vLLM: Start your vLLM server\n\n' +
            'Then use: sight framework switch <framework>',
            'info'
          );
        }

        console.log('');
        console.log('🔧 Primary Framework Status:');
        if (data.primary) {
          console.log(`  Framework: ${data.primary.framework}`);
          console.log(`  Available: ${data.primary.isAvailable ? '✅' : '❌'}`);
          console.log(`  URL: ${data.primary.url}`);
          if (data.primary.version) {
            console.log(`  Version: ${data.primary.version}`);
          }
          if (data.primary.error) {
            console.log(`  Error: ${data.primary.error}`);
          }
        } else {
          console.log('  ❌ Primary framework information not available');
        }

        if (data.secondary) {
          console.log('');
          console.log('🔧 Secondary Framework Status:');
          console.log(`  Framework: ${data.secondary.framework}`);
          console.log(`  Available: ${data.secondary.isAvailable ? '✅' : '❌'}`);
          console.log(`  URL: ${data.secondary.url}`);
          if (data.secondary.version) {
            console.log(`  Version: ${data.secondary.version}`);
          }
          if (data.secondary.error) {
            console.log(`  Error: ${data.secondary.error}`);
          }
        }
      } else {
        // 检查是否是框架不可用的错误
        if (response.error && response.error.includes('NO_FRAMEWORKS_AVAILABLE')) {
          UIUtils.error('No inference frameworks are currently available!');
          console.log('');
          UIUtils.showBox(
            'Framework Setup Required',
            '🚀 Please start one of the following inference frameworks:\n\n' +
            '• Ollama: Run "ollama serve" in terminal\n' +
            '• vLLM: Start your vLLM server\n\n' +
            'After starting a framework, use:\n' +
            '• sight framework switch ollama\n' +
            '• sight framework switch vllm',
            'info'
          );

          // 提供交互式选择
          const { shouldChoose } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldChoose',
              message: 'Would you like to choose a framework to use (even if not currently available)?',
              default: true
            }
          ]);

          if (shouldChoose) {
            const { framework } = await inquirer.prompt([
              {
                type: 'list',
                name: 'framework',
                message: 'Select framework to configure:',
                choices: [
                  { name: 'Ollama (Recommended)', value: 'ollama' },
                  { name: 'vLLM', value: 'vllm' }
                ]
              }
            ]);

            UIUtils.info(`Setting framework to: ${framework}`);
            const switchResult = await AppServices.switchFramework(framework, true);
            if (switchResult.success) {
              UIUtils.success(switchResult.message);
              UIUtils.info('Framework configured! Start your inference service and try again.');
            } else {
              UIUtils.error(`Failed to configure framework: ${switchResult.error}`);
            }
          }
        } else {
          UIUtils.error(`Failed to get framework status: ${response.error}`);
        }
      }
    } catch (error) {
      UIUtils.error(`Framework status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

frameworkCommand
  .command('switch <framework>')
  .description('Switch to a different framework (ollama, vllm)')
  .option('-f, --force', 'Force switch even if framework is not available')
  .action(async (framework, options) => {
    try {
      UIUtils.showSection(`Switching to Framework: ${framework}`);

      const spinner = UIUtils.createSpinner('Switching framework...');
      spinner.start();

      const response = await AppServices.switchFramework(framework, options.force);
      spinner.stop();

      if (response.success) {
        UIUtils.success(response.message);
      } else {
        UIUtils.error(`Failed to switch framework: ${response.error}`);
        process.exit(1);
      }
    } catch (error) {
      UIUtils.error(`Framework switch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      await AppServices.closeApp();
    }
  });

/**
 * 传输层配置命令组
 */
program.addCommand(createTransportCommand());

/**
 * 主程序入口
 */
async function main() {
  try {
    // 如果没有参数，显示帮助
    if (process.argv.length <= 2) {
      UIUtils.showTitle();
      program.help();
      return;
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
