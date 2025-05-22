import { CliUI } from '../utils/cli-ui';
import { logManager, LogEntry } from '../utils/logger';
import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class LogService {
  private ui = new CliUI();

  // 主日志菜单
  async showLogMenu(): Promise<void> {
    while (true) {
      this.ui.clear();
      this.ui.showTitle('📋 日志管理');

      // 获取日志统计
      const cliStats = logManager.getLogStats('cli');
      const backendStats = logManager.getLogStats('backend');
      const systemStats = logManager.getLogStats('system');

      console.log(chalk.cyan('\n📊 日志统计:'));
      console.log(`CLI 日志: ${cliStats.total} 条 (错误: ${cliStats.errors}, 警告: ${cliStats.warnings}, 今日: ${cliStats.today})`);
      console.log(`后台日志: ${backendStats.total} 条 (错误: ${backendStats.errors}, 警告: ${backendStats.warnings}, 今日: ${backendStats.today})`);
      console.log(`系统日志: ${systemStats.total} 条 (错误: ${systemStats.errors}, 警告: ${systemStats.warnings}, 今日: ${systemStats.today})`);

      const choices = [
        { name: '📱 查看 CLI 日志', value: 'cli' },
        { name: '🖥️ 查看后台服务日志', value: 'backend' },
        { name: '⚙️ 查看系统日志', value: 'system' },
        { name: '🔍 搜索日志', value: 'search' },
        { name: '📊 实时日志监控', value: 'monitor' },
        { name: '🗑️ 清理旧日志', value: 'clean' },
        { name: '📁 打开日志目录', value: 'open-dir' },
        { name: '🚪 返回', value: 'back' }
      ];

      try {
        const choice = await select({
          message: '选择操作：',
          choices: choices
        });

        switch (choice) {
          case 'cli':
          case 'backend':
          case 'system':
            await this.showLogViewer(choice);
            break;
          case 'search':
            await this.searchLogs();
            break;
          case 'monitor':
            await this.monitorLogs();
            break;
          case 'clean':
            await this.cleanLogs();
            break;
          case 'open-dir':
            await this.openLogDirectory();
            break;
          case 'back':
            return;
        }
      } catch (error: any) {
        if (error.name === 'ExitPromptError') {
          return;
        }
        this.ui.error(`操作失败: ${error.message}`);
        await this.ui.waitForKey();
      }
    }
  }

  // 日志查看器
  async showLogViewer(type: 'cli' | 'backend' | 'system'): Promise<void> {
    while (true) {
      this.ui.clear();
      this.ui.showTitle(`📋 ${this.getLogTypeName(type)}日志`);

      const choices = [
        { name: '📄 查看最新日志 (50条)', value: 'recent-50' },
        { name: '📄 查看最新日志 (100条)', value: 'recent-100' },
        { name: '📄 查看最新日志 (500条)', value: 'recent-500' },
        { name: '🔴 仅显示错误日志', value: 'errors' },
        { name: '🟡 仅显示警告日志', value: 'warnings' },
        { name: '📊 日志统计信息', value: 'stats' },
        { name: '💾 导出日志', value: 'export' },
        { name: '🚪 返回', value: 'back' }
      ];

      try {
        const choice = await select({
          message: '选择查看方式：',
          choices: choices
        });

        switch (choice) {
          case 'recent-50':
            await this.displayLogs(type, 50);
            break;
          case 'recent-100':
            await this.displayLogs(type, 100);
            break;
          case 'recent-500':
            await this.displayLogs(type, 500);
            break;
          case 'errors':
            await this.displayFilteredLogs(type, 'error');
            break;
          case 'warnings':
            await this.displayFilteredLogs(type, 'warn');
            break;
          case 'stats':
            await this.showLogStats(type);
            break;
          case 'export':
            await this.exportLogs(type);
            break;
          case 'back':
            return;
        }
      } catch (error: any) {
        if (error.name === 'ExitPromptError') {
          return;
        }
        this.ui.error(`操作失败: ${error.message}`);
        await this.ui.waitForKey();
      }
    }
  }

  // 显示日志
  async displayLogs(type: 'cli' | 'backend' | 'system', lines: number): Promise<void> {
    this.ui.startSpinner(`正在读取 ${this.getLogTypeName(type)}日志...`);

    try {
      const logs = logManager.readLogs(type, lines);
      this.ui.stopSpinner(true, `成功读取 ${logs.length} 条日志`);

      if (logs.length === 0) {
        this.ui.warning('没有找到日志记录');
        await this.ui.waitForKey();
        return;
      }

      console.log(chalk.cyan(`\n📋 最新 ${logs.length} 条${this.getLogTypeName(type)}日志:`));
      console.log(chalk.gray('─'.repeat(80)));

      logs.forEach(log => {
        console.log(logManager.formatLogForDisplay(log));
      });

      console.log(chalk.gray('─'.repeat(80)));
      await this.ui.waitForKey();
    } catch (error: any) {
      this.ui.stopSpinner(false, `读取日志失败: ${error.message}`);
      await this.ui.waitForKey();
    }
  }

  // 显示过滤后的日志
  async displayFilteredLogs(type: 'cli' | 'backend' | 'system', level: 'error' | 'warn'): Promise<void> {
    this.ui.startSpinner(`正在读取${level === 'error' ? '错误' : '警告'}日志...`);

    try {
      const allLogs = logManager.readLogs(type, 500);
      const filteredLogs = allLogs.filter(log => log.level === level);
      this.ui.stopSpinner(true, `找到 ${filteredLogs.length} 条${level === 'error' ? '错误' : '警告'}日志`);

      if (filteredLogs.length === 0) {
        this.ui.success(`没有找到${level === 'error' ? '错误' : '警告'}日志`);
        await this.ui.waitForKey();
        return;
      }

      console.log(chalk.cyan(`\n📋 ${level === 'error' ? '错误' : '警告'}日志 (${filteredLogs.length} 条):`));
      console.log(chalk.gray('─'.repeat(80)));

      filteredLogs.forEach(log => {
        console.log(logManager.formatLogForDisplay(log));
      });

      console.log(chalk.gray('─'.repeat(80)));
      await this.ui.waitForKey();
    } catch (error: any) {
      this.ui.stopSpinner(false, `读取日志失败: ${error.message}`);
      await this.ui.waitForKey();
    }
  }

  // 搜索日志
  async searchLogs(): Promise<void> {
    try {
      const logType = await select({
        message: '选择要搜索的日志类型：',
        choices: [
          { name: '📱 CLI 日志', value: 'cli' },
          { name: '🖥️ 后台服务日志', value: 'backend' },
          { name: '⚙️ 系统日志', value: 'system' }
        ]
      });

      const query = await input({
        message: '输入搜索关键词：',
        validate: (input) => input.trim().length > 0 || '请输入搜索关键词'
      });

      this.ui.startSpinner(`正在搜索包含 "${query}" 的日志...`);

      const results = logManager.searchLogs(logType as 'cli' | 'backend' | 'system', query, 1000);
      this.ui.stopSpinner(true, `找到 ${results.length} 条匹配的日志`);

      if (results.length === 0) {
        this.ui.warning('没有找到匹配的日志');
        await this.ui.waitForKey();
        return;
      }

      console.log(chalk.cyan(`\n🔍 搜索结果 (关键词: "${query}", ${results.length} 条):`));
      console.log(chalk.gray('─'.repeat(80)));

      results.forEach(log => {
        const formatted = logManager.formatLogForDisplay(log);
        // 高亮搜索关键词
        const highlighted = formatted.replace(
          new RegExp(query, 'gi'),
          chalk.bgYellow.black(query)
        );
        console.log(highlighted);
      });

      console.log(chalk.gray('─'.repeat(80)));
      await this.ui.waitForKey();
    } catch (error: any) {
      if (error.name !== 'ExitPromptError') {
        this.ui.error(`搜索失败: ${error.message}`);
        await this.ui.waitForKey();
      }
    }
  }

  // 实时日志监控
  async monitorLogs(): Promise<void> {
    this.ui.info('🔄 实时日志监控 (按 Ctrl+C 停止)');
    this.ui.info('监控所有类型的新日志...\n');

    // 记录当前日志数量
    let lastCounts = {
      cli: logManager.readLogs('cli', 1).length,
      backend: logManager.readLogs('backend', 1).length,
      system: logManager.readLogs('system', 1).length
    };

    const monitor = setInterval(() => {
      try {
        ['cli', 'backend', 'system'].forEach(type => {
          const logs = logManager.readLogs(type as any, 10);
          const newCount = logs.length;

          if (newCount > lastCounts[type as keyof typeof lastCounts]) {
            const newLogs = logs.slice(lastCounts[type as keyof typeof lastCounts]);
            newLogs.forEach(log => {
              const prefix = chalk.blue(`[${this.getLogTypeName(type as any)}]`);
              console.log(`${prefix} ${logManager.formatLogForDisplay(log)}`);
            });
            lastCounts[type as keyof typeof lastCounts] = newCount;
          }
        });
      } catch (error) {
        // 忽略监控错误
      }
    }, 1000);

    // 监听退出信号
    const cleanup = () => {
      clearInterval(monitor);
      this.ui.info('\n📋 日志监控已停止');
    };

    process.once('SIGINT', cleanup);

    // 等待用户中断
    await new Promise<void>((resolve) => {
      const originalHandler = process.listeners('SIGINT');
      process.removeAllListeners('SIGINT');
      process.once('SIGINT', () => {
        cleanup();
        // 恢复原始处理器
        originalHandler.forEach(handler => {
          process.on('SIGINT', handler as any);
        });
        resolve();
      });
    });
  }

  // 显示日志统计
  async showLogStats(type: 'cli' | 'backend' | 'system'): Promise<void> {
    const stats = logManager.getLogStats(type);
    const logs = logManager.readLogs(type, 1000);

    // 按日期统计
    const dateStats: { [date: string]: number } = {};
    logs.forEach(log => {
      const date = log.timestamp.split('T')[0];
      dateStats[date] = (dateStats[date] || 0) + 1;
    });

    console.log(chalk.cyan(`\n📊 ${this.getLogTypeName(type)}日志统计:`));

    this.ui.showStatusBox('📈 总体统计', [
      { label: '总日志数', value: stats.total.toString() },
      { label: '错误数', value: stats.errors.toString(), status: stats.errors > 0 ? 'error' : 'success' },
      { label: '警告数', value: stats.warnings.toString(), status: stats.warnings > 0 ? 'warning' : 'success' },
      { label: '今日日志', value: stats.today.toString() }
    ]);

    if (Object.keys(dateStats).length > 0) {
      console.log(chalk.cyan('\n📅 按日期统计:'));
      Object.entries(dateStats)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 7)
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count} 条`);
        });
    }

    await this.ui.waitForKey();
  }

  // 导出日志
  async exportLogs(type: 'cli' | 'backend' | 'system'): Promise<void> {
    try {
      const lines = await input({
        message: '要导出多少条日志？',
        default: '100',
        validate: (input) => {
          const num = parseInt(input);
          return (!isNaN(num) && num > 0) || '请输入有效的数字';
        }
      });

      const exportPath = path.join(os.homedir(), 'Downloads', `sight-ai-${type}-logs-${new Date().toISOString().split('T')[0]}.txt`);

      this.ui.startSpinner('正在导出日志...');

      const logs = logManager.readLogs(type, parseInt(lines));
      const content = logs.map(log => logManager.formatLogForDisplay(log)).join('\n');

      fs.writeFileSync(exportPath, content);

      this.ui.stopSpinner(true, `日志已导出到: ${exportPath}`);
      await this.ui.waitForKey();
    } catch (error: any) {
      if (error.name !== 'ExitPromptError') {
        this.ui.error(`导出失败: ${error.message}`);
        await this.ui.waitForKey();
      }
    }
  }

  // 清理旧日志
  async cleanLogs(): Promise<void> {
    try {
      const confirmed = await confirm({
        message: '确定要清理旧日志文件吗？这将删除超过限制的日志文件。',
        default: false
      });

      if (confirmed) {
        this.ui.startSpinner('正在清理旧日志...');
        logManager.cleanOldLogs();
        this.ui.stopSpinner(true, '旧日志清理完成');
      }

      await this.ui.waitForKey();
    } catch (error: any) {
      if (error.name !== 'ExitPromptError') {
        this.ui.error(`清理失败: ${error.message}`);
        await this.ui.waitForKey();
      }
    }
  }

  // 打开日志目录
  async openLogDirectory(): Promise<void> {
    const logDir = path.join(os.homedir(), '.sightai', 'logs');

    try {
      const { spawn } = require('child_process');
      const platform = process.platform;

      if (platform === 'darwin') {
        spawn('open', [logDir]);
      } else if (platform === 'win32') {
        spawn('explorer', [logDir]);
      } else {
        spawn('xdg-open', [logDir]);
      }

      this.ui.success(`已打开日志目录: ${logDir}`);
    } catch (error: any) {
      this.ui.error(`无法打开目录: ${error.message}`);
      this.ui.info(`日志目录位置: ${logDir}`);
    }

    await this.ui.waitForKey();
  }

  // 获取日志类型名称
  private getLogTypeName(type: 'cli' | 'backend' | 'system'): string {
    switch (type) {
      case 'cli':
        return 'CLI';
      case 'backend':
        return '后台服务';
      case 'system':
        return '系统';
      default:
        return type;
    }
  }
}
