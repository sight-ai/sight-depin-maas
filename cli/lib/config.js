/**
 * 配置模块 - 存储所有配置常量
 */
const path = require('path');
const os = require('os');

// 从环境变量获取端口配置，如果不存在则使用默认值
const getMinerPort = () => {
  return process.env.SIGHT_MINER_PORT ? parseInt(process.env.SIGHT_MINER_PORT) : 3000;
};

const getWebuiPort = () => {
  return process.env.SIGHT_WEBUI_PORT ? parseInt(process.env.SIGHT_WEBUI_PORT) : 8080;
};

const getOllamaPort = () => {
  return process.env.OLLAMA_PORT ? parseInt(process.env.OLLAMA_PORT) : 11434;
};

const CONFIG = {
  version: '1.0.0',
  name: 'Sight AI Miner CLI',
  minDockerVersion: '20.10.0',
  minDockerComposeVersion: '2.0.0',
  ollamaPort: getOllamaPort(),
  ollamaTimeout: 5000,
  modelPullTimeout: 300000,
  maxRetries: 3,
  retryDelay: 5000,
  ports: {
    miner: getMinerPort(),
    webui: getWebuiPort(),
    ollama: getOllamaPort()
  },
  paths: {
    log: path.join(os.homedir(), '.sightai', 'logs'),
    cache: path.join(os.homedir(), '.sightai', 'cache'),
    config: path.join(os.homedir(), '.sightai', 'config'),
    dockerLogs: path.join(os.homedir(), '.sightai', 'docker-logs')
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

// 错误代码
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

module.exports = {
  CONFIG,
  ErrorCodes
};
