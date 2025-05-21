/**
 * 存储模块 - 处理配置和数据的持久化存储
 */
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config');
const { logInfo, logError } = require('./logger');

// 确保配置目录存在
const ensureConfigDir = () => {
  if (!fs.existsSync(CONFIG.paths.config)) {
    try {
      fs.mkdirSync(CONFIG.paths.config, { recursive: true });
      return true;
    } catch (error) {
      logError(`Failed to create config directory: ${error.message}`);
      return false;
    }
  }
  return true;
};

// 保存注册参数
const saveRegistrationParams = (params) => {
  if (!ensureConfigDir()) {
    return false;
  }

  const registrationFile = path.join(CONFIG.paths.config, 'registration.json');
  
  try {
    // 只保存必要的参数
    const dataToSave = {
      gatewayUrl: params.gatewayUrl,
      nodeCode: params.nodeCode,
      gatewayApiKey: params.gatewayApiKey,
      rewardAddress: params.rewardAddress,
      apiBasePath: params.apiBasePath,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(registrationFile, JSON.stringify(dataToSave, null, 2));
    logInfo('Registration parameters saved successfully');
    return true;
  } catch (error) {
    logError(`Failed to save registration parameters: ${error.message}`);
    return false;
  }
};

// 加载注册参数
const loadRegistrationParams = () => {
  const registrationFile = path.join(CONFIG.paths.config, 'registration.json');
  
  if (!fs.existsSync(registrationFile)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(registrationFile, 'utf8');
    const params = JSON.parse(data);
    return params;
  } catch (error) {
    logError(`Failed to load registration parameters: ${error.message}`);
    return null;
  }
};

// 检查是否有保存的注册参数
const hasRegistrationParams = () => {
  const registrationFile = path.join(CONFIG.paths.config, 'registration.json');
  return fs.existsSync(registrationFile);
};

module.exports = {
  saveRegistrationParams,
  loadRegistrationParams,
  hasRegistrationParams
};
