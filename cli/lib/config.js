/**
 * 配置模块 - 存储所有配置常量
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

// 检测是否在 Docker 容器中运行
const isRunningInDocker = () => {
  try {
    // 方法1: 检查 /.dockerenv 文件
    if (fs.existsSync('/.dockerenv')) {
      return true;
    }

    // 方法2: 检查 /proc/1/cgroup 文件
    if (fs.existsSync('/proc/1/cgroup')) {
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      if (cgroup.includes('docker') || cgroup.includes('containerd')) {
        return true;
      }
    }

    // 方法3: 检查环境变量
    if (process.env.DOCKER_CONTAINER === 'true') {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

// 获取 Ollama 主机地址
const getOllamaHost = () => {
  // 如果在 Docker 容器中，使用宿主机地址
  if (isRunningInDocker()) {
    // Docker Desktop 在 Windows/Mac 上使用 host.docker.internal
    // Linux 上可能需要使用 172.17.0.1 或其他网关地址
    if (process.platform === 'win32' || process.platform === 'darwin') {
      return 'host.docker.internal';
    } else {
      // Linux 环境下，尝试使用 Docker 网关地址
      return process.env.OLLAMA_HOST || 'host.docker.internal';
    }
  }

  // 非容器环境，使用 localhost
  return 'localhost';
};

// 从环境变量获取端口配置，如果不存在则使用默认值
const getOllamaPort = () => {
  return process.env.OLLAMA_PORT ? parseInt(process.env.OLLAMA_PORT) : 11434;
};

const CONFIG = {
  version: '1.0.0',
  name: 'Sight AI Miner CLI',
  ollamaHost: getOllamaHost(),
  ollamaPort: getOllamaPort(),
  ollamaTimeout: 5000,
  modelPullTimeout: 300000,
  maxRetries: 3,
  retryDelay: 5000,
  isDocker: isRunningInDocker(),
  ports: {
    ollama: getOllamaPort()
  },
  hosts: {
    ollama: getOllamaHost()
  },
  paths: {
    log: path.join(os.homedir(), '.sightai', 'logs'),
    cache: path.join(os.homedir(), '.sightai', 'cache'),
    config: path.join(os.homedir(), '.sightai', 'config')
  },
  urls: {
    gateway: 'https://sightai.io'
  }
};

// 错误代码
const ErrorCodes = {
  OLLAMA_NOT_RUNNING: 'OLLAMA_NOT_RUNNING',
  MODEL_PULL_FAILED: 'MODEL_PULL_FAILED',
  GPU_DETECTION_FAILED: 'GPU_DETECTION_FAILED',
  DEVICE_REGISTRATION_FAILED: 'DEVICE_REGISTRATION_FAILED',
  SERVICE_START_FAILED: 'SERVICE_START_FAILED'
};

module.exports = {
  CONFIG,
  ErrorCodes
};
