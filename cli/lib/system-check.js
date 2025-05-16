/**
 * 系统检查模块 - 检查系统要求
 */
const shell = require('shelljs');
const fetch = require('node-fetch');
const si = require('systeminformation');
const { CONFIG, ErrorCodes } = require('./config');
const { logInfo, logSuccess, logError, logWarning } = require('./logger');

// 版本比较函数
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

// 检查Docker守护进程是否运行
const isDockerRunning = () => {
  try {
    const result = shell.exec('docker info', { silent: true });
    return result.code === 0;
  } catch (error) {
    return false;
  }
};

// 检查系统要求
const checkRequirements = async () => {
  logInfo('Checking system requirements...');

  // 检查Docker安装
  if (!shell.which('docker')) {
    logError('Docker is not installed. Please follow these steps:\n' +
      '1. Visit https://docs.docker.com/get-docker/\n' +
      '2. Download and install Docker for your operating system\n' +
      '3. Restart your computer after installation\n' +
      '4. Run this command again');
    return false;
  }

  // 检查Docker版本
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

  // 检查Docker Compose安装
  if (!shell.which('docker-compose')) {
    logError('Docker Compose is not installed. Please follow these steps:\n' +
      '1. Visit https://docs.docker.com/compose/install/\n' +
      '2. Follow the installation instructions for your operating system\n' +
      '3. Restart your terminal after installation\n' +
      '4. Run this command again');
    return false;
  }

  // 检查Docker Compose版本
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

  // 检查Docker守护进程是否运行
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

// 检查Ollama服务是否运行
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

// 获取GPU信息
const getGpuInfo = async () => {
  logInfo('Detecting GPU on system...');

  try {
    // 获取详细的系统信息
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

    // 处理Apple Silicon (M1/M2/M3)
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

    // 处理其他平台
    if (graphics.controllers && graphics.controllers.length > 0) {
      const mainGpu = graphics.controllers[0];

      // 确定GPU品牌
      if (mainGpu.vendor.toLowerCase().includes('nvidia')) {
        gpuInfo.brand = 'NVIDIA';
      } else if (mainGpu.vendor.toLowerCase().includes('amd')) {
        gpuInfo.brand = 'AMD';
      } else if (mainGpu.vendor.toLowerCase().includes('intel')) {
        gpuInfo.brand = 'Intel';
      }

      // 设置GPU型号
      gpuInfo.model = mainGpu.model || 'Unknown';

      // 确定GPU类型
      if (mainGpu.type) {
        gpuInfo.type = mainGpu.type;
      } else if (mainGpu.vendor.toLowerCase().includes('intel')) {
        gpuInfo.type = 'Integrated';
      } else {
        gpuInfo.type = 'Discrete';
      }

      // 获取内存信息
      if (mainGpu.memoryTotal) {
        gpuInfo.memory = `${Math.round(mainGpu.memoryTotal / 1024)}GB`;
      }

      // 记录详细信息
      logInfo(`Detected GPU Brand: ${gpuInfo.brand}`);
      logInfo(`Detected GPU Model: ${gpuInfo.model}`);
      logInfo(`GPU Type: ${gpuInfo.type}`);
      logInfo(`GPU Memory: ${gpuInfo.memory}`);

      return gpuInfo;
    } else {
      // 未检测到GPU，尝试获取CPU信息
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

module.exports = {
  versionGt,
  isDockerRunning,
  checkRequirements,
  checkOllamaService,
  getGpuInfo
};
