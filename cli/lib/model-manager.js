/**
 * 模型管理模块 - 处理模型拉取和报告
 */
const { spawn } = require('child_process');
const ora = require('ora');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { CONFIG } = require('./config');
const { logInfo, logSuccess, logError, logWarning } = require('./logger');

// 拉取deepscaler模型并显示进度
const pullDeepseekModel = async () => {
  logInfo('Pulling deepscaler model...');

  const spinner = ora('Pulling deepscaler model...').start();

  const pullWithTimeout = (retryCount = 0) => {
    return new Promise((resolve, reject) => {
      const ollamaProcess = spawn('ollama', ['pull', 'deepscaler'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      // 设置超时
      const timeoutId = setTimeout(() => {
        ollamaProcess.kill();
        reject(new Error('Model pull timed out after 5 minutes'));
      }, CONFIG.modelPullTimeout);

      // 处理stdout
      ollamaProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // 更新spinner显示进度
        if (chunk.includes('pulling')) {
          spinner.text = `Pulling deepscaler model... ${chunk.trim()}`;
        }
      });

      // 处理stderr
      ollamaProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ollamaProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          spinner.succeed('Successfully pulled deepscaler model');
          logSuccess('Successfully pulled deepscaler model');
          resolve(true);
        } else {
          const error = new Error(`Process exited with code ${code}`);
          error.output = output;
          error.errorOutput = errorOutput;
          reject(error);
        }
      });
    });
  };

  try {
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        await pullWithTimeout(attempt - 1);
        return true;
      } catch (error) {
        if (attempt === CONFIG.maxRetries) {
          throw error;
        }

        spinner.warn(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
  } catch (error) {
    spinner.fail('Failed to pull deepscaler model');

    let errorMessage = 'Failed to pull deepscaler model.\n\n';

    // 处理特定错误情况
    if (error.message.includes('timed out')) {
      errorMessage += 'The operation timed out. This could be due to:\n' +
        '1. Slow internet connection\n' +
        '2. Large model size\n' +
        '3. Server response time\n\n' +
        'Please try again with a better internet connection.';
    } else if (error.errorOutput && error.errorOutput.includes('no space left')) {
      errorMessage += 'Insufficient disk space. Please:\n' +
        '1. Free up disk space (at least 10GB recommended)\n' +
        '2. Check available space with "df -h"\n' +
        '3. Try again after freeing space';
    } else if (error.errorOutput && error.errorOutput.includes('connection refused')) {
      errorMessage += 'Connection to Ollama service failed. Please:\n' +
        '1. Ensure Ollama service is running\n' +
        '2. Check if port 11434 is accessible\n' +
        '3. Restart Ollama service\n' +
        '4. Try again';
    } else {
      errorMessage += 'Please try these steps:\n' +
        '1. Ensure you have a stable internet connection\n' +
        '2. Check if Ollama service is running properly\n' +
        '3. Try running "ollama pull deepscaler" manually\n' +
        '4. If the issue persists, try:\n' +
        '   - Restarting Ollama service\n' +
        '   - Clearing Ollama cache\n' +
        '   - Checking system resources (disk space, memory)\n\n' +
        'Error details:\n' +
        (error.errorOutput || error.message);
    }

    logError(errorMessage);
    return false;
  }
};

// 从后端API获取模型
const fetchModels = async () => {
  logInfo('Fetching models from backend API...');

  try {
    // 尝试从本地API服务器获取
    const response = await fetch('http://localhost:8716/api/v1/models/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    logSuccess('Successfully fetched models from backend');
    return data.models || [];
  } catch (error) {
    // 如果第一次尝试失败，直接从Ollama API获取
    try {
      logInfo('Trying to fetch models directly from Ollama API...');
      const ollamaResponse = await fetch(`http://localhost:${CONFIG.ports.ollama}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Failed to fetch models from Ollama: ${ollamaResponse.statusText}`);
      }

      const ollamaData = await ollamaResponse.json();
      logSuccess('Successfully fetched models from Ollama API');
      return ollamaData.models || [];
    } catch (ollamaError) {
      logError(`Failed to fetch models: ${error.message}`);
      logError(`Ollama API error: ${ollamaError.message}`);
      return [];
    }
  }
};

// 检查设备是否已注册到网关
const checkGatewayRegistration = async () => {
  logInfo('Checking if device is registered to the gateway...');

  try {
    const response = await fetch('http://localhost:8716/api/v1/device-status/gateway-status', {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      logWarning('Failed to check gateway registration status');
      return false;
    }

    const data = await response.json();
    return data.isRegistered;
  } catch (error) {
    logWarning(`Failed to check gateway registration: ${error.message}`);
    return false;
  }
};

// 处理报告模型命令
const handleReportModelsCommand = async (options = {}) => {
  // 检查后端是否运行
  logInfo('Checking if backend service is running...');

  try {
    const response = await fetch('http://localhost:8716/api/v1/health', {
      method: 'GET',
      timeout: 3000
    });

    if (!response.ok) {
      logError('Backend service is not running. Please start the miner first.');
      return false;
    }
  } catch (error) {
    logError('Backend service is not running. Please start the miner first.');
    return false;
  }

  // 检查设备是否已注册到网关
  const isRegistered = await checkGatewayRegistration();
  if (!isRegistered) {
    // 如果未注册且不是来自设备注册流程
    if (!options.skipSelection) {
      const { continueWithoutRegistration } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueWithoutRegistration',
          message: 'Device is not registered to the gateway. Models will be stored locally but not reported to the gateway. Continue?',
          default: false
        }
      ]);

      if (!continueWithoutRegistration) {
        logInfo('Operation cancelled. Please register your device first using the "run" command with remote mode.');
        return false;
      }
    }
    
    logWarning('Continuing without gateway registration. Models will be stored locally only.');
  } else {
    logSuccess('Device is registered to the gateway. Models will be reported to the gateway.');
  }

  let selectedModels = [];
  // 获取模型并允许选择
  const spinner = ora('Fetching available models...').start();
  const models = await fetchModels();
  spinner.stop();

  if (models.length === 0) {
    logError('No models found. Please ensure Ollama is running and has models installed.');
    return false;
  }

  // 显示模型并允许选择
  logSuccess(`Found ${models.length} models`);

  if (options.skipSelection) {
    // 如果skipSelection为true，自动选择所有模型
    selectedModels = models.map(model => model.name);
    logInfo(`Automatically selecting all ${selectedModels.length} models for reporting.`);
  } else {
    // 格式化模型信息以便显示
    const modelChoices = models.map(model => {
      const size = model.size ? `(${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB)` : '';
      const modified = model.modified_at ? `- Last modified: ${new Date(model.modified_at).toLocaleString()}` : '';
      return {
        name: `${model.name} ${size} ${modified}`,
        value: model.name,
        checked: true // 默认选择所有模型
      };
    });

    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedModels',
        message: 'Select models to report:',
        choices: modelChoices,
        pageSize: 20,
        validate: (answer) => {
          if (answer.length < 1) {
            return 'You must select at least one model.';
          }
          return true;
        }
      }
    ]);

    selectedModels = result.selectedModels;

    if (selectedModels.length === 0) {
      logWarning('No models selected. Operation cancelled.');
      return false;
    }

    // 确认选择
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `You've selected ${selectedModels.length} models to report. Continue?`,
        default: true
      }
    ]);

    if (!confirm) {
      logInfo('Operation cancelled by user');
      return false;
    }
  }

  // 报告选定的模型
  const reportSpinner = ora(`Reporting selected models${!isRegistered ? ' (without gateway registration)' : ''}...`).start();

  try {
    logInfo('Reporting selected models...');
    // 选择适当的端点
    const endpoint = 'http://localhost:8716/api/v1/models/report'  // 使用注册的端点

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ models: selectedModels }),
      timeout: 10000
    });
    if (!response.ok) {
      throw new Error(`Failed to report models: ${response.statusText} handleReportModelsCommand`);
    }

    const data = await response.json();
    reportSpinner.stop();

    if (data.success) {
      if (isRegistered) {
        logSuccess('Models successfully reported to gateway');
        
        // 以表格格式显示报告的模型
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                   Reported Models                          ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        selectedModels.forEach(model => {
          console.log(`║  ${chalk.green('✓')} ${model.padEnd(60, ' ')} ║`);
        });
        console.log('╚════════════════════════════════════════════════════════════╝');
      } else {
        logWarning('Models successfully stored locally but not reported to gateway. To report to the gateway, please register your device first using the "run" command with remote mode.');
      }
      return true;
    } else {
      logError(`Failed to report models: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    reportSpinner.stop();
    logError(`Failed to report models: ${error.message}`);
    return false;
  }
};

module.exports = {
  pullDeepseekModel,
  fetchModels,
  checkGatewayRegistration,
  handleReportModelsCommand
};
