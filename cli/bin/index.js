#!/usr/bin/env node
/**
 * Sight AI Miner CLI - 主入口文件
 */
const { program } = require('commander');
const chalk = require('chalk');
const { CONFIG } = require('../lib/config');
const { setupCommands } = require('../lib/commands');

// CLI界面
class CLI {
  constructor() {
    this.program = program;
    this.setupCommands();
  }

  setupCommands() {
    // 主程序设置
    this.program
      .name('sight-miner')
      .description('Sight AI Miner CLI - A tool for running and managing the Sight AI Miner')
      .version(CONFIG.version);

    // 设置所有命令
    setupCommands(this.program);
  }

  showBanner() {
    console.log(chalk.blue(`
    ╔═══════════════════════════════════════╗
    ║           Sight AI Miner CLI          ║
    ║              v${CONFIG.version}                   ║
    ╚═══════════════════════════════════════╝`));
  }

  start() {
    this.showBanner();

    // 如果没有参数，显示帮助
    if (!process.argv.slice(2).length) {
      this.program.outputHelp();
    } else {
      this.program.parse(process.argv);
    }
  }
}

// 启动CLI
const cli = new CLI();
cli.start();
