import inquirer from 'inquirer';
import { AppServices } from '../services/app-services';
import { UIUtils } from '../utils/ui';
import { TableUtils } from '../utils/table';

/**
 * vLLM配置参数接口 - 只保留核心配置
 */
export interface VllmConfigOptions {
  gpuMemoryUtilization?: number;
  maxModelLen?: number;
}

/**
 * vLLM管理命令模块
 */
export class VllmCommands {
  /**
   * 查看vLLM配置
   */
  static async getConfig(): Promise<void> {
    try {
      UIUtils.showSection('vLLM Configuration');
      
      const spinner = UIUtils.createSpinner('Fetching vLLM configuration...');
      spinner.start();

      const result = await AppServices.getVllmConfig();
      spinner.stop();

      if (result.success) {
        UIUtils.success('vLLM configuration retrieved successfully');
        console.log('');
        
        const config = result.config;
        const configTable = [
          ['GPU Memory Utilization', `${(config.gpuMemoryUtilization * 100).toFixed(1)}%`],
          ['Max Model Length', config.maxModelLen.toString()]
        ];

        TableUtils.displayKeyValueTable(configTable, 'vLLM Configuration');
      } else {
        UIUtils.error(`Failed to get vLLM configuration: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error getting vLLM configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 设置GPU内存使用率
   */
  static async setGpuMemory(memoryUtilization?: number): Promise<void> {
    try {
      UIUtils.showSection('Set vLLM GPU Memory Utilization');

      let gpuMemoryUtilization = memoryUtilization;

      if (gpuMemoryUtilization === undefined) {
        const { memory } = await inquirer.prompt([
          {
            type: 'input',
            name: 'memory',
            message: 'Enter GPU memory utilization (0.1-1.0, e.g., 0.8 for 80%):',
            validate: (input: string) => {
              const value = parseFloat(input);
              if (isNaN(value) || value < 0.1 || value > 1.0) {
                return 'Please enter a valid number between 0.1 and 1.0';
              }
              return true;
            }
          }
        ]);
        gpuMemoryUtilization = parseFloat(memory);
      }

      const spinner = UIUtils.createSpinner('Updating GPU memory utilization...');
      spinner.start();

      const result = await AppServices.updateVllmConfig({
        gpuMemoryUtilization
      });

      spinner.stop();

      if (result.success) {
        UIUtils.success(`GPU memory utilization set to ${(gpuMemoryUtilization * 100).toFixed(1)}%`);
        console.log('');
        UIUtils.info('Note: Changes will take effect when vLLM service is restarted');
      } else {
        UIUtils.error(`Failed to update GPU memory utilization: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error setting GPU memory utilization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 设置最大模型长度
   */
  static async setMaxModelLen(maxModelLen?: number): Promise<void> {
    try {
      UIUtils.showSection('Set vLLM Max Model Length');

      let modelLen = maxModelLen;

      if (modelLen === undefined) {
        const { length } = await inquirer.prompt([
          {
            type: 'input',
            name: 'length',
            message: 'Enter max model length (tokens, e.g., 4096):',
            validate: (input: string) => {
              const value = parseInt(input);
              if (isNaN(value) || value < 1) {
                return 'Please enter a valid positive integer';
              }
              return true;
            }
          }
        ]);
        modelLen = parseInt(length);
      }

      const spinner = UIUtils.createSpinner('Updating max model length...');
      spinner.start();

      const result = await AppServices.updateVllmConfig({
        maxModelLen: modelLen
      });

      spinner.stop();

      if (result.success) {
        UIUtils.success(`Max model length set to ${modelLen} tokens`);
        console.log('');
        UIUtils.info('Note: Changes will take effect when vLLM service is restarted');
      } else {
        UIUtils.error(`Failed to update max model length: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error setting max model length: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 交互式配置更新
   */
  static async configureInteractive(): Promise<void> {
    try {
      UIUtils.showSection('Interactive vLLM Configuration');

      // 首先获取当前配置
      const currentConfig = await AppServices.getVllmConfig();
      if (!currentConfig.success) {
        UIUtils.error(`Failed to get current configuration: ${currentConfig.error}`);
        return;
      }

      const config = currentConfig.config;

      const questions = [
        {
          type: 'input',
          name: 'gpuMemoryUtilization',
          message: 'GPU Memory Utilization (0.1-1.0):',
          default: config.gpuMemoryUtilization.toString(),
          validate: (input: string) => {
            const value = parseFloat(input);
            if (isNaN(value) || value < 0.1 || value > 1.0) {
              return 'Please enter a valid number between 0.1 and 1.0';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'maxModelLen',
          message: 'Max Model Length (tokens):',
          default: config.maxModelLen.toString(),
          validate: (input: string) => {
            const value = parseInt(input);
            if (isNaN(value) || value < 1) {
              return 'Please enter a valid positive integer';
            }
            return true;
          }
        }
      ];

      const answers = await inquirer.prompt(questions);

      const updateConfig: VllmConfigOptions = {
        gpuMemoryUtilization: parseFloat(answers.gpuMemoryUtilization),
        maxModelLen: parseInt(answers.maxModelLen)
      };

      const spinner = UIUtils.createSpinner('Updating vLLM configuration...');
      spinner.start();

      const result = await AppServices.updateVllmConfig(updateConfig);
      spinner.stop();

      if (result.success) {
        UIUtils.success('vLLM configuration updated successfully');
        console.log('');
        console.log('📋 Updated settings:');
        result.updates.forEach((update: string) => {
          console.log(`  ✅ ${update}`);
        });
        console.log('');
        UIUtils.info('Note: Changes will take effect when vLLM service is restarted');
      } else {
        UIUtils.error(`Failed to update vLLM configuration: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error configuring vLLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 启动vLLM服务
   */
  static async startService(config?: VllmConfigOptions): Promise<void> {
    try {
      UIUtils.showSection('Start vLLM Service');

      const spinner = UIUtils.createSpinner('Starting vLLM service...');
      spinner.start();

      const result = await AppServices.startVllmService(config || {});
      spinner.stop();

      if (result.success) {
        UIUtils.success('vLLM service started successfully');
        console.log('');
        console.log(`📋 Process ID: ${result.pid}`);
        if (result.config) {
          console.log(`🎛️  GPU Memory: ${(result.config.gpuMemoryUtilization * 100).toFixed(1)}%`);
          console.log(`📏 Max Model Length: ${result.config.maxModelLen}`);
        }
      } else {
        UIUtils.error(`Failed to start vLLM service: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error starting vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 停止vLLM服务
   */
  static async stopService(): Promise<void> {
    try {
      UIUtils.showSection('Stop vLLM Service');

      const spinner = UIUtils.createSpinner('Stopping vLLM service...');
      spinner.start();

      const result = await AppServices.stopVllmService();
      spinner.stop();

      if (result.success) {
        UIUtils.success('vLLM service stopped successfully');
      } else {
        UIUtils.error(`Failed to stop vLLM service: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error stopping vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 重启vLLM服务
   */
  static async restartService(config?: VllmConfigOptions): Promise<void> {
    try {
      UIUtils.showSection('Restart vLLM Service');

      const spinner = UIUtils.createSpinner('Restarting vLLM service...');
      spinner.start();

      const result = await AppServices.restartVllmService(config || {});
      spinner.stop();

      if (result.success) {
        UIUtils.success('vLLM service restarted successfully');
        console.log('');
        console.log(`📋 Process ID: ${result.pid}`);
        if (result.config) {
          console.log(`🎛️  GPU Memory: ${(result.config.gpuMemoryUtilization * 100).toFixed(1)}%`);
        }
        console.log('');
        UIUtils.info('New configuration is now active');
      } else {
        UIUtils.error(`Failed to restart vLLM service: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error restarting vLLM service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 查看vLLM进程状态
   */
  static async getProcessStatus(): Promise<void> {
    try {
      UIUtils.showSection('vLLM Process Status');

      const spinner = UIUtils.createSpinner('Checking vLLM process status...');
      spinner.start();

      const result = await AppServices.getVllmProcessStatus();
      spinner.stop();

      if (result.success) {
        const process = result.process;

        if (process.isRunning) {
          UIUtils.success('vLLM service is running');
          console.log('');

          const statusTable = [
            ['Process ID', process.pid?.toString() || 'Unknown'],
            ['Port', process.port?.toString() || 'Unknown'],
            ['Start Time', process.startTime?.toLocaleString() || 'Unknown'],
            ['Memory Usage', process.memoryUsage ? `${(process.memoryUsage / 1024 / 1024).toFixed(1)} MB` : 'Unknown'],
            ['CPU Usage', process.cpuUsage ? `${process.cpuUsage.toFixed(1)}%` : 'Unknown']
          ];

          if (process.config) {
            statusTable.push(
              ['GPU Memory', `${(process.config.gpuMemoryUtilization * 100).toFixed(1)}%`],
              ['Max Model Length', process.config.maxModelLen.toString()]
            );
          }

          TableUtils.displayKeyValueTable(statusTable, 'vLLM Process Status');
        } else {
          UIUtils.warning('vLLM service is not running');
          console.log('');
          UIUtils.info('Use "sight vllm start" to start the service');
        }
      } else {
        UIUtils.error(`Failed to get vLLM process status: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error getting vLLM process status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 重置配置为默认值
   */
  static async resetConfig(): Promise<void> {
    try {
      UIUtils.showSection('Reset vLLM Configuration');

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset vLLM configuration to default values?',
          default: false
        }
      ]);

      if (!confirm) {
        UIUtils.info('Configuration reset cancelled');
        return;
      }

      const defaultConfig: VllmConfigOptions = {
        gpuMemoryUtilization: 0.9,
        maxModelLen: 4096
      };

      const spinner = UIUtils.createSpinner('Resetting vLLM configuration...');
      spinner.start();

      const result = await AppServices.updateVllmConfig(defaultConfig);
      spinner.stop();

      if (result.success) {
        UIUtils.success('vLLM configuration reset to default values');
        console.log('');
        UIUtils.info('Note: Changes will take effect when vLLM service is restarted');
      } else {
        UIUtils.error(`Failed to reset vLLM configuration: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error resetting vLLM configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
