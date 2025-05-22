/**
 * 命令模块 - 定义CLI命令
 */
const inquirer = require('inquirer');
const { logInfo, logSuccess, logError } = require('./logger');
const { checkOllamaService, getGpuInfo } = require('./system-check');
const { pullDeepseekModel, handleReportModelsCommand } = require('./model-manager');
const { registerDevice, reRegisterDevice, checkMinerStatus, checkBackendService } = require('./device-manager');
const { hasRegistrationParams } = require('./storage');
const { openBrowser } = require('./browser-utils');
const { MinerError, ErrorCodes, handleError } = require('./error-handler');

// 运行本地模式
const runLocalMode = async () => {
  logInfo('Starting local mode setup...');

  // 检查后端服务是否运行
  if (!await checkBackendService()) {
    logError('Backend service is not available. Cannot proceed with local mode setup.');
    return false;
  }

  // 打开Web界面
  logInfo('Opening web interface...');
  openBrowser(`http://localhost:8716`);

  logSuccess('Local mode setup completed');

  // 打印成功消息
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Setup Complete! 🎉                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Service is running on:                                    ║');
  console.log('║                                                            ║');
  console.log('║  📊 Sight AI Miner API:                                   ║');
  console.log('║     http://localhost:8716                                  ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  return true;
};

// 运行远程模式
const runRemoteMode = async (options) => {
  // 检查后端服务是否运行
  if (!await checkBackendService()) {
    logError('Backend service is not available. Cannot proceed with remote mode setup.');
    return false;
  }

  logInfo('Starting remote mode setup...');

  // 验证远程模式参数
  if (!options.gatewayUrl || !options.nodeCode || !options.gatewayApiKey ||
    !options.rewardAddress || !options.apiBasePath) {
    logError('Missing required parameters for remote mode');
    return false;
  }

  // 注册设备
  const registrationSuccess = await registerDevice(options);

  if (registrationSuccess) {
    // 打开Web界面
    logInfo('Opening web interface...');
    openBrowser(`http://localhost:8716`);

    logSuccess('Remote mode setup completed');

    // 打印成功消息
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   Setup Complete! 🎉                        ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Service is running on:                                    ║');
    console.log('║                                                            ║');
    console.log('║  📊 Sight AI Miner API:                                   ║');
    console.log('║     http://localhost:8716                                  ║');
    console.log('║                                                            ║');
    console.log('║  Device registered to gateway successfully!                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  }

  return registrationSuccess;
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
    return await runLocalMode();
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
    .action(async (cmdOptions) => {
      try {
        let options = { ...cmdOptions };

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

  // 注册命令
  program
    .command('register')
    .description('Register device with gateway without starting services')
    .option('-g, --gateway-url <url>', 'Gateway API URL')
    .option('-n, --node-code <code>', 'Node code')
    .option('-k, --gateway-api-key <key>', 'Gateway API key')
    .option('-r, --reward-address <address>', 'Reward address')
    .option('-a, --api-base-path <path>', 'API server base path')
    .option('-i, --interactive', 'Use interactive mode to input parameters')
    .action(async (cmdOptions) => {
      try {
        let options = { ...cmdOptions, mode: 'remote' };

        // 如果使用交互模式或缺少参数，则提示用户输入
        if (options.interactive || !options.gatewayUrl || !options.nodeCode ||
            !options.gatewayApiKey || !options.rewardAddress || !options.apiBasePath) {

          if (!options.interactive) {
            const missingParams = [];
            if (!options.gatewayUrl) missingParams.push('--gateway-url');
            if (!options.nodeCode) missingParams.push('--node-code');
            if (!options.gatewayApiKey) missingParams.push('--gateway-api-key');
            if (!options.rewardAddress) missingParams.push('--reward-address');
            if (!options.apiBasePath) missingParams.push('--api-base-path');

            logInfo(`Missing parameters: ${missingParams.join(', ')}. Entering interactive mode.`);
          }

          const remoteParams = await inquirer.prompt([
            {
              type: 'input',
              name: 'gatewayUrl',
              message: 'Gateway URL:',
              default: options.gatewayUrl || '',
              validate: input => input ? true : 'Gateway URL is required'
            },
            {
              type: 'input',
              name: 'nodeCode',
              message: 'Node code:',
              default: options.nodeCode || '',
              validate: input => input ? true : 'Node code is required'
            },
            {
              type: 'input',
              name: 'gatewayApiKey',
              message: 'Gateway API key:',
              default: options.gatewayApiKey || '',
              validate: input => input ? true : 'Gateway API key is required'
            },
            {
              type: 'input',
              name: 'rewardAddress',
              message: 'Reward address:',
              default: options.rewardAddress || '',
              validate: input => input ? true : 'Reward address is required'
            },
            {
              type: 'input',
              name: 'apiBasePath',
              message: 'API server base path:',
              default: options.apiBasePath || '',
              validate: input => input ? true : 'API server base path is required'
            }
          ]);

          options = { ...options, ...remoteParams };
        }

        // 检查Ollama服务
        if (!await checkOllamaService()) {
          return false;
        }

        // 获取GPU信息
        const gpuInfo = await getGpuInfo();
        options.gpuInfo = gpuInfo;

        logInfo('Registering device with gateway...');
        logInfo(`Gateway URL: ${options.gatewayUrl}`);
        logInfo(`Node Code: ${options.nodeCode}`);
        logInfo(`Reward Address: ${options.rewardAddress}`);

        // 执行注册
        await registerDevice(options);
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
    .action(async () => {
      try {
        await checkMinerStatus();
      } catch (error) {
        handleError(error);
      }
    });



  // 重新注册命令
  program
    .command('re-register')
    .description('Re-register device using previously saved registration parameters')
    .action(async () => {
      try {
        // 检查是否有保存的注册参数
        if (!hasRegistrationParams()) {
          logError('No saved registration parameters found. Please register first using the "run" command with remote mode.');
          return;
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

        // 使用保存的参数重新注册设备
        await reRegisterDevice({ gpuInfo });
      } catch (error) {
        handleError(error);
      }
    });

};

module.exports = {
  setupCommands
};
