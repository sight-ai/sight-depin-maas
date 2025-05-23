/**
 * 设备管理模块 - 处理设备注册和状态
 */
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { logInfo, logSuccess, logError, logWarning } = require('./logger');
const { saveRegistrationParams, loadRegistrationParams } = require('./storage');
const { handleReportModelsCommand } = require('./model-manager');

// 注册设备到服务器
const registerDevice = async (options) => {
  const registerUrl = 'http://localhost:8716/api/v1/device-status/register';
  logInfo('Registering device with server...');

  const data = {
    code: options.nodeCode,
    gateway_address: options.gatewayUrl,
    reward_address: options.rewardAddress,
    key: options.gatewayApiKey,
    device_type: process.platform,
    gpu_type: options.gpuInfo.model,
  };

  logInfo('Sending registration data...');

  try {
    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      logSuccess('Device registered successfully');
      logInfo('Starting heartbeat reporting...');

      // 保存注册参数以便将来重新注册
      saveRegistrationParams(options);

      // 询问用户是否要选择要报告的模型
      const { selectModels } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'selectModels',
          message: 'Would you like to select which models to report to the gateway?',
          default: true
        }
      ]);

      if (selectModels) {
        await handleReportModelsCommand(options);
      } else {
        logInfo('Skipping model selection. All available models will be reported automatically.');
        // 自动报告所有模型
        await handleReportModelsCommand({ ...options, skipSelection: true });
      }

      return true;
    } else {
      const responseText = await response.text();
      let errorMessage = `Failed to register device (Status code: ${response.status})`;

      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage += `\nError: ${errorData.message}`;
        }
      } catch (e) {
        errorMessage += `\nResponse: ${responseText}`;
      }

      logError(errorMessage + '\nPlease check:\n' +
        '1. All registration parameters are correct\n' +
        '2. Gateway server is accessible\n' +
        '3. API key is valid\n' +
        '4. Network connection is stable\n' +
        '5. Try running the command again');
      return false;
    }
  } catch (error) {
    logError(`Failed to register device: ${error.message}\n` +
      'Please check:\n' +
      '1. Gateway server is running and accessible\n' +
      '2. Network connection is stable\n' +
      '3. Firewall settings allow the connection\n' +
      '4. Try running the command again');
    return false;
  }
};

// 使用保存的参数重新注册设备
const reRegisterDevice = async (options = {}) => {
  logInfo('Re-registering device with saved parameters...');

  // 加载保存的注册参数
  const savedParams = loadRegistrationParams();

  if (!savedParams) {
    logError('No saved registration parameters found. Please register first using the "run" command with remote mode.');
    return false;
  }

  logInfo(`Using saved registration parameters from: ${savedParams.timestamp}`);
  logInfo(`Gateway URL: ${savedParams.gatewayUrl}`);
  logInfo(`Reward Address: ${savedParams.rewardAddress}`);

  // 合并保存的参数和传入的选项
  const registrationOptions = {
    ...savedParams,
    ...options,
    gpuInfo: options.gpuInfo || { model: 'Unknown' }
  };

  // 执行注册
  return await registerDevice(registrationOptions);
};

// 检查矿工状态
const checkMinerStatus = () => {
  logInfo('Checking miner status...');
  const { exec } = require('shelljs');
  exec('docker ps | grep -E "sight-miner|open-webui"');
};

module.exports = {
  registerDevice,
  reRegisterDevice,
  checkMinerStatus
};
