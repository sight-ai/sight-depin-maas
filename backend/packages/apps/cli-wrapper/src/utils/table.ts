import Table from 'cli-table3';
import chalk from 'chalk';

/**
 * 表格工具类 - 提供各种数据的表格展示
 */
export class TableUtils {
  /**
   * 显示模型列表表格
   */
  static showModelsTable(models: Array<{
    name: string;
    size: number;
    modified_at: string;
    details: {
      family?: string;
      parameter_size?: string;
      format?: string;
    };
  }>): void {
    const table = new Table({
      head: [
        chalk.cyan('Index'),
        chalk.cyan('Model Name'),
        chalk.cyan('Size'),
        chalk.cyan('Family'),
        chalk.cyan('Parameters'),
        chalk.cyan('Modified')
      ],
      colWidths: [8, 35, 12, 15, 12, 20],
      style: {
        head: [],
        border: ['gray']
      }
    });

    models.forEach((model, index) => {
      const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(2);
      const modifiedDate = new Date(model.modified_at).toLocaleDateString();
      
      table.push([
        chalk.white((index + 1).toString()),
        chalk.bold(model.name),
        chalk.yellow(`${sizeGB} GB`),
        chalk.green(model.details.family || 'Unknown'),
        chalk.blue(model.details.parameter_size || 'Unknown'),
        chalk.gray(modifiedDate)
      ]);
    });

    console.log(table.toString());
  }

  /**
   * 显示设备状态表格
   */
  static showDeviceStatusTable(deviceInfo: {
    deviceId: string;
    deviceName: string;
    gatewayAddress: string;
    rewardAddress: string;
    isRegistered: boolean;
    timestamp?: string;
  }): void {
    const table = new Table({
      style: {
        head: [],
        border: ['gray']
      }
    });

    table.push(
      [chalk.cyan('Device ID'), chalk.white(deviceInfo.deviceId)],
      [chalk.cyan('Device Name'), chalk.white(deviceInfo.deviceName)],
      [chalk.cyan('Gateway Address'), chalk.white(deviceInfo.gatewayAddress)],
      [chalk.cyan('Reward Address'), chalk.white(deviceInfo.rewardAddress)],
      [chalk.cyan('Status'), deviceInfo.isRegistered ? chalk.green('Registered') : chalk.red('Not Registered')],
    );

    if (deviceInfo.timestamp) {
      table.push([
        chalk.cyan('Registration Time'),
        chalk.gray(new Date(deviceInfo.timestamp).toLocaleString())
      ]);
    }

    console.log(table.toString());
  }

  /**
   * 显示模型上报状态表格
   */
  static showModelReportStatusTable(reportedModels: string[], savedModels: string[]): void {
    const allModels = Array.from(new Set([...reportedModels, ...savedModels]));
    
    if (allModels.length === 0) {
      console.log(chalk.gray('No models have been reported yet.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Model Name'),
        chalk.cyan('Current Session'),
        chalk.cyan('Saved to Storage')
      ],
      colWidths: [40, 18, 18],
      style: {
        head: [],
        border: ['gray']
      }
    });

    allModels.forEach(model => {
      const inSession = reportedModels.includes(model);
      const inStorage = savedModels.includes(model);
      
      table.push([
        chalk.white(model),
        inSession ? chalk.green('✓ Reported') : chalk.gray('✗ Not reported'),
        inStorage ? chalk.green('✓ Saved') : chalk.gray('✗ Not saved')
      ]);
    });

    console.log(table.toString());
  }

  /**
   * 显示命令帮助表格
   */
  static showCommandsTable(commands: Array<{
    command: string;
    description: string;
    usage?: string;
  }>): void {
    const table = new Table({
      head: [
        chalk.cyan('Command'),
        chalk.cyan('Description'),
        chalk.cyan('Usage')
      ],
      colWidths: [25, 40, 35],
      style: {
        head: [],
        border: ['gray']
      }
    });

    commands.forEach(({ command, description, usage }) => {
      table.push([
        chalk.bold.white(command),
        chalk.gray(description),
        chalk.yellow(usage || `sight ${command}`)
      ]);
    });

    console.log(table.toString());
  }

  /**
   * 显示简单的键值对表格
   */
  static showKeyValueTable(data: Record<string, string>): void {
    const table = new Table({
      style: {
        head: [],
        border: ['gray']
      }
    });

    Object.entries(data).forEach(([key, value]) => {
      table.push([chalk.cyan(key), chalk.white(value)]);
    });

    console.log(table.toString());
  }

  /**
   * 显示选择列表表格
   */
  static showSelectionTable(items: Array<{
    index: number;
    name: string;
    description?: string;
    size?: string;
  }>): void {
    const table = new Table({
      head: [
        chalk.cyan('Index'),
        chalk.cyan('Name'),
        chalk.cyan('Description'),
        chalk.cyan('Size')
      ],
      colWidths: [8, 35, 30, 12],
      style: {
        head: [],
        border: ['gray']
      }
    });

    items.forEach(item => {
      table.push([
        chalk.bold.white(item.index.toString()),
        chalk.white(item.name),
        chalk.gray(item.description || ''),
        chalk.yellow(item.size || '')
      ]);
    });

    console.log(table.toString());
  }
}
