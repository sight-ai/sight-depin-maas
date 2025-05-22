#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { select, confirm } from '@inquirer/prompts';
import ora from 'ora';
import { configManager } from './utils/config';
import { ThemeManager } from './utils/theme';
import { performanceMonitor } from './utils/performance';
import * as os from 'os';

class SightAIUnified {
  private backendProcess: ChildProcess | null = null;
  private isBackendRunning = false;
  private themeManager: ThemeManager;
  private logDir: string;

  constructor() {
    this.setupSignalHandlers();

    // 初始化日志目录
    this.logDir = path.join(os.homedir(), '.sightai', 'logs');
    this.ensureLogDir();

    // 初始化主题管理器
    const theme = configManager.get('theme');
    this.themeManager = new ThemeManager(theme);

    // 启动性能监控
    performanceMonitor.collectMetrics();

    // 记录应用启动
    this.writeLog('info', 'Sight AI Unified Application started', 'UnifiedApp');
  }

  // 确保日志目录存在
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // 写入系统日志
  private writeLog(level: 'info' | 'warn' | 'error', message: string, source: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${level.toUpperCase().padEnd(5)} [${source}] ${message}`;
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `system-${date}.log`);

    try {
      fs.appendFileSync(logFile, logLine + '\n');
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  // 显示欢迎横幅
  showBanner() {
    const currentTime = new Date().toLocaleString('zh-CN');
    const healthScore = performanceMonitor.getHealthScore();
    const healthStatus = performanceMonitor.getHealthStatus();

    const healthIcon = healthStatus === 'excellent' ? '💚' :
                      healthStatus === 'good' ? '💛' :
                      healthStatus === 'fair' ? '🧡' : '❤️';

    const bannerContent = [];

    // console.log(this.themeManager.box(bannerContent, 'Sight AI 统一应用'));
  }

  // 检查后台服务是否运行
  async checkBackendStatus(showSpinner: boolean = false): Promise<boolean> {
    if (!showSpinner) {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://localhost:8716/api/v1/health', {
          method: 'GET',
          timeout: 3000
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }

    const spinner = ora({
      text: '检查后台服务状态...',
      color: 'cyan',
      spinner: 'dots'
    }).start();

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:8716/api/v1/health', {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        spinner.succeed('后台服务运行正常');
        return true;
      } else {
        spinner.fail('后台服务响应异常');
        return false;
      }
    } catch (error) {
      spinner.fail('后台服务未运行');
      return false;
    }
  }

  // 启动后台服务
  async startBackend(): Promise<boolean> {
    const spinner = ora({
      text: '正在启动后台服务...',
      color: 'blue',
      spinner: 'dots'
    }).start();

    return new Promise((resolve) => {
      // 找到项目根目录
      const projectRoot = this.findProjectRoot();
      if (!projectRoot) {
        spinner.fail('无法找到项目根目录');
        resolve(false);
        return;
      }

      spinner.text = '正在启动 NestJS 服务器...';

      // 启动 nx serve api-server
      this.backendProcess = spawn('npx', ['nx', 'serve', 'api-server'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let startupTimeout: NodeJS.Timeout;
      let isResolved = false;

      // 监听输出
      this.backendProcess.stdout?.on('data', (data) => {
        const output = data.toString();

        // 更新 spinner 状态
        if (output.includes('Starting Nest application')) {
          spinner.text = '正在初始化 Nest 应用...';
        } else if (output.includes('Database connected') || output.includes('LevelDB database connected')) {
          spinner.text = '数据库连接成功...';
        } else if (output.includes('Auto-reconnecting') || output.includes('Re-registration')) {
          spinner.text = '正在连接网关...';
        } else if (output.includes('Nest application successfully started')) {
          spinner.text = '应用启动成功...';
        }

        // 检查是否启动成功
        if (output.includes('Nest application successfully started') ||
            output.includes('started at port 8716')) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(startupTimeout);
            this.isBackendRunning = true;

            spinner.text = '等待服务完全就绪...';

            // 等待 2 秒让后台服务完全启动并停止输出日志
            setTimeout(() => {
              spinner.succeed('后台服务启动成功！');
              setTimeout(() => {
                resolve(true);
              }, 500);
            }, 2000);
          }
        }
      });

      this.backendProcess.stderr?.on('data', (data) => {
        const errorMsg = data.toString().trim();
        if (!errorMsg.includes('Starting inspector on localhost:9229 failed')) {
          spinner.warn(`警告: ${errorMsg}`);
        }
      });

      this.backendProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(startupTimeout);
          spinner.fail(`后台服务启动失败: ${error.message}`);
          resolve(false);
        }
      });

      this.backendProcess.on('exit', (code) => {
        this.isBackendRunning = false;
        if (!isResolved) {
          isResolved = true;
          clearTimeout(startupTimeout);
          spinner.fail(`后台服务异常退出 (代码: ${code})`);
          resolve(false);
        } else {
          console.log(chalk.yellow('⚠️ 后台服务已停止'));
        }
      });

      // 30秒超时
      startupTimeout = setTimeout(async () => {
        if (!isResolved) {
          isResolved = true;
          spinner.fail('后台服务启动超时 (30秒)');
          await this.stopBackend();
          resolve(false);
        }
      }, 30000);
    });
  }

  // 停止后台服务
  async stopBackend(): Promise<boolean> {
    if (!this.backendProcess) {
      console.log(chalk.yellow('⚠️ 后台服务未运行'));
      return true;
    }

    return new Promise((resolve) => {
      console.log(chalk.yellow('🛑 正在停止后台服务...'));

      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          console.log(chalk.red('❌ 停止后台服务超时，强制终止...'));
          this.backendProcess?.kill('SIGKILL');
          this.backendProcess = null;
          this.isBackendRunning = false;
          resolve(false);
        }
      }, 10000); // 10秒超时

      // 监听进程退出
      this.backendProcess.once('exit', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          this.backendProcess = null;
          this.isBackendRunning = false;

          if (code === 0 || code === null) {
            console.log(chalk.green('✅ 后台服务已正常停止'));
            resolve(true);
          } else {
            console.log(chalk.yellow(`⚠️ 后台服务已停止 (退出代码: ${code})`));
            resolve(true);
          }
        }
      });

      // 发送停止信号
      try {
        this.backendProcess.kill('SIGTERM');
      } catch (error: any) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          console.log(chalk.red(`❌ 停止后台服务失败: ${error.message}`));
          this.backendProcess = null;
          this.isBackendRunning = false;
          resolve(false);
        }
      }
    });
  }

  // 运行 CLI 工具
  async runCLI(command?: string): Promise<void> {
    const projectRoot = this.findProjectRoot();
    if (!projectRoot) {
      console.log(chalk.red('❌ 无法找到项目根目录'));
      await this.waitForKey();
      return;
    }
    console.log(projectRoot);
    const cliPath = path.join(projectRoot, 'packages/apps/cli-tool/dist/main.js');

    if (!fs.existsSync(cliPath)) {
      console.log(chalk.red('❌ CLI 工具未编译，请先编译 CLI 工具'));
      console.log(chalk.grey('提示: 运行以下命令编译 CLI 工具:'));
      console.log(chalk.grey('cd packages/apps/cli-tool && npx tsc -p tsconfig.app.json'));
      await this.waitForKey();
      return;
    }

    // 显示启动提示
    const commandName = command || '交互模式';
    console.log(chalk.blue(`\n🚀 启动 CLI 工具 (${commandName})...`));
    console.log(chalk.grey('提示: 完成操作后将自动返回主菜单\n'));

    return new Promise((resolve) => {
      const args = command ? [command] : [];
      const cliProcess = spawn('node', [cliPath, ...args], {
        stdio: 'inherit',
        cwd: projectRoot
      });

      cliProcess.on('exit', (code) => {
        // CLI 工具退出后的处理
        if (code === 0) {
          console.log(chalk.green('\n✅ CLI 操作完成'));
        } else if (code !== null) {
          console.log(chalk.yellow(`\n⚠️ CLI 退出 (代码: ${code})`));
        }

        console.log(chalk.blue('⏳ 正在返回主菜单...'));
        setTimeout(() => {
          resolve();
        }, 1500);
      });

      // 处理 Ctrl+C 信号
      cliProcess.on('SIGINT', () => {
        console.log(chalk.yellow('\n🔄 用户中断，返回主菜单...'));
        setTimeout(() => {
          resolve();
        }, 500);
      });

      // 处理错误
      cliProcess.on('error', (error) => {
        console.log(chalk.red(`\n❌ CLI 启动失败: ${error.message}`));
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    });
  }

  // 查找项目根目录
  findProjectRoot(): string | null {
    let currentDir = __dirname;

    // 向上查找，直到找到包含 nx.json 的目录
    while (currentDir !== path.dirname(currentDir)) {
      const nxConfigPath = path.join(currentDir, 'nx.json');
      if (fs.existsSync(nxConfigPath)) {
        console.log(chalk.green('✅ 项目根目录已找到'));
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    console.log(chalk.red('❌ 无法找到项目根目录'));
    return null;
  }

  // 主菜单
  async showMainMenu(): Promise<void> {
    while (true) {
      // 清屏以获得更好的用户体验
      console.clear();
      this.showBanner();

      // 检查后台服务状态
      const backendRunning = await this.checkBackendStatus();

      // 显示详细状态信息
      const metrics = await performanceMonitor.collectMetrics();

      console.log(this.themeManager.secondary('\n📊 系统状态:'));
      console.log(`后台服务: ${backendRunning ? this.themeManager.success('🟢 运行中 (端口 8716)') : this.themeManager.error('🔴 已停止')}`);

      if (backendRunning) {
        console.log(`数据库: ${this.themeManager.success('🟢 LevelDB 已连接')}`);
        console.log(`存储位置: ${this.themeManager.muted('~/.sightai/saito')}`);
        console.log(`内存使用: ${this.themeManager.info(performanceMonitor.formatBytes(metrics.memory.used))} / ${performanceMonitor.formatBytes(metrics.memory.total)} (${metrics.memory.percentage}%)`);
        console.log(`运行时间: ${this.themeManager.info(performanceMonitor.formatUptime(metrics.uptime))}`);
        console.log(`${this.themeManager.muted('💡 提示: 所有功能已可用')}`);
      } else {
        console.log(`${this.themeManager.muted('💡 提示: 启动后台服务以使用完整功能')}`);
      }

      // 显示快捷提示
      console.log(this.themeManager.muted('\n⌨️  快捷提示: 使用 ↑↓ 键选择，Enter 确认，Ctrl+C 退出'));

      const choices = [
        {
          name: backendRunning ? '🛑 停止后台服务' : '🚀 启动后台服务',
          value: backendRunning ? 'stop-backend' : 'start-backend'
        },
        {
          name: '🔗 网关注册管理',
          value: 'register',
          disabled: !backendRunning ? '需要先启动后台服务' : false
        },
        {
          name: '🤖 模型上报管理',
          value: 'model',
          disabled: !backendRunning ? '需要先启动后台服务' : false
        },
        {
          name: '📊 运行状态监控',
          value: 'status',
          disabled: !backendRunning ? '需要先启动后台服务' : false
        },
        {
          name: '🎛️ CLI 交互模式',
          value: 'cli-interactive',
          disabled: !backendRunning ? '需要先启动后台服务' : false
        },
        { name: '🔧 检查服务状态', value: 'check-status' },
        { name: '⚙️ 应用设置', value: 'settings' },
        { name: '📈 性能监控', value: 'performance' },
        { name: '📋 查看日志', value: 'logs' },
        { name: '🚪 退出', value: 'exit' }
      ];

      try {
        const action = await select({
          message: '选择操作：',
          choices: choices
        });

        switch (action) {
          case 'start-backend':
            this.writeLog('info', 'User initiated backend service startup', 'UnifiedApp');
            const startResult = await this.startBackend();
            if (startResult) {
              this.writeLog('info', 'Backend service started successfully', 'UnifiedApp');
              console.log(chalk.green('\n✅ 后台服务已启动，现在可以使用其他功能了！'));
              await this.waitForKey('按任意键继续...');
            } else {
              this.writeLog('error', 'Backend service startup failed', 'UnifiedApp');
            }
            break;

          case 'stop-backend':
            this.writeLog('info', 'User initiated backend service shutdown', 'UnifiedApp');
            const stopResult = await this.stopBackend();
            if (stopResult) {
              this.writeLog('info', 'Backend service stopped successfully', 'UnifiedApp');
              console.log(chalk.green('\n✅ 后台服务已成功停止！'));
            } else {
              this.writeLog('error', 'Backend service stop failed or timed out', 'UnifiedApp');
              console.log(chalk.yellow('\n⚠️ 后台服务停止可能不完整，请检查系统状态'));
            }
            await this.waitForKey('按任意键继续...');
            break;

          case 'register':
            this.writeLog('info', 'User accessed gateway registration management', 'UnifiedApp');
            console.log(chalk.blue('\n🔗 启动网关注册管理...'));
            await this.runCLI('register');
            break;

          case 'model':
            this.writeLog('info', 'User accessed model management', 'UnifiedApp');
            console.log(chalk.blue('\n🤖 启动模型管理...'));
            await this.runCLI('model');
            break;

          case 'status':
            this.writeLog('info', 'User accessed status monitoring', 'UnifiedApp');
            console.log(chalk.blue('\n📊 启动状态监控...'));
            await this.runCLI('status');
            break;

          case 'cli-interactive':
            console.log(chalk.blue('\n🎛️ 启动 CLI 交互模式...'));
            await this.runCLI();
            break;

          case 'check-status':
            await this.showDetailedStatus();
            break;

          case 'settings':
            await this.showSettings();
            break;

          case 'performance':
            await this.showPerformanceMonitor();
            break;

          case 'logs':
            console.log(this.themeManager.primary('\n📋 启动日志查看...'));
            await this.runCLI('logs');
            break;

          case 'exit':
            await this.handleExit();
            return;
        }
      } catch (error: any) {
        if (error.name === 'ExitPromptError') {
          await this.handleExit();
          return;
        }
        console.log(chalk.red('❌ 操作失败:'), error.message);
        await this.waitForKey('按任意键继续...');
      }
    }
  }

  // 显示详细状态
  async showDetailedStatus(): Promise<void> {
    console.log(chalk.blue('\n🔧 正在检查系统状态...'));

    const backendRunning = await this.checkBackendStatus(true);

    console.log(chalk.cyan('\n📋 详细状态报告:'));
    console.log('═'.repeat(50));

    // 后台服务状态
    console.log(chalk.bold('\n🚀 后台服务:'));
    console.log(`  状态: ${backendRunning ? chalk.green('✅ 运行中') : chalk.red('❌ 已停止')}`);
    console.log(`  端口: ${chalk.grey('8716')}`);
    console.log(`  健康检查: ${backendRunning ? chalk.green('✅ 正常') : chalk.red('❌ 失败')}`);

    // 数据库状态
    console.log(chalk.bold('\n💾 数据库:'));
    console.log(`  类型: ${chalk.grey('LevelDB')}`);
    console.log(`  位置: ${chalk.grey('~/.sightai/saito')}`);
    console.log(`  状态: ${backendRunning ? chalk.green('✅ 已连接') : chalk.grey('⚪ 未知')}`);

    // 网络状态
    console.log(chalk.bold('\n🌐 网络:'));
    console.log(`  API 端口: ${chalk.grey('8716')}`);
    console.log(`  Ollama 端口: ${chalk.grey('11434')}`);

    // 文件状态
    console.log(chalk.bold('\n📁 文件状态:'));
    const projectRoot = this.findProjectRoot();
    if (projectRoot) {
      const cliPath = path.join(projectRoot, 'packages/apps/cli-tool/dist/main.js');
      const unifiedPath = path.join(projectRoot, 'packages/apps/unified-app/dist/main.js');

      console.log(`  CLI 工具: ${fs.existsSync(cliPath) ? chalk.green('✅ 已编译') : chalk.red('❌ 未编译')}`);
      console.log(`  统一应用: ${fs.existsSync(unifiedPath) ? chalk.green('✅ 已编译') : chalk.red('❌ 未编译')}`);
      console.log(`  项目根目录: ${chalk.grey(projectRoot)}`);
    } else {
      console.log(`  项目根目录: ${chalk.red('❌ 未找到')}`);
    }

    // 进程状态
    console.log(chalk.bold('\n⚙️ 进程状态:'));
    console.log(`  统一应用 PID: ${chalk.grey(process.pid)}`);
    console.log(`  后台服务进程: ${this.backendProcess ? chalk.green('✅ 运行中') : chalk.grey('⚪ 未启动')}`);

    console.log('\n' + '═'.repeat(50));

    await this.waitForKey();
  }

  // 显示设置菜单
  async showSettings(): Promise<void> {
    console.log(this.themeManager.primary('\n⚙️ 应用设置'));
    console.log(this.themeManager.separator());

    const config = configManager.load();

    const settingChoices = [
      { name: `🎨 主题设置 (当前: ${config.theme})`, value: 'theme' },
      { name: `🚀 自动启动后台 (当前: ${config.autoStartBackend ? '开启' : '关闭'})`, value: 'auto-start' },
      { name: `📝 详细日志 (当前: ${config.showDetailedLogs ? '开启' : '关闭'})`, value: 'logs' },
      { name: `🔄 检查更新 (当前: ${config.checkUpdates ? '开启' : '关闭'})`, value: 'updates' },
      { name: '🔧 重置所有设置', value: 'reset' },
      { name: '🔙 返回主菜单', value: 'back' }
    ];

    try {
      const choice = await select({
        message: '选择设置项：',
        choices: settingChoices
      });

      switch (choice) {
        case 'theme':
          await this.changeTheme();
          break;
        case 'auto-start':
          configManager.set('autoStartBackend', !config.autoStartBackend);
          console.log(this.themeManager.success(`✅ 自动启动后台已${!config.autoStartBackend ? '开启' : '关闭'}`));
          break;
        case 'logs':
          configManager.set('showDetailedLogs', !config.showDetailedLogs);
          console.log(this.themeManager.success(`✅ 详细日志已${!config.showDetailedLogs ? '开启' : '关闭'}`));
          break;
        case 'updates':
          configManager.set('checkUpdates', !config.checkUpdates);
          console.log(this.themeManager.success(`✅ 检查更新已${!config.checkUpdates ? '开启' : '关闭'}`));
          break;
        case 'reset':
          const confirmReset = await confirm({
            message: '确定要重置所有设置吗？',
            default: false
          });
          if (confirmReset) {
            configManager.reset();
            console.log(this.themeManager.success('✅ 所有设置已重置'));
          }
          break;
        case 'back':
          return;
      }
    } catch (error: any) {
      if (error.name !== 'ExitPromptError') {
        console.log(this.themeManager.error('❌ 设置操作失败'));
      }
    }

    await this.waitForKey();
  }

  // 更改主题
  async changeTheme(): Promise<void> {
    const themeChoices = [
      { name: '🔵 默认主题 (蓝色系)', value: 'default' },
      { name: '⚪ 简约主题 (黑白)', value: 'minimal' },
      { name: '🌈 彩色主题 (多彩)', value: 'colorful' }
    ];

    try {
      const theme = await select({
        message: '选择主题：',
        choices: themeChoices
      });

      configManager.set('theme', theme as 'default' | 'minimal' | 'colorful');
      this.themeManager.setTheme(theme);
      console.log(this.themeManager.success(`✅ 主题已切换为: ${theme}`));
    } catch (error: any) {
      if (error.name !== 'ExitPromptError') {
        console.log(this.themeManager.error('❌ 主题切换失败'));
      }
    }
  }

  // 显示性能监控
  async showPerformanceMonitor(): Promise<void> {
    console.log(this.themeManager.primary('\n📈 性能监控'));
    console.log(this.themeManager.separator());

    const metrics = await performanceMonitor.collectMetrics();
    const avgMetrics = performanceMonitor.getAverageMetrics(5);
    const healthScore = performanceMonitor.getHealthScore();
    const healthStatus = performanceMonitor.getHealthStatus();

    // 当前性能指标
    console.log(this.themeManager.highlight('\n📊 当前性能:'));
    console.log(`  内存使用: ${this.themeManager.info(performanceMonitor.formatBytes(metrics.memory.used))} / ${performanceMonitor.formatBytes(metrics.memory.total)}`);
    console.log(`  内存百分比: ${this.themeManager.progressBar(metrics.memory.percentage, 100)}`);
    console.log(`  CPU 使用率: ${this.themeManager.progressBar(metrics.cpu.usage, 100)}`);
    console.log(`  CPU 核心数: ${this.themeManager.info(metrics.cpu.cores.toString())}`);
    console.log(`  运行时间: ${this.themeManager.info(performanceMonitor.formatUptime(metrics.uptime))}`);
    const statusIcon = metrics.backendStatus === 'running' ? 'running' :
                      metrics.backendStatus === 'stopped' ? 'stopped' : 'warning';
    console.log(`  后台服务: ${this.themeManager.statusIcon(statusIcon)} ${metrics.backendStatus}`);
    if (metrics.responseTime) {
      console.log(`  响应时间: ${this.themeManager.info(metrics.responseTime + 'ms')}`);
    }

    // 平均性能指标
    if (avgMetrics) {
      console.log(this.themeManager.highlight('\n📈 5分钟平均:'));
      console.log(`  平均内存使用: ${this.themeManager.progressBar(avgMetrics.memory?.percentage || 0, 100)}`);
      console.log(`  平均CPU使用: ${this.themeManager.progressBar(avgMetrics.cpu?.usage || 0, 100)}`);
      if (avgMetrics.responseTime) {
        console.log(`  平均响应时间: ${this.themeManager.info(Math.round(avgMetrics.responseTime) + 'ms')}`);
      }
    }

    // 健康评分
    console.log(this.themeManager.highlight('\n💚 系统健康:'));
    console.log(`  健康评分: ${this.themeManager.progressBar(healthScore, 100)}`);
    console.log(`  健康状态: ${this.themeManager.statusIcon(healthStatus === 'excellent' ? 'running' : healthStatus === 'poor' ? 'error' : 'warning')} ${healthStatus.toUpperCase()}`);

    console.log('\n' + this.themeManager.separator());
    await this.waitForKey();
  }

  // 等待用户按键
  async waitForKey(message: string = '按任意键继续...'): Promise<void> {
    console.log(chalk.grey(`\n${message}`));
    return new Promise<void>((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
  }

  // 处理退出
  async handleExit(): Promise<void> {
    if (this.isBackendRunning) {
      const shouldStop = await confirm({
        message: '后台服务正在运行，是否停止后退出？',
        default: true
      });

      if (shouldStop) {
        console.log(chalk.blue('正在停止后台服务...'));
        await this.stopBackend();
      }
    }

    console.log(chalk.blue('👋 感谢使用 Sight AI！'));
    process.exit(0);
  }

  // 设置信号处理器
  setupSignalHandlers() {
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n🛑 收到中断信号...'));
      await this.handleExit();
    });

    process.on('SIGTERM', async () => {
      console.log(chalk.yellow('\n\n🛑 收到终止信号...'));
      await this.handleExit();
    });
  }
}

// 主程序
const program = new Command();

program
  .name('sight-ai')
  .description('Sight AI 统一应用 - 后台服务 + CLI 工具')
  .version('1.0.0');

// 交互模式（默认）
program
  .command('interactive', { isDefault: true })
  .description('启动交互式管理界面')
  .action(async () => {
    const app = new SightAIUnified();
    await app.showMainMenu();
  });

// 直接启动后台
program
  .command('backend')
  .description('直接启动后台服务')
  .action(async () => {
    const app = new SightAIUnified();
    console.log(chalk.blue('🚀 直接启动模式'));
    const success = await app.startBackend();
    if (success) {
      console.log(chalk.green('✅ 后台服务运行中，按 Ctrl+C 停止'));
      // 保持进程运行
      process.stdin.resume();
    } else {
      process.exit(1);
    }
  });

// CLI 模式
program
  .command('cli [command]')
  .description('直接运行 CLI 命令')
  .action(async (command) => {
    const app = new SightAIUnified();
    await app.runCLI(command);
  });

// 解析命令行参数
program.parse(process.argv);
