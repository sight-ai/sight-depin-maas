#!/usr/bin/env node

/**
 * Electron 路径验证脚本
 * 用于验证开发和生产环境下的路径配置是否正确
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('🔍 Electron 路径配置验证\n');

// 模拟不同环境
const environments = [
  { name: '开发环境', isDev: true, isPackaged: false },
  { name: '生产环境（未打包）', isDev: false, isPackaged: false },
  { name: '生产环境（已打包）', isDev: false, isPackaged: true }
];

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

// 模拟 getResourcesPath 函数
function getResourcesPath(isPackaged) {
  if (isPackaged) {
    // 模拟打包后的路径
    return '/Applications/SightAI Desktop.app/Contents/Resources/app';
  } else {
    // 未打包的应用路径
    return path.join(projectRoot, 'packages/apps/desktop-app/resources');
  }
}

// 模拟 getBackendPath 函数
function getBackendPath(isDev, isPackaged) {
  if (isDev) {
    return path.join(projectRoot, 'dist/packages/apps/api-server/main.js');
  } else {
    const resourcesPath = getResourcesPath(isPackaged);
    return path.join(resourcesPath, 'backend/main.js');
  }
}

// 模拟 getLibp2pBinaryPath 函数
function getLibp2pBinaryPath(isDev, isPackaged) {
  const platform = os.platform();
  const arch = os.arch();
  
  const archMap = {
    'x64': 'amd64',
    'arm64': 'arm64',
    'ia32': '386'
  };
  
  const platformMap = {
    'darwin': 'darwin',
    'linux': 'linux',
    'win32': 'windows'
  };
  
  const goPlatform = platformMap[platform];
  const goArch = archMap[arch];
  const ext = platform === 'win32' ? '.exe' : '';
  
  if (isDev) {
    // 开发环境：从源码目录
    const libp2pDir = path.join(projectRoot, 'packages/apps/desktop-app/libp2p-node-service');
    return {
      dir: libp2pDir,
      possibleNames: [
        `sight-libp2p-node${ext}`,
        `main${ext}`,
        `sight-libp2p-node-${goPlatform}-${goArch}${ext}`
      ]
    };
  } else {
    // 生产环境：从资源目录
    const resourcesPath = getResourcesPath(isPackaged);
    const libp2pDir = path.join(resourcesPath, 'libp2p-binaries');
    return {
      dir: libp2pDir,
      possibleNames: [
        `sight-libp2p-node-${goPlatform}-${goArch}${ext}`
      ]
    };
  }
}

// 验证每个环境
environments.forEach(env => {
  console.log(`\n🌍 ${env.name}`);
  console.log('=' .repeat(50));
  
  // 1. 验证 API Server 路径
  console.log('\n📡 API Server 路径:');
  const backendPath = getBackendPath(env.isDev, env.isPackaged);
  verifyPath(backendPath, 'Backend Service');
  
  // 2. 验证 P2P 服务路径
  console.log('\n🔗 P2P 服务路径:');
  const libp2pInfo = getLibp2pBinaryPath(env.isDev, env.isPackaged);
  console.log(`📂 二进制目录: ${libp2pInfo.dir}`);
  
  let foundBinary = false;
  libp2pInfo.possibleNames.forEach(name => {
    const binaryPath = path.join(libp2pInfo.dir, name);
    const exists = verifyPath(binaryPath, `P2P Binary (${name})`);
    if (exists) foundBinary = true;
  });
  
  if (!foundBinary && !env.isPackaged) {
    console.log('⚠️  未找到 P2P 二进制文件，可能需要构建');
  }
  
  // 3. 验证资源目录
  console.log('\n📁 资源目录:');
  const resourcesPath = getResourcesPath(env.isPackaged);
  verifyPath(resourcesPath, 'Resources Directory');
  
  if (!env.isPackaged) {
    // 验证具体资源文件
    const backendResourcePath = path.join(resourcesPath, 'backend');
    verifyPath(backendResourcePath, 'Backend Resources');
    
    const libp2pResourcePath = path.join(resourcesPath, 'libp2p-binaries');
    verifyPath(libp2pResourcePath, 'LibP2P Resources');
    
    const launcherPath = path.join(resourcesPath, 'libp2p-launcher.js');
    verifyPath(launcherPath, 'LibP2P Launcher');
  }
});

// 验证数据目录配置
console.log('\n\n💾 数据目录配置');
console.log('=' .repeat(50));

const dataDir = process.env['SIGHTAI_DATA_DIR'];
let sightaiDir;

if (dataDir) {
  sightaiDir = dataDir;
  console.log(`🐳 Docker 环境数据目录: ${sightaiDir}`);
} else {
  const homeDir = os.homedir();
  sightaiDir = path.join(homeDir, '.sightai');
  console.log(`🏠 本地环境数据目录: ${sightaiDir}`);
}

// 验证数据目录结构
const dataDirs = [
  { path: sightaiDir, name: '主数据目录' },
  { path: path.join(sightaiDir, 'logs'), name: '日志目录' },
  { path: path.join(sightaiDir, 'config'), name: '配置目录' }
];

dataDirs.forEach(dir => {
  const exists = fs.existsSync(dir.path);
  const status = exists ? '✅' : '📁';
  console.log(`${status} ${dir.name}: ${dir.path}`);
  
  if (!exists) {
    console.log(`   ℹ️  目录不存在，运行时会自动创建`);
  }
});

// 验证构建输出
console.log('\n\n🏗️ 构建输出验证');
console.log('=' .repeat(50));

const buildPaths = [
  { path: path.join(projectRoot, 'dist/packages/apps/api-server'), name: 'API Server 构建输出' },
  { path: path.join(projectRoot, 'dist/packages/apps/api-server/main.js'), name: 'API Server 主文件' },
  { path: path.join(projectRoot, 'dist/packages/apps/desktop-app/electron'), name: 'Electron 构建输出' },
  { path: path.join(projectRoot, 'dist/packages/apps/desktop-app/electron/main.js'), name: 'Electron 主文件' }
];

buildPaths.forEach(item => {
  verifyPath(item.path, item.name);
});

console.log('\n\n📋 验证总结');
console.log('=' .repeat(50));
console.log('✅ = 文件/目录存在');
console.log('❌ = 文件/目录不存在');
console.log('📁 = 目录不存在但会自动创建');
console.log('⚠️  = 需要手动构建或配置');

console.log('\n💡 建议操作:');
console.log('1. 如果 API Server 文件不存在，运行: nx build api-server');
console.log('2. 如果 P2P 二进制文件不存在，运行: node packages/apps/desktop-app/scripts/build-libp2p-cross-platform.js');
console.log('3. 如果 Electron 文件不存在，运行: nx build-electron desktop-app');
console.log('4. 完整构建生产版本，运行: nx build-production desktop-app');
