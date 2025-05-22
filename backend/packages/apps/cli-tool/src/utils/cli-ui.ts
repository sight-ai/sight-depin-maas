import chalk from 'chalk';
import ora, { Ora } from 'ora';
import Table from 'cli-table3';
import stringWidth from 'string-width';

export class CliUI {
  private spinner: Ora | null = null;

  // 日志方法
  info(message: string) {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string) {
    console.log(chalk.green('✅'), message);
  }

  error(message: string) {
    console.log(chalk.red('❌'), message);
  }

  warning(message: string) {
    console.log(chalk.yellow('⚠️'), message);
  }

  // 加载动画
  startSpinner(text: string) {
    this.spinner = ora(text).start();
  }

  updateSpinner(text: string) {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  stopSpinner(success: boolean = true, message?: string) {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }

  // 创建表格
  createTable(headers: string[], rows: string[][]) {
    const table = new Table({
      head: headers.map(h => chalk.cyan(h)),
      style: {
        head: [],
        border: ['grey']
      }
    });

    rows.forEach(row => table.push(row));
    return table.toString();
  }

  // 显示分隔线
  showSeparator() {
    console.log(chalk.grey('─'.repeat(60)));
  }

  // 显示标题
  showTitle(title: string) {
    console.log('\n' + chalk.bold.blue(title));
    console.log(chalk.blue('═'.repeat(title.length)));
  }

  // 显示状态框
  showStatusBox(title: string, items: { label: string; value: string; status?: 'success' | 'error' | 'warning' }[]) {
    console.log('\n' + chalk.bold(title));
    const boxWidth = 60;
    console.log('┌' + '─'.repeat(boxWidth - 2) + '┐');

    items.forEach(item => {
      let statusIcon = '';
      let valueColor = chalk.white;

      if (item.status === 'success') {
        statusIcon = '✅';
        valueColor = chalk.green;
      } else if (item.status === 'error') {
        statusIcon = '❌';
        valueColor = chalk.red;
      } else if (item.status === 'warning') {
        statusIcon = '⚠️';
        valueColor = chalk.yellow;
      } else {
        statusIcon = ' ';
      }

      // 计算实际显示宽度
      const iconWidth = stringWidth(statusIcon);
      const labelText = item.label;
      const valueText = item.value;
      const labelWidth = stringWidth(labelText);
      const valueWidth = stringWidth(valueText);

      // 计算内容总宽度：图标 + 空格 + 标签 + " : " + 值
      const contentWidth = iconWidth + 1 + labelWidth + 3 + valueWidth;
      const innerWidth = boxWidth - 4; // 减去 "│ " 和 " │"

      if (contentWidth <= innerWidth) {
        // 内容可以放在一行，右对齐填充空格
        const padding = innerWidth - contentWidth;
        const line = `│ ${statusIcon} ${chalk.cyan(labelText)} : ${valueColor(valueText)}${' '.repeat(padding)} │`;
        console.log(line);
      } else {
        // 内容太长，截断值部分
        const maxValueWidth = innerWidth - iconWidth - 1 - labelWidth - 3 - 3; // 减去 "..."
        const truncatedValue = valueText.length > maxValueWidth ?
          valueText.substring(0, maxValueWidth) + '...' : valueText;
        const finalValueWidth = stringWidth(truncatedValue);
        const finalContentWidth = iconWidth + 1 + labelWidth + 3 + finalValueWidth;
        const padding = innerWidth - finalContentWidth;
        const line = `│ ${statusIcon} ${chalk.cyan(labelText)} : ${valueColor(truncatedValue)}${' '.repeat(Math.max(0, padding))} │`;
        console.log(line);
      }
    });

    console.log('└' + '─'.repeat(boxWidth - 2) + '┘');
  }

  // 显示进度条
  showProgress(current: number, total: number, label: string) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 20);
    const empty = 20 - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.grey('░'.repeat(empty));
    console.log(`${label}: [${bar}] ${percentage}% (${current}/${total})`);
  }

  // 清屏
  clear() {
    console.clear();
  }

  // 等待用户按键
  async waitForKey(message: string = '按任意键继续...') {
    console.log(chalk.grey(message));
    process.stdin.setRawMode(true);
    return new Promise<void>((resolve) => {
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
      });
    });
  }
}
