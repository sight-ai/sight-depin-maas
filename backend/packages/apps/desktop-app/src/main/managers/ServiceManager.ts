import { join } from 'path';
import { existsSync } from 'fs';
import { app } from 'electron';
import { LogManager } from './LogManager';

interface BackendService {
  instance: any;
  port: number;
  isRunning: boolean;
}

interface Libp2pService {
  instance: any;
  port: number;
  isRunning: boolean;
}

export class ServiceManager {
  private backendService: BackendService = {
    instance: null,
    port: 8716,
    isRunning: false,
  };
  
  private libp2pService: Libp2pService = {
    instance: null,
    port: 4010,
    isRunning: false,
  };
  
  private isDev: boolean;
  private logger: LogManager;

  constructor(logger: LogManager, isDev: boolean = false) {
    this.logger = logger;
    this.isDev = isDev;
  }

  public async startAllServices(): Promise<void> {
    try {
      this.logger.log('Starting all services...');
      
      // 先启动后端服务，等待完全启动
      await this.startBackendService();
      this.logger.log('Backend service started, now starting libp2p service...');
      
      // 然后启动libp2p服务
      await this.startLibp2pService();
      this.logger.log('All services startup completed');
      
    } catch (error) {
      this.logger.log(`Error during services initialization: ${error}`, 'ERROR');
      throw error;
    }
  }

  public async stopAllServices(): Promise<void> {
    this.logger.log('Stopping all services...');
    await this.stopLibp2pService();
    this.stopBackendService();
  }

  public async restartAllServices(): Promise<void> {
    this.logger.log('Restarting all services...');
    await this.stopAllServices();

    setTimeout(async () => {
      try {
        await this.startAllServices();
      } catch (error) {
        this.logger.log(`Error restarting services: ${error}`, 'ERROR');
        throw error;
      }
    }, 2000);
  }

  public getBackendStatus() {
    return {
      isRunning: this.backendService.isRunning,
      port: this.backendService.port,
    };
  }

  private async startBackendService(): Promise<void> {
    if (this.backendService.isRunning) {
      this.logger.log('Backend service is already running');
      return;
    }

    try {
      const backendPath = this.getBackendPath();
      if (!existsSync(backendPath)) {
        this.logger.log(`Backend service not found: ${backendPath}`, 'ERROR');
        throw new Error('Backend service not found. Please ensure the application is properly built.');
      }

      this.logger.log(`Starting backend service: ${backendPath}`);
      
      // 设置环境变量
      process.env['PORT'] = this.backendService.port.toString();

      // 使用 eval 来避免 webpack 的静态分析
      this.backendService.instance = eval('require')(backendPath);

      // 等待后端服务完全启动
      await this.waitForBackendReady();

      this.backendService.isRunning = true;
      this.logger.log('Backend service started successfully and is ready');

    } catch (error) {
      this.logger.log(`Failed to start backend service: ${error}`, 'ERROR');
      this.backendService.isRunning = false;
      this.backendService.instance = null;
      throw error;
    }
  }

  private async startLibp2pService(): Promise<void> {
    if (this.libp2pService.isRunning) {
      this.logger.log('LibP2P service is already running');
      return;
    }

    try {
      // 使用新的跨平台LibP2P启动器
      const LibP2PService = this.getLibP2PServiceClass();
      this.libp2pService.instance = new LibP2PService();

      this.logger.log('Starting libp2p service with cross-platform launcher...');

      await this.libp2pService.instance.start({
        nodePort: '15050',
        libp2pPort: this.libp2pService.port.toString(),
        apiPort: this.backendService.port.toString(),
        isGateway: false,
        bootstrapAddrs: "/ip4/34.84.180.62/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X,/ip4/192.168.0.107/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X,/ip4/192.168.1.2/tcp/15001/p2p/12D3KooWPjceQrSwdWXPyLLeABRXmuqt69Rg3sBYbU1Nft9HyQ6X,/ip4/34.84.180.62/tcp/15002/p2p/12D3KooWH3uVF6wv47WnArKHk5p6cvgCJEb74UTmxztmQDc298L3,/ip4/192.168.0.107/tcp/15002/p2p/12D3KooWH3uVF6wv47WnArKHk5p6cvgCJEb74UTmxztmQDc298L3,/ip4/192.168.1.2/tcp/15002/p2p/12D3KooWH3uVF6wv47WnArKHk5p6cvgCJEb74UTmxztmQDc298L3,/ip4/34.84.180.62/tcp/15003/p2p/12D3KooWQYhTNQdmr3ArTeUHRYzFg94BKyTkoWBDWez9kSCVe2Xo,/ip4/192.168.0.107/tcp/15003/p2p/12D3KooWQYhTNQdmr3ArTeUHRYzFg94BKyTkoWBDWez9kSCVe2Xo,/ip4/192.168.1.2/tcp/15003/p2p/12D3KooWQYhTNQdmr3ArTeUHRYzFg94BKyTkoWBDWez9kSCVe2Xo,/ip4/34.84.180.62/tcp/15004/p2p/12D3KooWLJtG8fd2hkQzTn96MrLvThmnNQjTUFZwGEsLRz5EmSzc,/ip4/192.168.0.107/tcp/15004/p2p/12D3KooWLJtG8fd2hkQzTn96MrLvThmnNQjTUFZwGEsLRz5EmSzc,/ip4/192.168.1.2/tcp/15004/p2p/12D3KooWLJtG8fd2hkQzTn96MrLvThmnNQjTUFZwGEsLRz5EmSzc,/ip4/34.84.180.62/tcp/15005/p2p/12D3KooWSHj3RRbBjD15g6wekV8y3mm57Pobmps2g2WJm6F67Lay,/ip4/192.168.0.107/tcp/15005/p2p/12D3KooWSHj3RRbBjD15g6wekV8y3mm57Pobmps2g2WJm6F67Lay,/ip4/192.168.1.2/tcp/15005/p2p/12D3KooWSHj3RRbBjD15g6wekV8y3mm57Pobmps2g2WJm6F67Lay,/ip4/34.84.180.62/tcp/15006/p2p/12D3KooWDMCQbZZvLgHiHntG1KwcHoqHPAxL37KvhgibWqFtpqUY,/ip4/192.168.0.107/tcp/15006/p2p/12D3KooWDMCQbZZvLgHiHntG1KwcHoqHPAxL37KvhgibWqFtpqUY,/ip4/192.168.1.2/tcp/15006/p2p/12D3KooWDMCQbZZvLgHiHntG1KwcHoqHPAxL37KvhgibWqFtpqUY,/ip4/34.84.180.62/tcp/15007/p2p/12D3KooWLnZUpcaBwbz9uD1XsyyHnbXUrJRmxnsMiRnuCmvPix67,/ip4/192.168.0.107/tcp/15007/p2p/12D3KooWLnZUpcaBwbz9uD1XsyyHnbXUrJRmxnsMiRnuCmvPix67,/ip4/192.168.1.2/tcp/15007/p2p/12D3KooWLnZUpcaBwbz9uD1XsyyHnbXUrJRmxnsMiRnuCmvPix67,/ip4/34.84.180.62/tcp/15008/p2p/12D3KooWQ8vrERR8bnPByEjjtqV6hTWehaf8TmK7qR1cUsyrPpfZ,/ip4/192.168.0.107/tcp/15008/p2p/12D3KooWQ8vrERR8bnPByEjjtqV6hTWehaf8TmK7qR1cUsyrPpfZ,/ip4/192.168.1.2/tcp/15008/p2p/12D3KooWQ8vrERR8bnPByEjjtqV6hTWehaf8TmK7qR1cUsyrPpfZ",
      });

      this.libp2pService.isRunning = true;
      this.logger.log('LibP2P service started successfully');

    } catch (error) {
      this.logger.log(`Failed to start libp2p service: ${error}`, 'ERROR');
      this.libp2pService.isRunning = false;
      this.libp2pService.instance = null;
      throw error;
    }
  }

  private stopBackendService(): void {
    if (this.backendService.instance && this.backendService.isRunning) {
      this.logger.log('Stopping backend service...');

      try {
        // 如果后端应用有 close 或 stop 方法，调用它
        if (typeof this.backendService.instance.close === 'function') {
          this.backendService.instance.close();
        } else if (typeof this.backendService.instance.stop === 'function') {
          this.backendService.instance.stop();
        }
      } catch (error) {
        this.logger.log(`Error stopping backend service: ${error}`, 'ERROR');
      }

      this.backendService.isRunning = false;
      this.backendService.instance = null;
    }
  }

  private async stopLibp2pService(): Promise<void> {
    if (this.libp2pService.instance && this.libp2pService.isRunning) {
      this.logger.log('Stopping libp2p service...');

      try {
        await this.libp2pService.instance.stop();
      } catch (error) {
        this.logger.log(`Error stopping libp2p service: ${error}`, 'ERROR');
      }

      this.libp2pService.isRunning = false;
      this.libp2pService.instance = null;
    }
  }

  private getBackendPath(): string {
    if (this.isDev) {
      // 开发模式：从工作目录的 dist 文件夹读取
      return join(process.cwd(), 'dist/packages/apps/api-server/main.js');
    } else {
      // 生产模式：从应用资源目录读取
      const resourcesPath = this.getResourcesPath();
      return join(resourcesPath, 'backend/main.js');
    }
  }

  private getResourcesPath(): string {
    if (app.isPackaged) {
      // 打包后的应用：resources 在 app.asar 同级目录
      return join(process.resourcesPath, 'app');
    } else {
      // 未打包的应用：从 dist/packages/apps/desktop-app/electron 到 packages/apps/desktop-app/resources
      const projectRoot = join(__dirname, '../../../../..');
      return join(projectRoot, 'packages/apps/desktop-app/resources');
    }
  }

  private async waitForBackendReady(): Promise<void> {
    const maxAttempts = 30; // 最多等待30秒
    const delay = 1000; // 每次检查间隔1秒

    this.logger.log('Waiting for backend service to be ready...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 检查后端服务是否响应
        const response = await this.checkBackendHealth();
        if (response) {
          this.logger.log(`Backend service is ready after ${attempt} attempts`);
          return;
        }
      } catch (error) {
        // 忽略连接错误，继续等待
      }

      this.logger.log(`Waiting for backend... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Backend service failed to start within timeout period');
  }

  private async checkBackendHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: this.backendService.port,
        path: '/healthz',
        method: 'GET',
        timeout: 2000,
      };

      const req = http.request(options, (res: any) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private getLibP2PServiceClass(): any {
    // 内联 LibP2P 服务类，避免外部模块加载问题
    const { spawn } = require('child_process');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    class LibP2PService {
      private process: any = null;
      private isRunning: boolean = false;
      private logFile: string = '';

      constructor() {
        this.setupLogging();
      }

      private setupLogging(): void {
        const homeDir = os.homedir();
        const logDir = path.join(homeDir, '.sightai', 'logs');

        // 确保日志目录存在
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        this.logFile = path.join(logDir, 'libp2p-service.log');
      }

      private log(message: string): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [LibP2P] ${message}\n`;

        try {
          fs.appendFileSync(this.logFile, logMessage);
          console.log(`[LibP2P] ${message}`);
        } catch (error) {
          console.error('Failed to write to log file:', error);
        }
      }

      async start(config: any): Promise<void> {
        if (this.isRunning) {
          this.log('LibP2P service is already running');
          return;
        }

        try {
          const binaryPath = this.getBinaryPath();
          this.log(`Starting LibP2P service with binary: ${binaryPath}`);

          if (!fs.existsSync(binaryPath)) {
            throw new Error(`LibP2P binary not found: ${binaryPath}`);
          }

          // 构建启动参数
          const args = [
            '--node-port', config.nodePort || '15050',
            '--libp2p-port', config.libp2pPort || '4010',
            '--api-port', config.apiPort || '8716',
            '--is-gateway', config.isGateway ? 'true' : 'false'
          ];

          this.log(`Starting with args: ${args.join(' ')}`);

          // 启动 P2P 服务进程
          this.process = spawn(binaryPath, args, {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
          });

          if (!this.process.pid) {
            throw new Error('Failed to start LibP2P process');
          }

          this.log(`LibP2P service started with PID: ${this.process.pid}`);

          // 设置输出处理
          this.process.stdout?.on('data', (data: Buffer) => {
            this.log(`STDOUT: ${data.toString().trim()}`);
          });

          this.process.stderr?.on('data', (data: Buffer) => {
            this.log(`STDERR: ${data.toString().trim()}`);
          });

          this.process.on('error', (error: Error) => {
            this.log(`Process error: ${error.message}`);
            this.isRunning = false;
          });

          this.process.on('exit', (code: number, signal: string) => {
            this.log(`Process exited with code ${code}, signal ${signal}`);
            this.isRunning = false;
            this.process = null;
          });

          this.isRunning = true;

          // 等待服务启动
          await this.waitForServiceReady();

        } catch (error) {
          this.log(`Failed to start LibP2P service: ${error}`);
          this.isRunning = false;
          this.process = null;
          throw error;
        }
      }

      async stop(): Promise<void> {
        if (!this.isRunning || !this.process) {
          this.log('LibP2P service is not running');
          return;
        }

        this.log('Stopping LibP2P service...');

        try {
          // 优雅关闭
          this.process.kill('SIGTERM');

          // 等待进程结束
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (this.process) {
                this.log('Force killing LibP2P process...');
                this.process.kill('SIGKILL');
              }
              resolve();
            }, 5000);

            this.process.on('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });

          this.isRunning = false;
          this.process = null;
          this.log('LibP2P service stopped successfully');

        } catch (error) {
          this.log(`Error stopping LibP2P service: ${error}`);
          throw error;
        }
      }

      private getBinaryPath(): string {
        const platform = os.platform();
        const arch = os.arch();

        // 映射Node.js架构名称到Go架构名称
        const archMap: Record<string, string> = {
          'x64': 'amd64',
          'arm64': 'arm64',
          'ia32': '386'
        };

        // 映射Node.js平台名称到Go平台名称
        const platformMap: Record<string, string> = {
          'darwin': 'darwin',
          'linux': 'linux',
          'win32': 'windows'
        };

        const goPlatform = platformMap[platform];
        const goArch = archMap[arch];
        const ext = platform === 'win32' ? '.exe' : '';

        if (!goPlatform || !goArch) {
          throw new Error(`不支持的平台: ${platform}/${arch}`);
        }

        // 获取二进制文件目录
        const libp2pDir = this.getLibp2pDir();

        // 尝试多种可能的二进制文件名
        const possibleNames = [
          `sight-libp2p-node-${goPlatform}-${goArch}${ext}`,
          `libp2p-node-service-${goPlatform}-${goArch}${ext}`,
          `sight-libp2p-node${ext}`,
          `main${ext}`
        ];

        let binaryPath = '';
        for (const name of possibleNames) {
          const testPath = path.join(libp2pDir, name);
          this.log(`Checking for binary at: ${testPath}`);
          if (fs.existsSync(testPath)) {
            binaryPath = testPath;
            this.log(`Found binary: ${binaryPath}`);
            break;
          }
        }

        if (!binaryPath) {
          throw new Error(`LibP2P binary not found. Checked: ${possibleNames.join(', ')}`);
        }

        return binaryPath;
      }

      private getLibp2pDir(): string {
        // 根据环境确定 libp2p 二进制文件目录
        if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
          // 开发环境：从项目源码目录
          return path.resolve(__dirname, '../../../../../packages/apps/desktop-app/libp2p-node-service');
        } else {
          // 生产环境：从资源目录
          const { app } = require('electron');
          if (app.isPackaged) {
            return path.join(process.resourcesPath, 'app', 'libp2p-binaries');
          } else {
            return path.resolve(__dirname, '../../../../../packages/apps/desktop-app/resources/libp2p-binaries');
          }
        }
      }

      private async waitForServiceReady(): Promise<void> {
        const maxAttempts = 30;
        const delay = 1000;

        this.log('Waiting for LibP2P service to be ready...');

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          if (!this.isRunning) {
            throw new Error('LibP2P service stopped during startup');
          }

          // 简单检查进程是否还在运行
          if (this.process && this.process.pid) {
            try {
              process.kill(this.process.pid, 0); // 检查进程是否存在
              this.log(`LibP2P service is ready after ${attempt} attempts`);
              return;
            } catch (error) {
              // 进程不存在
              this.log(`LibP2P process check failed: ${error}`);
            }
          }

          this.log(`Waiting for LibP2P service... (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        throw new Error('LibP2P service failed to start within timeout period');
      }
    }

    return LibP2PService;
  }
}
