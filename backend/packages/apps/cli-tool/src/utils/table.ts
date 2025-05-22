import chalk from 'chalk';
import stringWidth from 'string-width';
import boxen from 'boxen';

export interface TableRow {
  [key: string]: string;
}

export interface TableOptions {
  title?: string;
  width?: number;
  padding?: number;
  borderStyle?: 'single' | 'double' | 'round' | 'bold';
  borderColor?: string;
}

export class AlignedTable {
  private rows: TableRow[] = [];
  private headers: string[] = [];
  private options: TableOptions;

  constructor(options: TableOptions = {}) {
    this.options = {
      width: 60,
      padding: 1,
      borderStyle: 'single',
      borderColor: 'gray',
      ...options
    };
  }

  public setHeaders(headers: string[]): void {
    this.headers = headers;
  }

  public addRow(row: TableRow): void {
    this.rows.push(row);
  }

  public addRows(rows: TableRow[]): void {
    this.rows.push(...rows);
  }

  public clear(): void {
    this.rows = [];
    this.headers = [];
  }

  // 计算字符串的实际显示宽度（处理中文和emoji）
  private getDisplayWidth(text: string): number {
    return stringWidth(text);
  }

  // 填充字符串到指定宽度
  private padString(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
    const displayWidth = this.getDisplayWidth(text);
    const padding = Math.max(0, width - displayWidth);
    
    switch (align) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      default:
        return text + ' '.repeat(padding);
    }
  }

  // 生成简单的状态表格
  public renderStatusTable(): string {
    if (this.rows.length === 0) return '';

    const { width = 60, padding = 1 } = this.options;
    const innerWidth = width - 4; // 减去边框宽度
    
    let result = '';
    
    // 顶部边框
    result += '┌' + '─'.repeat(width - 2) + '┐\n';
    
    // 渲染行
    for (const row of this.rows) {
      const keys = Object.keys(row);
      if (keys.length >= 2) {
        const label = keys[0];
        const value = keys[1];
        const labelText = row[label];
        const valueText = row[value];
        
        // 计算标签和值的宽度
        const labelWidth = this.getDisplayWidth(labelText);
        const valueWidth = this.getDisplayWidth(valueText);
        const totalContentWidth = labelWidth + valueWidth + 3; // 3 for " : "
        
        if (totalContentWidth <= innerWidth) {
          // 内容可以放在一行
          const spacePadding = innerWidth - totalContentWidth;
          const line = `│ ${labelText} : ${valueText}${' '.repeat(spacePadding)} │`;
          result += line + '\n';
        } else {
          // 内容太长，截断或换行
          const maxValueWidth = innerWidth - labelWidth - 5; // 5 for " │ " + " : "
          const truncatedValue = valueText.length > maxValueWidth ? 
            valueText.substring(0, maxValueWidth - 3) + '...' : valueText;
          const finalValueWidth = this.getDisplayWidth(truncatedValue);
          const spacePadding = innerWidth - labelWidth - finalValueWidth - 3;
          const line = `│ ${labelText} : ${truncatedValue}${' '.repeat(Math.max(0, spacePadding))} │`;
          result += line + '\n';
        }
      }
    }
    
    // 底部边框
    result += '└' + '─'.repeat(width - 2) + '┘';
    
    return result;
  }

  // 生成带标题的表格
  public renderWithTitle(title: string): string {
    const content = this.renderStatusTable();
    if (!content) return '';

    return boxen(content, {
      title: title,
      titleAlignment: 'left',
      padding: 0,
      margin: 0,
      borderStyle: this.options.borderStyle as any,
      borderColor: this.options.borderColor as any,
      width: this.options.width
    });
  }

  // 渲染简单的信息框
  public static renderInfoBox(title: string, content: string[], options: TableOptions = {}): string {
    const { width = 60 } = options;
    
    return boxen(content.join('\n'), {
      title: title,
      titleAlignment: 'center',
      padding: 1,
      margin: 0,
      borderStyle: 'round',
      borderColor: 'blue',
      width: width
    });
  }

  // 渲染状态指示器
  public static renderStatusIndicator(status: 'success' | 'warning' | 'error' | 'info', text: string): string {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    
    const colors = {
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      info: chalk.blue
    };
    
    return `${icons[status]} ${colors[status](text)}`;
  }

  // 渲染进度条
  public static renderProgressBar(current: number, total: number, width: number = 20, showPercentage: boolean = true): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const percentText = showPercentage ? ` ${percentage}%` : '';
    
    return `[${bar}]${percentText}`;
  }

  // 渲染分隔线
  public static renderSeparator(char: string = '═', length: number = 50): string {
    return chalk.gray(char.repeat(length));
  }
}

// 便捷函数
export function createStatusTable(title: string, data: { [key: string]: string }[], width: number = 60): string {
  const table = new AlignedTable({ width });
  
  for (const item of data) {
    table.addRow(item);
  }
  
  return table.renderWithTitle(title);
}

export function createSimpleBox(title: string, content: string[], width: number = 60): string {
  return AlignedTable.renderInfoBox(title, content, { width });
}
