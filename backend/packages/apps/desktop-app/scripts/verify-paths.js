#!/usr/bin/env node

/**
 * Electron 路径验证脚本
 * 用于验证开发和生产环境下的路径配置是否正确
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('🔍 Electron 路径配置验证\n');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '../../../..');

console.log(`📁 项目根目录: ${projectRoot}\n`);

// 验证函数
function verifyPath(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${description}: ${filePath}`);
  return exists;
}

// 验证关键路径
console.log('🔍 关键路径验证');
console.log('=' .repeat(50));

// 1. API Server 路径
console.log('\n📡 API Server:');
const apiServerDev = path.join(projectRoot, 'dist/packages/apps/api-server/main.js');
const apiServerProd = path.join(projectRoot, 'packages/apps/desktop-app/resources/backend/main.js');

verifyPath(apiServerDev, 'API Server (开发环境)');
verifyPath(apiServerProd, 'API Server (生产环境)');

// 2. P2P 服务
console.log('\n🔗 P2P 服务:');
const libp2pDev = path.join(projectRoot, 'packages/apps/desktop-app/libp2p-node-service');
const libp2pProd = path.join(projectRoot, 'packages/apps/desktop-app/resources/libp2p-binaries');

verifyPath(libp2pDev, 'P2P 服务目录 (开发环境)');
verifyPath(libp2pProd, 'P2P 服务目录 (生产环境)');

// 检查具体的二进制文件
const platform = os.platform();
const arch = os.arch();
const archMap = { 'x64': 'amd64', 'arm64': 'arm64', 'ia32': '386' };
const platformMap = { 'darwin': 'darwin', 'linux': 'linux', 'win32': 'windows' };
const goPlatform = platformMap[platform];
const goArch = archMap[arch];
const ext = platform === 'win32' ? '.exe' : '';

if (goPlatform && goArch) {
  const binaryName = `sight-libp2p-node-${goPlatform}-${goArch}${ext}`;
  const binaryPath = path.join(libp2pProd, binaryName);
  verifyPath(binaryPath, `P2P 二进制文件 (${binaryName})`);
  
  // 检查开发环境的二进制文件
  const devBinaryPath = path.join(libp2pDev, 'sight-libp2p-node');
  verifyPath(devBinaryPath, 'P2P 二进制文件 (开发环境)');
}

// 3. 构建输出
console.log('\n🏗️ 构建输出:');
const electronBuild = path.join(projectRoot, 'dist/packages/apps/desktop-app/electron/main.js');
const reactBuild = path.join(projectRoot, 'dist/packages/apps/desktop-app');

verifyPath(electronBuild, 'Electron 主进程构建');
verifyPath(reactBuild, 'React 应用构建');

// 4. 数据目录
console.log('\n💾 数据目录:');
const homeDir = os.homedir();
const sightaiDir = path.join(homeDir, '.sightai');
const logsDir = path.join(sightaiDir, 'logs');
const configDir = path.join(sightaiDir, 'config');

console.log(`📂 数据目录: ${sightaiDir}`);
console.log(`📂 日志目录: ${logsDir}`);
console.log(`📂 配置目录: ${configDir}`);

// 5. 资源文件
console.log('\n📁 资源文件:');
const resourcesDir = path.join(projectRoot, 'packages/apps/desktop-app/resources');
const backendResources = path.join(resourcesDir, 'backend');
const libp2pLauncher = path.join(resourcesDir, 'libp2p-launcher.js');

verifyPath(resourcesDir, '资源目录');
verifyPath(backendResources, '后端资源目录');
verifyPath(libp2pLauncher, 'LibP2P 启动器');

console.log('\n📋 验证总结');
console.log('=' .repeat(50));
console.log('✅ = 文件/目录存在');
console.log('❌ = 文件/目录不存在');

console.log('\n💡 建议操作:');
console.log('1. 如果 API Server 构建不存在: nx build api-server');
console.log('2. 如果 P2P 二进制不存在: node packages/apps/desktop-app/scripts/build-libp2p-cross-platform.js');
console.log('3. 如果 Electron 构建不存在: nx build-electron desktop-app');
console.log('4. 完整构建: nx build-production desktop-app');
