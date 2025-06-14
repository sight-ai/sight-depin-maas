import chalk from 'chalk';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import boxen from 'boxen';
import Table from 'cli-table3';
import { 
  IUserInterface, 
  ISpinner, 
  MessageType, 
  BoxType, 
  TableData, 
  PromptQuestion 
} from '../abstractions/cli.interfaces';

/**
 * 用户界面服务 
 * 只负责CLI用户界面的显示和交互
 */
export class UserInterfaceService implements IUserInterface {
  private readonly enableColors: boolean;
  private readonly enableSpinners: boolean;

  constructor(
    enableColors: boolean = true,
    enableSpinners: boolean = true
  ) {
    this.enableColors = enableColors;
    this.enableSpinners = enableSpinners;
  }

  /**
   * 显示消息
   */
  showMessage(message: string, type: MessageType = MessageType.INFO): void {
    if (!this.enableColors) {
      console.log(message);
      return;
    }

    switch (type) {
      case MessageType.SUCCESS:
        console.log(chalk.green('✓'), message);
        break;
      case MessageType.ERROR:
        console.log(chalk.red('✗'), message);
        break;
      case MessageType.WARNING:
        console.log(chalk.yellow('⚠'), message);
        break;
      case MessageType.INFO:
      default:
        console.log(chalk.blue('ℹ'), message);
        break;
    }
  }

  /**
   * 显示表格
   */
  showTable(data: TableData): void {
    if (data.title) {
      this.showMessage(data.title, MessageType.INFO);
      console.log();
    }

    if (data.rows.length === 0) {
      this.showMessage('No data to display', MessageType.WARNING);
      return;
    }

    const table = new Table({
      head: this.enableColors ? data.headers.map(h => chalk.cyan(h)) : data.headers,
      style: {
        head: [],
        border: this.enableColors ? ['grey'] : []
      }
    });

    data.rows.forEach(row => {
      table.push(row);
    });

    console.log(table.toString());
  }

  /**
   * 显示加载动画
   */
  showSpinner(text: string): ISpinner {
    if (!this.enableSpinners) {
      console.log(text);
      return new NoOpSpinner();
    }

    const spinner = ora({
      text,
      color: 'cyan',
      spinner: 'dots'
    });

    return new SpinnerWrapper(spinner);
  }

  /**
   * 用户提示
   */
  async prompt(questions: PromptQuestion[]): Promise<any> {
    const inquirerQuestions = questions.map(q => ({
      type: q.type,
      name: q.name,
      message: q.message,
      choices: q.choices,
      default: q.default,
      validate: q.validate
    }));

    return inquirer.prompt(inquirerQuestions);
  }

  /**
   * 显示信息框
   */
  showBox(title: string, content: string, type: BoxType = BoxType.INFO): void {
    let borderColor = 'white';
    let titleColor = 'white';

    if (this.enableColors) {
      switch (type) {
        case BoxType.SUCCESS:
          borderColor = 'green';
          titleColor = 'green';
          break;
        case BoxType.ERROR:
          borderColor = 'red';
          titleColor = 'red';
          break;
        case BoxType.WARNING:
          borderColor = 'yellow';
          titleColor = 'yellow';
          break;
        case BoxType.INFO:
        default:
          borderColor = 'blue';
          titleColor = 'blue';
          break;
      }
    }

    const box = boxen(content, {
      title: this.enableColors ? chalk.hex(titleColor)(title) : title,
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: borderColor as any
    });

    console.log(box);
  }

  /**
   * 清屏
   */
  clear(): void {
    console.clear();
  }

  /**
   * 显示成功消息
   */
  success(message: string): void {
    this.showMessage(message, MessageType.SUCCESS);
  }

  /**
   * 显示错误消息
   */
  error(message: string): void {
    this.showMessage(message, MessageType.ERROR);
  }

  /**
   * 显示警告消息
   */
  warning(message: string): void {
    this.showMessage(message, MessageType.WARNING);
  }

  /**
   * 显示信息消息
   */
  info(message: string): void {
    this.showMessage(message, MessageType.INFO);
  }

  /**
   * 显示分隔线
   */
  showSeparator(char: string = '-', length: number = 50): void {
    const line = char.repeat(length);
    console.log(this.enableColors ? chalk.grey(line) : line);
  }

  /**
   * 显示标题
   */
  showTitle(title: string): void {
    this.showSeparator('=');
    console.log(this.enableColors ? chalk.bold.cyan(title) : title);
    this.showSeparator('=');
  }

  /**
   * 显示子标题
   */
  showSubtitle(subtitle: string): void {
    console.log(this.enableColors ? chalk.bold.white(subtitle) : subtitle);
    this.showSeparator('-', 30);
  }

  /**
   * 显示键值对
   */
  showKeyValue(key: string, value: string, indent: number = 0): void {
    const spaces = ' '.repeat(indent);
    const formattedKey = this.enableColors ? chalk.cyan(key) : key;
    const formattedValue = this.enableColors ? chalk.white(value) : value;
    console.log(`${spaces}${formattedKey}: ${formattedValue}`);
  }

  /**
   * 显示列表
   */
  showList(items: string[], bullet: string = '•', indent: number = 2): void {
    const spaces = ' '.repeat(indent);
    const coloredBullet = this.enableColors ? chalk.cyan(bullet) : bullet;
    
    items.forEach(item => {
      console.log(`${spaces}${coloredBullet} ${item}`);
    });
  }

  /**
   * 显示进度条（简单实现）
   */
  showProgress(current: number, total: number, width: number = 30): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    const progressBar = this.enableColors 
      ? chalk.green(filledBar) + chalk.grey(emptyBar)
      : filledBar + emptyBar;
    
    process.stdout.write(`\r[${progressBar}] ${percentage}% (${current}/${total})`);
    
    if (current === total) {
      console.log(); // 换行
    }
  }

  /**
   * 确认提示
   */
  async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    const answer = await this.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    
    return answer.confirmed;
  }

  /**
   * 输入提示
   */
  async input(message: string, defaultValue?: string): Promise<string> {
    const answer = await this.prompt([{
      type: 'input',
      name: 'value',
      message,
      default: defaultValue
    }]);
    
    return answer.value;
  }

  /**
   * 密码输入
   */
  async password(message: string): Promise<string> {
    const answer = await this.prompt([{
      type: 'password',
      name: 'password',
      message
    }]);
    
    return answer.password;
  }

  /**
   * 选择提示
   */
  async select(message: string, choices: Array<string | { name: string; value: any }>): Promise<any> {
    const answer = await this.prompt([{
      type: 'list',
      name: 'selected',
      message,
      choices
    }]);
    
    return answer.selected;
  }
}

/**
 * 加载动画包装器
 */
class SpinnerWrapper implements ISpinner {
  constructor(private readonly spinner: Ora) {}

  start(): void {
    this.spinner.start();
  }

  stop(): void {
    this.spinner.stop();
  }

  succeed(text?: string): void {
    this.spinner.succeed(text);
  }

  fail(text?: string): void {
    this.spinner.fail(text);
  }

  warn(text?: string): void {
    this.spinner.warn(text);
  }

  info(text?: string): void {
    this.spinner.info(text);
  }
}

/**
 * 无操作加载动画（用于禁用动画时）
 */
class NoOpSpinner implements ISpinner {
  start(): void {}
  stop(): void {}
  succeed(text?: string): void {
    if (text) console.log('✓', text);
  }
  fail(text?: string): void {
    if (text) console.log('✗', text);
  }
  warn(text?: string): void {
    if (text) console.log('⚠', text);
  }
  info(text?: string): void {
    if (text) console.log('ℹ', text);
  }
}
