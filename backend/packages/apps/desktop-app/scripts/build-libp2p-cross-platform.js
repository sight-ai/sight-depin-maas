#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 支持的平台和架构组合
const platforms = [
  { os: 'darwin', arch: 'amd64', ext: '' },
  { os: 'darwin', arch: 'arm64', ext: '' },
  { os: 'linux', arch: 'amd64', ext: '' },
  { os: 'linux', arch: 'arm64', ext: '' },
  { os: 'windows', arch: 'amd64', ext: '.exe' },
  { os: 'windows', arch: 'arm64', ext: '.exe' }
];

const libp2pDir = path.join(__dirname, '../libp2p-node-service');
const binariesDir = path.join(__dirname, '../resources/libp2p-binaries');

// 确保二进制文件目录存在
if (!fs.existsSync(binariesDir)) {
  fs.mkdirSync(binariesDir, { recursive: true });
}

console.log('🔧 开始跨平台构建 libp2p 服务...');

// 构建所有平台的二进制文件
for (const platform of platforms) {
  const { os, arch, ext } = platform;
  const outputName = `sight-libp2p-node-${os}-${arch}${ext}`;
  const outputPath = path.join(binariesDir, outputName);
  
  console.log(`📦 构建 ${os}/${arch}...`);
  
  try {
    // 设置环境变量并构建
    const env = {
      ...process.env,
      GOOS: os,
      GOARCH: arch,
      CGO_ENABLED: '0' // 禁用CGO以确保静态链接
    };
    
    execSync(`go build -ldflags="-s -w" -o "${outputPath}" .`, {
      cwd: libp2pDir,
      env: env,
      stdio: 'inherit'
    });
    
    console.log(`✅ ${outputName} 构建完成`);
  } catch (error) {
    console.error(`❌ ${outputName} 构建失败:`, error.message);
    process.exit(1);
  }
}

// 创建平台检测和启动脚本
const launcherScript = `
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

class LibP2PService {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.logFile = '';
    this.setupLogging();
  }

  setupLogging() {
    const logDir = path.join(os.homedir(), '.sightai', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    this.logFile = path.join(logDir, \`libp2p-service-\${dateStr}.log\`);
    this.log('=== LibP2P Service Logger Initialized ===');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = \`[\${timestamp}] [\${level}] \${message}\`;
    console.log(logMessage);
    if (this.logFile) {
      fs.appendFileSync(this.logFile, logMessage + '\\n');
    }
  }

  getBinaryPath() {
    const platform = os.platform();
    const arch = os.arch();
    
    // 映射Node.js架构名称到Go架构名称
    const archMap = {
      'x64': 'amd64',
      'arm64': 'arm64',
      'ia32': '386'
    };
    
    // 映射Node.js平台名称到Go平台名称
    const platformMap = {
      'darwin': 'darwin',
      'linux': 'linux',
      'win32': 'windows'
    };
    
    const goPlatform = platformMap[platform];
    const goArch = archMap[arch];
    const ext = platform === 'win32' ? '.exe' : '';
    
    if (!goPlatform || !goArch) {
      throw new Error(\`不支持的平台: \${platform}/\${arch}\`);
    }
    
    const binaryName = \`sight-libp2p-node-\${goPlatform}-\${goArch}\${ext}\`;
    return path.join(__dirname, 'libp2p-binaries', binaryName);
  }

  async start(options = {}) {
    if (this.isRunning) {
      this.log('LibP2P 服务已在运行');
      return;
    }

    const binaryPath = this.getBinaryPath();

    // 检查二进制文件是否存在
    if (!fs.existsSync(binaryPath)) {
      this.log(\`LibP2P 二进制文件不存在: \${binaryPath}\`, 'ERROR');
      throw new Error(\`LibP2P 二进制文件不存在: \${binaryPath}\`);
    }

    this.log(\`启动 LibP2P 服务: \${binaryPath}\`);
    
    // 构建启动参数
    const args = [];
    if (options.nodePort) args.push('--node-port', options.nodePort);
    if (options.libp2pPort) args.push('--libp2p-port', options.libp2pPort);
    if (options.apiPort) args.push('--api-port', options.apiPort);
    if (options.isGateway !== undefined) args.push('--is-gateway', options.isGateway ? '1' : '0');
    if (options.bootstrapAddrs) args.push('--bootstrap-addrs', options.bootstrapAddrs);
    if (options.dataDir) args.push('--data-addr', options.dataDir);

    this.log(\`启动参数: \${args.join(' ')}\`);

    return new Promise((resolve, reject) => {
      this.process = spawn(binaryPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      this.process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        this.log(\`[STDOUT] \${output}\`);
      });

      this.process.stderr.on('data', (data) => {
        const output = data.toString().trim();
        this.log(\`[STDERR] \${output}\`, 'WARN');
      });

      this.process.on('error', (error) => {
        this.log(\`LibP2P 服务启动失败: \${error.message}\`, 'ERROR');
        this.isRunning = false;
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        this.log(\`LibP2P 服务退出，代码: \${code}, 信号: \${signal}\`, code === 0 ? 'INFO' : 'WARN');
        this.isRunning = false;
      });

      // 等待服务启动
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.isRunning = true;
          this.log('LibP2P 服务启动成功');
          resolve();
        } else {
          this.log('LibP2P 服务启动超时', 'ERROR');
          reject(new Error('LibP2P 服务启动超时'));
        }
      }, 3000);
    });
  }

  async stop() {
    if (!this.isRunning || !this.process) {
      this.log('LibP2P 服务未运行');
      return;
    }

    this.log('停止 LibP2P 服务...');

    return new Promise((resolve) => {
      this.process.on('exit', () => {
        this.isRunning = false;
        this.log('LibP2P 服务已停止');
        resolve();
      });

      // 优雅关闭
      this.process.kill('SIGTERM');
      this.log('发送 SIGTERM 信号到 LibP2P 服务');

      // 如果5秒后还没关闭，强制杀死
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.log('强制停止 LibP2P 服务', 'WARN');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: this.process ? this.process.pid : null
    };
  }
}

module.exports = LibP2PService;
`;

const launcherPath = path.join(__dirname, '../resources/libp2p-launcher.js');
fs.writeFileSync(launcherPath, launcherScript);

console.log('✅ 跨平台构建完成！');
console.log('📁 二进制文件位置:', binariesDir);
console.log('🚀 启动器脚本:', launcherPath);
