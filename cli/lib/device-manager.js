/**
 * 设备管理模块 - 处理设备注册和状态
 */
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { logInfo, logSuccess, logError, logWarning } = require('./logger');
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

// 检查矿工状态
const checkMinerStatus = () => {
  logInfo('Checking miner status...');
  const { exec } = require('shelljs');
  exec('docker ps | grep -E "sight-miner|open-webui"');
};

module.exports = {
  registerDevice,
  checkMinerStatus
};
