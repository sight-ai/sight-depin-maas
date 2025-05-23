import chalk from 'chalk';
import boxen from 'boxen';
import ora, { Ora } from 'ora';

/**
 * UI工具类 - 提供统一的界面元素和样式
 */
export class UIUtils {
  /**
   * 显示应用标题
   */
  static showTitle(): void {
    const title = `
  ███████╗██╗ ██████╗ ██╗  ██╗████████╗     █████╗ ██╗
  ██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝    ██╔══██╗██║
  ███████╗██║██║  ███╗███████║   ██║       ███████║██║
  ╚════██║██║██║   ██║██╔══██║   ██║       ██╔══██║██║
  ███████║██║╚██████╔╝██║  ██║   ██║       ██║  ██║██║
  ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝
    `;

    console.log(chalk.cyan(title));
    console.log(chalk.gray('           Command Line Interface for Sight AI Mining Platform'));
    console.log('');
  }

  /**
   * 显示成功消息
   */
  static success(message: string): void {
    console.log(chalk.green('✅ ' + message));
  }

  /**
   * 显示错误消息
   */
  static error(message: string): void {
    console.log(chalk.red('❌ ' + message));
  }

  /**
   * 显示警告消息
   */
  static warning(message: string): void {
    console.log(chalk.yellow('⚠️  ' + message));
  }

  /**
   * 显示信息消息
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ️  ' + message));
  }

  /**
   * 显示带框的重要信息
   */
  static showBox(title: string, content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: 'blue',
      success: 'green',
      warning: 'yellow',
      error: 'red'
    };

    const box = boxen(content, {
      title,
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: colors[type] as any
    });

    console.log(box);
  }

  /**
   * 创建加载动画
   */
  static createSpinner(text: string): Ora {
    return ora({
      text,
      spinner: 'dots',
      color: 'cyan'
    });
  }

  /**
   * 显示分隔线
   */
  static showSeparator(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * 显示节标题
   */
  static showSection(title: string): void {
    console.log('');
    console.log(chalk.bold.cyan(`📋 ${title}`));
    console.log(chalk.gray('─'.repeat(title.length + 4)));
  }

  /**
   * 显示列表项
   */
  static showListItem(index: number, title: string, description?: string): void {
    console.log(chalk.white(`${index}. ${chalk.bold(title)}`));
    if (description) {
      console.log(chalk.gray(`   ${description}`));
    }
  }

  /**
   * 显示键值对信息
   */
  static showKeyValue(key: string, value: string, indent: number = 0): void {
    const spaces = ' '.repeat(indent);
    console.log(`${spaces}${chalk.gray(key + ':')} ${chalk.white(value)}`);
  }

  /**
   * 清屏
   */
  static clear(): void {
    console.clear();
  }

  /**
   * 显示帮助提示
   */
  static showHelp(commands: Array<{ command: string; description: string }>): void {
    this.showSection('Available Commands');
    commands.forEach(({ command, description }) => {
      console.log(`  ${chalk.cyan(command.padEnd(20))} ${chalk.gray(description)}`);
    });
    console.log('');
  }
}
