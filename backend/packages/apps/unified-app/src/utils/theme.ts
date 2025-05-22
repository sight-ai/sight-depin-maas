import chalk from 'chalk';

export interface Theme {
  primary: (text: string) => string;
  secondary: (text: string) => string;
  success: (text: string) => string;
  warning: (text: string) => string;
  error: (text: string) => string;
  info: (text: string) => string;
  muted: (text: string) => string;
  highlight: (text: string) => string;
  banner: (text: string) => string;
}

export const themes: Record<string, Theme> = {
  default: {
    primary: chalk.blue,
    secondary: chalk.cyan,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
    muted: chalk.grey,
    highlight: chalk.bold,
    banner: chalk.blue
  },

  minimal: {
    primary: chalk.white,
    secondary: chalk.gray,
    success: chalk.white,
    warning: chalk.white,
    error: chalk.white,
    info: chalk.white,
    muted: chalk.gray,
    highlight: chalk.bold,
    banner: chalk.white
  },

  colorful: {
    primary: chalk.magenta,
    secondary: chalk.cyan,
    success: chalk.greenBright,
    warning: chalk.yellowBright,
    error: chalk.redBright,
    info: chalk.blueBright,
    muted: chalk.gray,
    highlight: chalk.bold.underline,
    banner: chalk.magenta.bold
  }
};

export class ThemeManager {
  private currentTheme: Theme;

  constructor(themeName: string = 'default') {
    this.currentTheme = themes[themeName] || themes.default;
  }

  public setTheme(themeName: string): void {
    this.currentTheme = themes[themeName] || themes.default;
  }

  public get theme(): Theme {
    return this.currentTheme;
  }

  // 便捷方法
  public primary(text: string): string {
    return this.currentTheme.primary(text);
  }

  public secondary(text: string): string {
    return this.currentTheme.secondary(text);
  }

  public success(text: string): string {
    return this.currentTheme.success(text);
  }

  public warning(text: string): string {
    return this.currentTheme.warning(text);
  }

  public error(text: string): string {
    return this.currentTheme.error(text);
  }

  public info(text: string): string {
    return this.currentTheme.info(text);
  }

  public muted(text: string): string {
    return this.currentTheme.muted(text);
  }

  public highlight(text: string): string {
    return this.currentTheme.highlight(text);
  }

  public banner(text: string): string {
    return this.currentTheme.banner(text);
  }

  // 状态指示器
  public statusIcon(status: 'running' | 'stopped' | 'error' | 'warning'): string {
    switch (status) {
      case 'running':
        return this.success('🟢');
      case 'stopped':
        return this.error('🔴');
      case 'error':
        return this.error('❌');
      case 'warning':
        return this.warning('⚠️');
      default:
        return '⚪';
    }
  }

  // 进度条
  public progressBar(current: number, total: number, width: number = 20): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return this.primary(`[${bar}] ${percentage}%`);
  }

  // 分隔线
  public separator(char: string = '═', length: number = 50): string {
    return this.muted(char.repeat(length));
  }

  // 框架
  public box(content: string[], title?: string): string {
    const maxLength = Math.max(...content.map(line => line.length));
    const width = Math.max(maxLength + 4, title ? title.length + 4 : 0);

    let result = this.primary('╔' + '═'.repeat(width - 2) + '╗\n');

    if (title) {
      const padding = Math.floor((width - title.length - 2) / 2);
      result += this.primary('║') + ' '.repeat(padding) + this.highlight(title) +
                ' '.repeat(width - title.length - padding - 2) + this.primary('║\n');
      result += this.primary('╠' + '═'.repeat(width - 2) + '╣\n');
    }

    content.forEach(line => {
      const padding = width - line.length - 2;
      result += this.primary('║') + line + ' '.repeat(padding) + this.primary('║\n');
    });

    result += this.primary('╚' + '═'.repeat(width - 2) + '╝');

    return result;
  }
}
