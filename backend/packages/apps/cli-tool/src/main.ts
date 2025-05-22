#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommand } from './commands/register.command';
import { modelCommand } from './commands/model.command';
import { statusCommand } from './commands/status.command';
import { logCommand } from './commands/log.command';

const program = new Command();

// 显示欢迎横幅
function showBanner() {
  console.log(chalk.blue(`
╔═══════════════════════════════════════════════════════════╗
║                  Sight AI 交互式 CLI 工具                  ║
║                        v1.0.0                            ║
╠═══════════════════════════════════════════════════════════╣
║  功能：                                                   ║
║  • 🔗 网关注册管理                                        ║
║  • 🤖 模型上报管理                                        ║
║  • 📊 运行状态监控                                        ║
║  • 📋 日志查看管理                                        ║
╚═══════════════════════════════════════════════════════════╝
  `));
}

// 主程序配置
program
  .name('sight-cli')
  .description('Sight AI 交互式 CLI 工具 - 网关注册、模型管理、状态监控')
  .version('1.0.0')
  .hook('preAction', () => {
    showBanner();
  });

// 注册命令
program.addCommand(registerCommand);
program.addCommand(modelCommand);
program.addCommand(statusCommand);
program.addCommand(logCommand);

// 如果没有参数，显示帮助并退出
if (!process.argv.slice(2).length) {
  showBanner();
  program.outputHelp();
  process.exit(0);
}

// 解析命令行参数
program.parse(process.argv);
