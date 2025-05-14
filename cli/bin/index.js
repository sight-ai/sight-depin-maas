#!/usr/bin/env node
const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const si = require('systeminformation');
const { spawn } = require('child_process');
const os = require('os');

// Configuration management
const CONFIG = {
  version: '1.0.0',
  name: 'Sight AI Miner CLI',
  minDockerVersion: '20.10.0',
  minDockerComposeVersion: '2.0.0',
  ollamaPort: 11434,
  ollamaTimeout: 5000,
  modelPullTimeout: 300000,
  maxRetries: 3,
  retryDelay: 5000,
  ports: {
    miner: 3000,
    webui: 8080,
    ollama: 11434
  },
  paths: {
    log: path.join(os.homedir(), '.sight-miner', 'logs'),
    cache: path.join(os.homedir(), '.sight-miner', 'cache'),
    config: path.join(os.homedir(), '.sight-miner', 'config')
  },
  urls: {
    compose: 'https://sightai.io/model/local/docker-compose.yml',
    gateway: 'https://sightai.io'
  },
  docker: {
    services: ['sight-miner-backend', 'open-webui'],
    volumes: ['ollama', 'open-webui']
  }
};

// Ensure required directories exist
Object.values(CONFIG.paths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logging configuration
const LOG_FILE = path.join(CONFIG.paths.log, 'sight-miner.log');

// Logging system
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

class Logger {
  constructor(options = {}) {
    this.options = {
      logFile: LOG_FILE,
      errorFile: path.join(CONFIG.paths.log, 'error.log'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...options
    };

    this.initializeLogFiles();
  }

  initializeLogFiles() {
    // Ensure log directory exists
    const logDir = path.dirname(this.options.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Rotate logs if needed
    this.rotateLogs();
  }

  rotateLogs() {
    const rotateFile = (filePath) => {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size >= this.options.maxFileSize) {
          // Rotate existing files
          for (let i = this.options.maxFiles - 1; i > 0; i--) {
            const oldFile = `${filePath}.${i}`;
            const newFile = `${filePath}.${i + 1}`;
            if (fs.existsSync(oldFile)) {
              fs.renameSync(oldFile, newFile);
            }
          }
          // Move current file to .1
          fs.renameSync(filePath, `${filePath}.1`);
        }
      }
    };

    rotateFile(this.options.logFile);
    rotateFile(this.options.errorFile);
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    return `${timestamp} [${level}] ${message}\n`;
  }

  writeToFile(file, message) {
    try {
      fs.appendFileSync(file, message);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  log(level, message) {
    const formattedMessage = this.formatMessage(level, message);

    // Console output with colors
    switch (level) {
      case LogLevel.DEBUG:
        console.log(chalk.gray(formattedMessage));
        break;
      case LogLevel.INFO:
        console.log(chalk.blue(formattedMessage));
        break;
      case LogLevel.SUCCESS:
        console.log(chalk.green(formattedMessage));
        break;
      case LogLevel.WARNING:
        console.log(chalk.yellow(formattedMessage));
        break;
      case LogLevel.ERROR:
        console.error(chalk.red(formattedMessage));
        break;
    }

    // Write to log file
    this.writeToFile(this.options.logFile, formattedMessage);

    // Write errors to separate error log
    if (level === LogLevel.ERROR) {
      this.writeToFile(this.options.errorFile, formattedMessage);
    }
  }

  debug(message) {
    this.log(LogLevel.DEBUG, message);
  }

  info(message) {
    this.log(LogLevel.INFO, message);
  }

  success(message) {
    this.log(LogLevel.SUCCESS, message);
  }

  warning(message) {
    this.log(LogLevel.WARNING, message);
  }

  error(message) {
    this.log(LogLevel.ERROR, message);
    return false;
  }
}

const logger = new Logger();

// Replace existing logging functions with new logger
const logInfo = (message) => logger.info(message);
const logSuccess = (message) => logger.success(message);
const logWarning = (message) => logger.warning(message);
const logError = (message) => logger.error(message);

// Version comparison function
const versionGt = (v1, v2) => {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  for (let i = 0; i < v1Parts.length; i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;

    if (part1 > part2) return true;
    if (part1 < part2) return false;
  }

  return false;
};

// Check if Docker daemon is running
const isDockerRunning = () => {
  try {
    const result = shell.exec('docker info', { silent: true });
    return result.code === 0;
  } catch (error) {
    return false;
  }
};

// Check system requirements
const checkRequirements = async () => {
  logInfo('Checking system requirements...');

  // Check Docker installation
  if (!shell.which('docker')) {
    logError('Docker is not installed. Please follow these steps:\n' +
      '1. Visit https://docs.docker.com/get-docker/\n' +
      '2. Download and install Docker for your operating system\n' +
      '3. Restart your computer after installation\n' +
      '4. Run this command again');
    return false;
  }

  // Check Docker version
  const dockerVersionOutput = shell.exec('docker --version', { silent: true }).stdout;
  const dockerVersionMatch = dockerVersionOutput.match(/Docker version ([0-9.]+)/);

  if (!dockerVersionMatch) {
    logError('Unable to determine Docker version. Please ensure Docker is properly installed.');
    return false;
  }

  const dockerVersion = dockerVersionMatch[1];

  if (versionGt(CONFIG.minDockerVersion, dockerVersion)) {
    logError(`Docker version ${dockerVersion} is too old. Please update Docker:\n` +
      `1. Current version: ${dockerVersion}\n` +
      `2. Required version: ${CONFIG.minDockerVersion} or higher\n` +
      `3. Visit https://docs.docker.com/get-docker/ to download the latest version`);
    return false;
  }

  // Check Docker Compose installation
  if (!shell.which('docker-compose')) {
    logError('Docker Compose is not installed. Please follow these steps:\n' +
      '1. Visit https://docs.docker.com/compose/install/\n' +
      '2. Follow the installation instructions for your operating system\n' +
      '3. Restart your terminal after installation\n' +
      '4. Run this command again');
    return false;
  }

  // Check Docker Compose version
  const composeVersionOutput = shell.exec('docker-compose --version', { silent: true }).stdout;
  let composeVersion;
  const composeV1Match = composeVersionOutput.match(/docker-compose version ([0-9.]+)/);
  const composeV2Match = composeVersionOutput.match(/Docker Compose version v?([0-9.]+)/);
  const composeAnyMatch = composeVersionOutput.match(/v?([0-9]+\.[0-9]+\.[0-9]+)/);

  if (composeV1Match) {
    composeVersion = composeV1Match[1];
  } else if (composeV2Match) {
    composeVersion = composeV2Match[1];
  } else if (composeAnyMatch) {
    composeVersion = composeAnyMatch[1];
  } else {
    logError('Unable to determine Docker Compose version. Please ensure Docker Compose is properly installed.');
    return false;
  }

  if (versionGt(CONFIG.minDockerComposeVersion, composeVersion)) {
    logError(`Docker Compose version ${composeVersion} is too old. Please update Docker Compose:\n` +
      `1. Current version: ${composeVersion}\n` +
      `2. Required version: ${CONFIG.minDockerComposeVersion} or higher\n` +
      `3. Visit https://docs.docker.com/compose/install/ to download the latest version`);
    return false;
  }

  // Check if Docker daemon is running
  if (!isDockerRunning()) {
    logError('Docker daemon is not running. Please follow these steps:\n' +
      '1. Start Docker Desktop application\n' +
      '2. Wait for Docker to fully initialize\n' +
      '3. Check Docker status in system tray\n' +
      '4. Run this command again');
    return false;
  }

  logSuccess('System requirements check passed');
  return true;
};

// Check if Ollama service is running
const checkOllamaService = async () => {
  logInfo('Checking Ollama service...');

  try {
    const response = await fetch(`http://localhost:${CONFIG.ports.ollama}`, { timeout: CONFIG.ollamaTimeout });
    if (response.ok) {
      logSuccess('Ollama service is running');
      return true;
    }
  } catch (error) {
    logError('Ollama service is not running. Please follow these steps:\n' +
      '1. Install Ollama if not already installed:\n' +
      '   - Visit https://ollama.ai/download\n' +
      '   - Download and install for your operating system\n' +
      '2. Start Ollama service:\n' +
      '   - On Windows: Start Ollama from the Start menu\n' +
      '   - On macOS: Start Ollama from Applications\n' +
      '   - On Linux: Run "ollama serve" in terminal\n' +
      '3. Wait for Ollama to fully initialize\n' +
      '4. Run this command again');
    return false;
  }

  return false;
};

// Pull deepscaler model with progress indication
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

      // Set timeout
      const timeoutId = setTimeout(() => {
        ollamaProcess.kill();
        reject(new Error('Model pull timed out after 5 minutes'));
      }, CONFIG.modelPullTimeout);

      // Handle stdout
      ollamaProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // Update spinner with progress
        if (chunk.includes('pulling')) {
          spinner.text = `Pulling deepscaler model... ${chunk.trim()}`;
        }
      });

      // Handle stderr
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

    // Handle specific error cases
    if (error.message.includes('timed out')) {
      errorMessage += 'The operation timed out. This could be due to:\n' +
        '1. Slow internet connection\n' +
        '2. Large model size\n' +
        '3. Server response time\n\n' +
        'Please try again with a better internet connection.';
    } else if (error.errorOutput.includes('no space left')) {
      errorMessage += 'Insufficient disk space. Please:\n' +
        '1. Free up disk space (at least 10GB recommended)\n' +
        '2. Check available space with "df -h"\n' +
        '3. Try again after freeing space';
    } else if (error.errorOutput.includes('connection refused')) {
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

// Get GPU information
const getGpuInfo = async () => {
  logInfo('Detecting GPU on system...');

  try {
    // Get detailed system information
    const [graphics, cpu, osInfo] = await Promise.all([
      si.graphics(),
      si.cpu(),
      si.osInfo()
    ]);

    let gpuInfo = {
      brand: 'Unknown',
      model: 'Unknown',
      type: 'Unknown',
      memory: 'Unknown',
      platform: process.platform,
      os: osInfo.distro
    };

    // Handle Apple Silicon (M1/M2/M3)
    if (process.platform === 'darwin' && cpu.manufacturer.toLowerCase().includes('apple')) {
      const mChipMatch = cpu.model.match(/M[1-3](?: Pro| Max| Ultra)?/i);
      if (mChipMatch) {
        gpuInfo = {
          brand: 'Apple Silicon',
          model: mChipMatch[0],
          type: 'Integrated',
          memory: 'Shared',
          platform: process.platform,
          os: osInfo.distro
        };
        logInfo(`Detected Apple Silicon: ${gpuInfo.model}`);
        return gpuInfo;
      }
    }

    // Handle other platforms
    if (graphics.controllers && graphics.controllers.length > 0) {
      const mainGpu = graphics.controllers[0];

      // Determine GPU brand
      if (mainGpu.vendor.toLowerCase().includes('nvidia')) {
        gpuInfo.brand = 'NVIDIA';
      } else if (mainGpu.vendor.toLowerCase().includes('amd')) {
        gpuInfo.brand = 'AMD';
      } else if (mainGpu.vendor.toLowerCase().includes('intel')) {
        gpuInfo.brand = 'Intel';
      }

      // Set GPU model
      gpuInfo.model = mainGpu.model || 'Unknown';

      // Determine GPU type
      if (mainGpu.type) {
        gpuInfo.type = mainGpu.type;
      } else if (mainGpu.vendor.toLowerCase().includes('intel')) {
        gpuInfo.type = 'Integrated';
      } else {
        gpuInfo.type = 'Discrete';
      }

      // Get memory information
      if (mainGpu.memoryTotal) {
        gpuInfo.memory = `${Math.round(mainGpu.memoryTotal / 1024)}GB`;
      }

      // Log detailed information
      logInfo(`Detected GPU Brand: ${gpuInfo.brand}`);
      logInfo(`Detected GPU Model: ${gpuInfo.model}`);
      logInfo(`GPU Type: ${gpuInfo.type}`);
      logInfo(`GPU Memory: ${gpuInfo.memory}`);

      // Additional platform-specific information
      if (process.platform === 'win32') {
        logInfo('Windows Platform: Checking for NVIDIA Optimus...');
        // Check for NVIDIA Optimus on Windows
        if (gpuInfo.brand === 'NVIDIA' && graphics.controllers.length > 1) {
          const intelGpu = graphics.controllers.find(gpu =>
            gpu.vendor.toLowerCase().includes('intel')
          );
          if (intelGpu) {
            logInfo('NVIDIA Optimus detected: System has both NVIDIA and Intel GPUs');
          }
        }
      }
    } else {
      // No GPU detected, try to get CPU information
      logWarning('No dedicated GPU detected, using CPU information');
      gpuInfo = {
        brand: cpu.manufacturer,
        model: cpu.model,
        type: 'CPU',
        memory: 'Shared',
        platform: process.platform,
        os: osInfo.distro
      };
    }

    return gpuInfo;
  } catch (error) {
    logWarning(`Error detecting GPU: ${error.message}`);
    return {
      brand: 'Unknown',
      model: 'Unknown',
      type: 'Unknown',
      memory: 'Unknown',
      platform: process.platform,
      os: 'Unknown'
    };
  }
};

// Open URL in default browser
const openBrowser = (url) => {
  logInfo(`Opening ${url} in default browser...`);

  const command = process.platform === 'win32' ? 'start' :
    process.platform === 'darwin' ? 'open' : 'xdg-open';

  shell.exec(`${command} ${url}`, { silent: true });
};

// Create docker-compose.override.yml file
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

// Execute Docker command with visible progress
const executeDockerCommandWithProgress = (command, args, successMessage) => {
  return new Promise((resolve, reject) => {
    logInfo(`Running: ${command} ${args.join(' ')}...`);

    const dockerProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    // Handle stdout
    dockerProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;

      // Display progress output
      process.stdout.write(chunk);
    });

    // Handle stderr
    dockerProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;

      // Display progress output (Docker often sends progress to stderr)
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

// Start services
const startServices = async (options = {}) => {
  logInfo('Starting services...');

  // Start docker-compose
  logInfo('Starting docker-compose...');
  try {
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

  // Start Open WebUI
  logInfo('Setting up Open WebUI...');
  try {
    await executeDockerCommandWithProgress(
      'docker',
      ['rm', '-f', 'open-webui'],
      'Removed existing Open WebUI container'
    );
  } catch (error) {
    // Ignore errors if container doesn't exist
    logInfo('No existing Open WebUI container to remove');
  }

  logInfo('Starting Open WebUI...');
  const mode = options.mode || program.opts().mode;
  logInfo(`Mode: ${mode}`);
  const gatewayUrl = options.gatewayUrl || program.opts().gatewayUrl || 'http://host.docker.internal:8716';

  try {
    const dockerRunArgs = [
      'run', '-d',
      '-p', `${CONFIG.ports.webui}:${CONFIG.ports.webui}`,
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
  } catch (error) {
    logError(`Failed to start Open WebUI: ${error.message}`);
    if (error.errorOutput) {
      logError(`Error details: ${error.errorOutput}`);
    }
    return false;
  }

  // Wait for services to start
  logInfo('Waiting for services to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Open web interfaces
  logInfo('Opening web interfaces...');
  openBrowser('http://localhost:3000');
  await new Promise(resolve => setTimeout(resolve, 2000));
  openBrowser('http://localhost:8080');

  logSuccess('All services started successfully');

  // Print prominent success message with port information
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   Setup Complete! 🎉                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Services are now running on:                              ║');
  console.log('║                                                            ║');
  console.log('║  📊 Sight AI Miner Dashboard:                              ║');
  console.log(`║     ${chalk.green('http://localhost:3000')}                              ║`);
  console.log('║                                                            ║');
  console.log('║  🌐 Open WebUI Interface:                                  ║');
  console.log(`║     ${chalk.green('http://localhost:8080')}                              ║`);
  console.log('║                                                            ║');
  console.log('║  Both services should open automatically in your browser.  ║');
  console.log('║  If not, you can click or copy the URLs above.            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  return true;
};

// Register device with the server
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
      await handleReportModelsCommand(options);
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

// Download docker-compose.yml file
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

    // Save to current directory
    fs.writeFileSync(composeFile, content);

    logSuccess(`${composeFile} downloaded successfully`);
    return true;
  } catch (error) {
    logError(`Failed to download ${composeFile}: ${error.message}`);
    return false;
  }
};

// Run local mode
const runLocalMode = async (gpuInfo) => {
  logInfo('Starting local mode setup...');

  // Download docker-compose.yml file
  if (!await downloadComposeFile()) {
    return false;
  }

  // Create docker-compose.override.yml file
  createOverrideFile('local', { gpuInfo });

  // Start services
  return await startServices({ mode: 'local' });
};

// Run remote mode
const runRemoteMode = async (options) => {
  logInfo('Starting remote mode setup...');

  // Validate remote mode parameters
  if (!options.gatewayUrl || !options.nodeCode || !options.gatewayApiKey ||
    !options.rewardAddress || !options.apiBasePath) {
    logError('Missing required parameters for remote mode');
    return false;
  }

  // Download docker-compose.yml file
  if (!await downloadComposeFile()) {
    return false;
  }

  // Create docker-compose.override.yml file
  createOverrideFile('remote', options);

  // Start services
  if (!await startServices(options)) {
    return false;
  }

  // Register device
  return await registerDevice(options);
};

// Check miner status
const checkMinerStatus = () => {
  logInfo('Checking miner status...');
  shell.exec('docker ps | grep -E "sight-miner|open-webui"');
};

// Stop miner
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
      // Ignore errors if container doesn't exist
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

// Show logs
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

// Update miner
const updateMiner = async () => {
  logInfo('Updating miner...');

  logInfo('Stopping current services...');
  shell.exec('docker-compose down');

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

// Check if device is registered to the gateway
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

// Error handling
class MinerError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MinerError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

const ErrorCodes = {
  DOCKER_NOT_INSTALLED: 'DOCKER_NOT_INSTALLED',
  DOCKER_VERSION_INVALID: 'DOCKER_VERSION_INVALID',
  DOCKER_COMPOSE_NOT_INSTALLED: 'DOCKER_COMPOSE_NOT_INSTALLED',
  DOCKER_COMPOSE_VERSION_INVALID: 'DOCKER_COMPOSE_VERSION_INVALID',
  DOCKER_DAEMON_NOT_RUNNING: 'DOCKER_DAEMON_NOT_RUNNING',
  OLLAMA_NOT_RUNNING: 'OLLAMA_NOT_RUNNING',
  MODEL_PULL_FAILED: 'MODEL_PULL_FAILED',
  GPU_DETECTION_FAILED: 'GPU_DETECTION_FAILED',
  DEVICE_REGISTRATION_FAILED: 'DEVICE_REGISTRATION_FAILED',
  COMPOSE_DOWNLOAD_FAILED: 'COMPOSE_DOWNLOAD_FAILED',
  SERVICE_START_FAILED: 'SERVICE_START_FAILED'
};

const handleError = (error) => {
  if (error instanceof MinerError) {
    logError(`[${error.code}] ${error.message}`);
    if (Object.keys(error.details).length > 0) {
      logError('Details:');
      Object.entries(error.details).forEach(([key, value]) => {
        logError(`  ${key}: ${value}`);
      });
    }
  } else {
    logError(`Unexpected error: ${error.message}`);
    if (error.stack) {
      logError('Stack trace:');
      logError(error.stack);
    }
  }

  // Log to file
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      details: error.details || {}
    }
  };

  fs.appendFileSync(
    path.join(CONFIG.paths.log, 'error.log'),
    JSON.stringify(errorLog, null, 2) + '\n'
  );

  return false;
};

// Main run function
const run = async (options) => {

  // Check system requirements
  if (!await checkRequirements()) {
    return false;
  }

  // Check Ollama service
  if (!await checkOllamaService()) {
    return false;
  }

  // Pull deepscaler model
  if (!await pullDeepseekModel()) {
    return false;
  }

  // Get GPU info
  const gpuInfo = await getGpuInfo();
  options.gpuInfo = gpuInfo;

  // Run according to selected mode
  if (options.mode === 'local') {
    return await runLocalMode(gpuInfo);
  } else if (options.mode === 'remote') {
    return await runRemoteMode(options);
  } else {
    logError('Invalid mode selected');
    return false;
  }
};

// Interactive mode selection
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

// Fetch models from backend API
const fetchModels = async () => {
  logInfo('Fetching models from backend API...');

  try {
    // Try to fetch from the local API server
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
    // If the first attempt fails, try the Ollama API directly
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

// Handle report models command
const handleReportModelsCommand = async (options) => {
  // Check if backend is running
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

  // Check if device is registered to the gateway
  const isRegistered = await checkGatewayRegistration();
  if (!isRegistered) {
    logWarning('Device is not registered to the gateway. Models will not be reported.');
    return
  }

  let selectedModels = [];
  // Fetch models and allow selection
  const spinner = ora('Fetching available models...').start();
  const models = await fetchModels();
  spinner.stop();

  if (models.length === 0) {
    logError('No models found. Please ensure Ollama is running and has models installed.');
    return false;
  }

  // Display models and allow selection
  logSuccess(`Found ${models.length} models`);

  // Format model information for display
  const modelChoices = models.map(model => {
    const size = model.size ? `(${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB)` : '';
    const modified = model.modified_at ? `- Last modified: ${new Date(model.modified_at).toLocaleString()}` : '';
    return {
      name: `${model.name} ${size} ${modified}`,
      value: model.name,
      checked: true // Default all models to be selected
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

  // Confirm selection
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

  // Report selected models
  const reportSpinner = ora(`Reporting selected models${!isRegistered ? ' (without gateway registration)' : ''}...`).start();

  try {
    logInfo('Reporting selected models...');
    // Choose the appropriate endpoint based on registration status
    const endpoint = 'http://localhost:8716/api/v1/models/report'  // Use registered endpoint if registered

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
      } else {
        logWarning('Models successfully reported without device registration. To report to the gateway, please register your device first using the "run" command with remote mode.');
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

// CLI Interface
class CLI {
  constructor() {
    this.program = program;
    this.setupCommands();
  }

  setupCommands() {
    // Main program setup
    this.program
      .name('sight-miner')
      .description('Sight AI Miner CLI - A tool for running and managing the Sight AI Miner')
      .version(CONFIG.version);

    // Run command
    this.program
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
            options = await selectMode();
          } else if (options.mode === 'remote') {
            // Validate required parameters for remote mode
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

    // Report models command (without registration)
    this.program
      .command('report-models')
      .description('Report selected models without device registration')
      .action(async (options) => {
        try {
          await handleReportModelsCommand(options);
        } catch (error) {
          handleError(error);
        }
      });

    // Status command
    this.program
      .command('status')
      .description('Check miner status')
      .action(() => {
        try {
          checkMinerStatus();
        } catch (error) {
          handleError(error);
        }
      });

    // Stop command
    this.program
      .command('stop')
      .description('Stop the miner')
      .action(async () => {
        try {
          await stopMiner();
        } catch (error) {
          handleError(error);
        }
      });

    // Logs command
    this.program
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

    // Update command
    this.program
      .command('update')
      .description('Update the miner to latest version')
      .option('-f, --force', 'Force update without confirmation')
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

          await updateMiner();
        } catch (error) {
          handleError(error);
        }
      });

    // Clean command
    this.program
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
            } catch (error) {
              logError(`Failed to clean containers: ${error.message}`);
              if (error.errorOutput) {
                logError(`Error details: ${error.errorOutput}`);
              }
              return false;
            }
          }
        } catch (error) {
          handleError(error);
        }
      });
  }

  showBanner() {
    console.log(chalk.blue(`
    ╔═══════════════════════════════════════╗
    ║           Sight AI Miner CLI          ║
    ║              v${CONFIG.version}                   ║
    ╚═══════════════════════════════════════╝`));
  }

  start() {
    this.showBanner();

    // If no args, show help
    if (!process.argv.slice(2).length) {
      this.program.outputHelp();
    } else {
      this.program.parse(process.argv);
    }
  }
}

// Start the CLI
const cli = new CLI();
cli.start();