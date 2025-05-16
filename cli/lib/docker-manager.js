/**
 * Docker管理模块 - 处理Docker相关操作
 */
const fs = require('fs');
const shell = require('shelljs');
const fetch = require('node-fetch');
const { spawn } = require('child_process');
const inquirer = require('inquirer');
const { CONFIG } = require('./config');
const { logInfo, logSuccess, logError, logWarning } = require('./logger');

// 在默认浏览器中打开URL
const openBrowser = (url) => {
  logInfo(`Opening ${url} in default browser...`);

  const command = process.platform === 'win32' ? 'start' :
    process.platform === 'darwin' ? 'open' : 'xdg-open';

  shell.exec(`${command} ${url}`, { silent: true });
};

// 创建docker-compose.override.yml文件
const createOverrideFile = (mode, options) => {
  logInfo(`Creating docker-compose.override.yml for ${mode} mode...`);

  let content;

  if (mode === 'local') {
    content = `version: '3'
services:
  sight-miner-backend:
    environment:
      - NODE_CODE=default
      - GATEWAY_API_URL=https://sightai.io
      - GATEWAY_API_KEY=default
      - REWARD_ADDRESS=default
      - GPU_BRAND="${options.gpuInfo.brand}"
      - DEVICE_TYPE="${process.platform}"
      - GPU_MODEL="${options.gpuInfo.model}"
      - API_SERVER_BASE_PATH=
`;
  } else { // remote mode
    content = `version: '3'
services:
  sight-miner-backend:
    environment:
      - NODE_CODE=${options.nodeCode}
      - GATEWAY_API_URL=${options.gatewayUrl}
      - GATEWAY_API_KEY=${options.gatewayApiKey}
      - GPU_BRAND="${options.gpuInfo.brand}"
      - DEVICE_TYPE="${process.platform}"
      - GPU_MODEL="${options.gpuInfo.model}"
      - REWARD_ADDRESS=${options.rewardAddress}
      - API_SERVER_BASE_PATH=${options.apiBasePath}
`;
  }

  fs.writeFileSync('docker-compose.override.yml', content);
  logSuccess('Created docker-compose.override.yml successfully');
};

// 使用可见进度执行Docker命令
const executeDockerCommandWithProgress = (command, args, successMessage) => {
  return new Promise((resolve, reject) => {
    logInfo(`Running: ${command} ${args.join(' ')}...`);

    const dockerProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    // 处理stdout
    dockerProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;

      // 显示进度输出
      process.stdout.write(chunk);
    });

    // 处理stderr
    dockerProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;

      // 显示进度输出（Docker通常将进度发送到stderr）
      process.stdout.write(chunk);
    });

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess(successMessage);
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

// 部署OpenWebUI
const deployOpenWebUI = async (options = {}) => {
  const {
    port = CONFIG.ports.webui,
    force = false,
    mode = 'local',
    gatewayUrl = 'http://host.docker.internal:8716',
    openBrowserAfterDeploy = true
  } = options;

  logInfo('Setting up Open WebUI...');

  // 检查是否已存在容器
  const containerExists = shell.exec('docker ps -a -q -f name=open-webui', { silent: true }).stdout.trim();

  if (containerExists) {
    if (force) {
      logInfo('Existing Open WebUI container found. Force flag is set, removing...');
      try {
        await executeDockerCommandWithProgress(
          'docker',
          ['rm', '-f', 'open-webui'],
          'Removed existing Open WebUI container'
        );
      } catch (error) {
        logError(`Failed to remove existing Open WebUI container: ${error.message}`);
        return false;
      }
    } else {
      logError('Open WebUI container already exists. Use --force or -f flag to remove existing container.');
      return false;
    }
  }

  logInfo(`Starting Open WebUI on port ${port}...`);
  logInfo(`Mode: ${mode}`);

  try {
    const dockerRunArgs = [
      'run', '-d',
      '-p', `${port}:8080`,
      '-e', `OLLAMA_BASE_URL=${mode === 'remote' ? gatewayUrl : 'http://host.docker.internal:8716'}`,
      '--add-host=host.docker.internal:host-gateway',
      '-v', 'ollama:/root/.ollama',
      '-v', 'open-webui:/app/backend/data',
      '--name', 'open-webui',
      '--restart', 'always',
      'ghcr.io/open-webui/open-webui:ollama'
    ];

    await executeDockerCommandWithProgress(
      'docker',
      dockerRunArgs,
      'Open WebUI started successfully'
    );

    // 等待服务启动
    logInfo('Waiting for Open WebUI to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (openBrowserAfterDeploy) {
      // 打开Web界面
      logInfo('Opening Open WebUI in browser...');
      openBrowser(`http://localhost:${port}`);
    }

    // 打印成功消息
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              Open WebUI Deployed! 🎉                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Open WebUI is now running on:                             ║');
    console.log('║                                                            ║');
    console.log(`║  🌐 http://localhost:${port}                                 ║`);
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    return true;
  } catch (error) {
    logError(`Failed to start Open WebUI: ${error.message}`);
    if (error.errorOutput) {
      logError(`Error details: ${error.errorOutput}`);
    }
    return false;
  }
};

// 启动服务
const startServices = async (options = {}) => {
  logInfo('Starting services...');

  // 启动docker-compose
  logInfo('Starting docker-compose...');
  try {
    // 检查是否已存在容器
    const containerExists = shell.exec('docker ps -a -q -f name=sight-miner-backend', { silent: true }).stdout.trim();

    if (containerExists && options.force) {
      logInfo('Existing containers found. Force flag is set, removing...');
      await executeDockerCommandWithProgress(
        'docker-compose',
        ['down'],
        'Removed existing containers'
      );
    }

    await executeDockerCommandWithProgress(
      'docker-compose',
      ['up', '--build', '-d'],
      'Docker compose services started successfully'
    );
  } catch (error) {
    logError(`Failed to start docker-compose: ${error.message}`);
    if (error.errorOutput) {
      logError(`Error details: ${error.errorOutput}`);
    }
    return false;
  }

  // 等待服务启动
  logInfo('Waiting for services to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 打开Web界面
  logInfo('Opening web interfaces...');
  openBrowser(`http://localhost:${CONFIG.ports.miner}`);

  logSuccess('Miner service started successfully');

  // 打印突出的成功消息，包含端口信息
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Setup Complete! 🎉                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Services are now running on:                              ║');
  console.log('║                                                            ║');
  console.log('║  📊 Sight AI Miner Dashboard:                              ║');
  console.log(`║     http://localhost:${CONFIG.ports.miner}                                  ║`);
  console.log('║                                                            ║');
  console.log('║  To deploy Open WebUI, run:                                ║');
  console.log('║     sight-miner deploy-webui                               ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  return true;
};

// 下载docker-compose.yml文件
const downloadComposeFile = async () => {
  const composeUrl = CONFIG.urls.compose;
  const composeFile = 'docker-compose.yml';

  logInfo(`Downloading ${composeFile}...`);

  try {
    const response = await fetch(composeUrl);

    if (!response.ok) {
      logError(`Failed to download ${composeFile}: ${response.statusText}`);
      return false;
    }

    const content = await response.text();

    // 保存到当前目录
    fs.writeFileSync(composeFile, content);

    logSuccess(`${composeFile} downloaded successfully`);
    return true;
  } catch (error) {
    logError(`Failed to download ${composeFile}: ${error.message}`);
    return false;
  }
};

// 停止矿工
const stopMiner = async () => {
  logInfo('Stopping miner...');

  try {
    await executeDockerCommandWithProgress(
      'docker-compose',
      ['down'],
      'Docker compose services stopped successfully'
    );

    try {
      await executeDockerCommandWithProgress(
        'docker',
        ['rm', '-f', 'open-webui'],
        'Open WebUI container removed successfully'
      );
    } catch (error) {
      // 如果容器不存在，忽略错误
      logInfo('No Open WebUI container to remove');
    }

    logSuccess('Miner stopped successfully');
    return true;
  } catch (error) {
    logError(`Failed to stop miner: ${error.message}`);
    if (error.errorOutput) {
      logError(`Error details: ${error.errorOutput}`);
    }
    return false;
  }
};

// 显示日志
const showLogs = async (lines = 100, follow = false) => {
  logInfo(`Showing miner logs (${follow ? 'following' : 'last ' + lines + ' lines'})...`);

  try {
    const args = ['logs'];
    if (follow) {
      args.push('-f');
    }
    args.push(`--tail=${lines}`);

    await executeDockerCommandWithProgress(
      'docker-compose',
      args,
      'Logs displayed successfully'
    );
    return true;
  } catch (error) {
    logError(`Failed to show logs: ${error.message}`);
    if (error.errorOutput) {
      logError(`Error details: ${error.errorOutput}`);
    }
    return false;
  }
};

// 更新矿工
const updateMiner = async (force = false) => {
  logInfo('Updating miner...');

  // 检查是否有冲突的容器
  const checkConflictingContainers = () => {
    const containers = [
      'postgres-db',
      'sight-miner-backend',
      'sight-miner-frontend',
      'open-webui'
    ];

    const conflicting = [];

    containers.forEach(container => {
      const exists = shell.exec(`docker ps -a -q -f name=${container}`, { silent: true }).stdout.trim();
      if (exists) {
        conflicting.push(container);
      }
    });

    return conflicting;
  };

  const conflictingContainers = checkConflictingContainers();

  if (conflictingContainers.length > 0) {
    logInfo(`Found existing containers that may conflict: ${conflictingContainers.join(', ')}`);

    // 停止并移除现有容器
    logInfo('Stopping and removing existing containers...');

    try {
      // 首先尝试使用 docker-compose down
      await executeDockerCommandWithProgress(
        'docker-compose',
        ['down'],
        'Docker compose services stopped successfully'
      );

      // 然后强制移除任何可能仍然存在的容器
      for (const container of conflictingContainers) {
        const containerExists = shell.exec(`docker ps -a -q -f name=${container}`, { silent: true }).stdout.trim();
        if (containerExists) {
          logInfo(`Removing container: ${container}`);
          await executeDockerCommandWithProgress(
            'docker',
            ['rm', '-f', container],
            `Container ${container} removed successfully`
          );
        }
      }
    } catch (error) {
      if (!force) {
        logError(`Failed to remove existing containers: ${error.message}`);
        logError('Use --force option to force update despite errors');
        return false;
      } else {
        logWarning(`Encountered errors while removing containers, but continuing due to --force option: ${error.message}`);
      }
    }
  } else {
    logInfo('No conflicting containers found');
  }

  logInfo('Pulling latest images...');
  try {
    await executeDockerCommandWithProgress(
      'docker-compose',
      ['pull'],
      'Latest images pulled successfully'
    );

    logInfo('Starting updated services...');
    await executeDockerCommandWithProgress(
      'docker-compose',
      ['up', '-d'],
      'Updated services started successfully'
    );

    logSuccess('Miner updated successfully');
    return true;
  } catch (error) {
    logError(`Failed to update miner: ${error.message}`);
    if (error.errorOutput) {
      logError(`Error details: ${error.errorOutput}`);
    }
    return false;
  }
};

// 清理矿工资源
const cleanMiner = async (all = false) => {
  if (all) {
    logInfo('Cleaning all resources...');
    try {
      await executeDockerCommandWithProgress(
        'docker-compose',
        ['down', '-v'],
        'Docker compose services and volumes removed successfully'
      );

      await executeDockerCommandWithProgress(
        'docker',
        ['volume', 'rm', 'ollama', 'open-webui'],
        'Volumes removed successfully'
      );

      logSuccess('All resources cleaned successfully');
      return true;
    } catch (error) {
      logError(`Failed to clean resources: ${error.message}`);
      if (error.errorOutput) {
        logError(`Error details: ${error.errorOutput}`);
      }
      return false;
    }
  } else {
    logInfo('Cleaning up containers...');
    try {
      await executeDockerCommandWithProgress(
        'docker-compose',
        ['down'],
        'Containers cleaned successfully'
      );
      return true;
    } catch (error) {
      logError(`Failed to clean containers: ${error.message}`);
      if (error.errorOutput) {
        logError(`Error details: ${error.errorOutput}`);
      }
      return false;
    }
  }
};

module.exports = {
  openBrowser,
  createOverrideFile,
  executeDockerCommandWithProgress,
  startServices,
  deployOpenWebUI,
  downloadComposeFile,
  stopMiner,
  showLogs,
  updateMiner,
  cleanMiner
};
