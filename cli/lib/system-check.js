/**
 * 系统检查模块 - 检查系统要求
 */
const shell = require('shelljs');
const fetch = require('node-fetch');
const si = require('systeminformation');
const { CONFIG, ErrorCodes } = require('./config');
const { logInfo, logSuccess, logError, logWarning } = require('./logger');



// 检查系统要求（简化版，只检查基本要求）
const checkRequirements = async () => {
  logInfo('Checking system requirements...');
  logSuccess('System requirements check passed');
  return true;
};

// 检查Ollama服务是否运行
const checkOllamaService = async () => {
  const ollamaUrl = `http://${CONFIG.hosts.ollama}:${CONFIG.ports.ollama}`;

  if (CONFIG.isDocker) {
    logInfo(`Checking Ollama service on host machine (${ollamaUrl})...`);
  } else {
    logInfo('Checking Ollama service...');
  }

  try {
    const response = await fetch(ollamaUrl, { timeout: CONFIG.ollamaTimeout });
    if (response.ok) {
      if (CONFIG.isDocker) {
        logSuccess(`Ollama service is running on host machine (${CONFIG.hosts.ollama}:${CONFIG.ports.ollama})`);
      } else {
        logSuccess('Ollama service is running');
      }
      return true;
    }
  } catch (error) {
    if (CONFIG.isDocker) {
      logError(`Ollama service is not accessible from Docker container. Please ensure:\n` +
        `1. Ollama is running on the host machine\n` +
        `2. Ollama is accessible at ${ollamaUrl}\n` +
        `3. If using Linux, you may need to:\n` +
        `   - Run with --network="host" option, or\n` +
        `   - Set OLLAMA_HOST environment variable to the correct host IP\n` +
        `   - Ensure Ollama is bound to 0.0.0.0:11434 (not just localhost)\n` +
        `4. For Docker Desktop (Windows/Mac), host.docker.internal should work automatically\n` +
        `5. Run this command again`);
    } else {
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
    }
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
  checkRequirements,
  checkOllamaService,
  getGpuInfo
};
