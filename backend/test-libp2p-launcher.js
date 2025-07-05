#!/usr/bin/env node

// 测试LibP2P启动器
const path = require('path');

// 模拟Electron环境
const mockElectron = {
  app: {
    isPackaged: true,
    getPath: (name) => {
      if (name === 'userData') {
        return '/tmp/sightai-test';
      }
      return '/tmp';
    }
  }
};

// 设置全局变量
global.process.resourcesPath = path.join(__dirname, 'dist/packages/apps/desktop-app/release/mac-arm64/SightAI Desktop.app/Contents/Resources');

// 模拟require('electron')
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'electron') {
    return mockElectron;
  }
  return originalRequire.apply(this, arguments);
};

async function testLibP2PLauncher() {
  try {
    console.log('🔧 测试LibP2P启动器...');
    
    const launcherPath = path.join(__dirname, 'packages/apps/desktop-app/resources/libp2p-launcher.js');
    console.log('启动器路径:', launcherPath);
    
    const LibP2PService = require(launcherPath);
    const service = new LibP2PService();
    
    console.log('二进制文件路径:', service.getBinaryPath());
    
    // 检查二进制文件是否存在
    const fs = require('fs');
    const binaryPath = service.getBinaryPath();
    console.log('二进制文件存在:', fs.existsSync(binaryPath));
    
    if (fs.existsSync(binaryPath)) {
      console.log('文件权限:', fs.statSync(binaryPath).mode.toString(8));
    }
    
    console.log('✅ LibP2P启动器测试完成');
    
  } catch (error) {
    console.error('❌ LibP2P启动器测试失败:', error);
  }
}

testLibP2PLauncher();
