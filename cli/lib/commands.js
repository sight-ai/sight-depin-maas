/**
 * 命令模块 - 定义CLI命令
 */
const inquirer = require('inquirer');
const { CONFIG } = require('./config');
const { logInfo, logSuccess, logError } = require('./logger');
const { checkRequirements, checkOllamaService, getGpuInfo } = require('./system-check');
const { pullDeepseekModel, handleReportModelsCommand } = require('./model-manager');
const { registerDevice, checkMinerStatus } = require('./device-manager');
const {
  downloadComposeFile,
  createOverrideFile,
  startServices,
  deployOpenWebUI,
  stopMiner,
  showLogs,
  updateMiner,
  cleanMiner
} = require('./docker-manager');
const { MinerError, ErrorCodes, handleError } = require('./error-handler');

// 运行本地模式
const runLocalMode = async (gpuInfo) => {
  logInfo('Starting local mode setup...');

  // 下载docker-compose.yml文件
  if (!await downloadComposeFile()) {
    return false;
  }

  // 创建docker-compose.override.yml文件
  createOverrideFile('local', { gpuInfo });

  // 启动服务
  return await startServices({ mode: 'local' });
};

// 运行远程模式
const runRemoteMode = async (options) => {
  logInfo('Starting remote mode setup...');

  // 验证远程模式参数
  if (!options.gatewayUrl || !options.nodeCode || !options.gatewayApiKey ||
    !options.rewardAddress || !options.apiBasePath) {
    logError('Missing required parameters for remote mode');
    return false;
  }

  // 下载docker-compose.yml文件
  if (!await downloadComposeFile()) {
    return false;
  }

  // 创建docker-compose.override.yml文件
  createOverrideFile('remote', options);

  // 启动服务
  if (!await startServices(options)) {
    return false;
  }

  // 注册设备
  return await registerDevice(options);
};

// 交互式模式选择
const selectMode = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Please select run mode:',
      choices: [
        { name: 'Local mode (run locally without parameters)', value: 'local' },
        { name: 'Remote mode (requires gateway URL and other parameters)', value: 'remote' }
      ]
    }
  ]);

  let options = { mode: answers.mode };

  if (answers.mode === 'remote') {
    const remoteParams = await inquirer.prompt([
      {
        type: 'input',
        name: 'gatewayUrl',
        message: 'Gateway URL:',
        validate: input => input ? true : 'Gateway URL is required'
      },
      {
        type: 'input',
        name: 'nodeCode',
        message: 'Node code:',
        validate: input => input ? true : 'Node code is required'
      },
      {
        type: 'input',
        name: 'gatewayApiKey',
        message: 'Gateway API key:',
        validate: input => input ? true : 'Gateway API key is required'
      },
      {
        type: 'input',
        name: 'rewardAddress',
        message: 'Reward address:',
        validate: input => input ? true : 'Reward address is required'
      },
      {
        type: 'input',
        name: 'apiBasePath',
        message: 'API server base path:',
        validate: input => input ? true : 'API server base path is required'
      }
    ]);

    options = { ...options, ...remoteParams };
  }

  return options;
};

// 主运行函数
const run = async (options) => {
  // 检查系统要求
  if (!await checkRequirements()) {
    return false;
  }

  // 检查Ollama服务
  if (!await checkOllamaService()) {
    return false;
  }

  // 拉取deepscaler模型
  if (!await pullDeepseekModel()) {
    return false;
  }

  // 获取GPU信息
  const gpuInfo = await getGpuInfo();
  options.gpuInfo = gpuInfo;

  // 根据选择的模式运行
  if (options.mode === 'local') {
    return await runLocalMode(gpuInfo);
  } else if (options.mode === 'remote') {
    return await runRemoteMode(options);
  } else {
    logError('Invalid mode selected');
    return false;
  }
};

// 设置命令
const setupCommands = (program) => {
  // 运行命令
  program
    .command('run')
    .description('Run the miner')
    .option('-m, --mode <mode>', 'Run mode (local or remote)')
    .option('-g, --gateway-url <url>', 'Gateway API URL (for remote mode)')
    .option('-n, --node-code <code>', 'Node code (for remote mode)')
    .option('-k, --gateway-api-key <key>', 'Gateway API key (for remote mode)')
    .option('-r, --reward-address <address>', 'Reward address (for remote mode)')
    .option('-a, --api-base-path <path>', 'API server base path (for remote mode)')
    .option('-f, --force', 'Force remove existing containers if they exist')
    .option('-p, --port <port>', 'Port for the miner service (default: 3000, can also be set with SIGHT_MINER_PORT env var)')
    .action(async (cmdOptions) => {
      try {
        let options = { ...cmdOptions };

        // 如果通过命令行指定了端口，则覆盖环境变量
        if (options.port) {
          process.env.SIGHT_MINER_PORT = options.port;
          // 重新加载配置以应用新端口
          const { CONFIG } = require('./config');
          options.port = CONFIG.ports.miner;
        }

        if (!options.mode) {
          options = { ...await selectMode(), ...options };
        } else if (options.mode === 'remote') {
          // 验证远程模式所需的参数
          if (!options.gatewayUrl || !options.nodeCode || !options.gatewayApiKey ||
            !options.rewardAddress || !options.apiBasePath) {
            const missingParams = [];
            if (!options.gatewayUrl) missingParams.push('--gateway-url');
            if (!options.nodeCode) missingParams.push('--node-code');
            if (!options.gatewayApiKey) missingParams.push('--gateway-api-key');
            if (!options.rewardAddress) missingParams.push('--reward-address');
            if (!options.apiBasePath) missingParams.push('--api-base-path');

            throw new MinerError(
              `Missing required parameters for remote mode: ${missingParams.join(', ')}`,
              ErrorCodes.DEVICE_REGISTRATION_FAILED,
              { missingParams }
            );
          }
        }

        await run(options);
      } catch (error) {
        handleError(error);
      }
    });

  // 报告模型命令
  program
    .command('report-models')
    .description('Select and report models to the gateway')
    .option('-a, --all', 'Report all available models without selection prompt')
    .action(async (cmdOptions) => {
      try {
        await handleReportModelsCommand({
          skipSelection: cmdOptions.all
        });
      } catch (error) {
        handleError(error);
      }
    });

  // 状态命令
  program
    .command('status')
    .description('Check miner status')
    .action(() => {
      try {
        checkMinerStatus();
      } catch (error) {
        handleError(error);
      }
    });

  // 停止命令
  program
    .command('stop')
    .description('Stop the miner')
    .action(async () => {
      try {
        await stopMiner();
      } catch (error) {
        handleError(error);
      }
    });

  // 日志命令
  program
    .command('logs')
    .description('View miner logs')
    .option('-f, --follow', 'Follow log output')
    .option('-n, --lines <number>', 'Number of lines to show', '100')
    .action(async (options) => {
      try {
        const lines = parseInt(options.lines, 10);
        if (isNaN(lines) || lines < 1) {
          throw new MinerError(
            'Invalid number of lines',
            ErrorCodes.SERVICE_START_FAILED,
            { lines: options.lines }
          );
        }

        await showLogs(lines, options.follow);
      } catch (error) {
        handleError(error);
      }
    });

  // 更新命令
  program
    .command('update')
    .description('Update the miner to latest version')
    .option('-f, --force', 'Force update without confirmation and remove existing containers if they conflict')
    .action(async (options) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to update the miner? This will stop all running services.',
              default: false
            }
          ]);

          if (!confirm) {
            logInfo('Update cancelled by user');
            return;
          }
        }

        await updateMiner(options.force);
      } catch (error) {
        handleError(error);
      }
    });

  // 清理命令
  program
    .command('clean')
    .description('Clean up miner resources')
    .option('-a, --all', 'Clean all resources including volumes')
    .action(async (options) => {
      try {
        if (options.all) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to clean all resources? This will remove all data including volumes.',
              default: false
            }
          ]);

          if (!confirm) {
            logInfo('Clean operation cancelled by user');
            return;
          }
        }

        await cleanMiner(options.all);
      } catch (error) {
        handleError(error);
      }
    });

  // 部署OpenWebUI命令
  program
    .command('deploy-webui')
    .description('Deploy Open WebUI for Ollama')
    .option('-p, --port <port>', 'Port for Open WebUI (default: 8080, can also be set with SIGHT_WEBUI_PORT env var)')
    .option('-f, --force', 'Force remove existing container if it exists')
    .option('-m, --mode <mode>', 'Mode (local or remote)', 'local')
    .option('-g, --gateway-url <url>', 'Gateway URL for remote mode')
    .option('-n, --no-browser', 'Do not open browser after deployment')
    .action(async (options) => {
      try {
        // 如果通过命令行指定了端口，则覆盖环境变量
        if (options.port) {
          process.env.SIGHT_WEBUI_PORT = options.port;
          // 重新加载配置以应用新端口
          const { CONFIG } = require('./config');
        }

        // 检查系统要求
        if (!await checkRequirements()) {
          return false;
        }

        // 检查Ollama服务
        if (!await checkOllamaService()) {
          return false;
        }

        // 部署OpenWebUI
        const deployOptions = {
          port: options.port || CONFIG.ports.webui,
          force: options.force || false,
          mode: options.mode,
          gatewayUrl: options.gatewayUrl || 'http://host.docker.internal:8716',
          openBrowserAfterDeploy: options.browser
        };

        await deployOpenWebUI(deployOptions);
      } catch (error) {
        handleError(error);
      }
    });
};

module.exports = {
  setupCommands
};
