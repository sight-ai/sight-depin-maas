import inquirer from 'inquirer';
import { AppServices } from '../services/app-services';
import { UIUtils } from '../utils/ui';
import { TableUtils } from '../utils/table';

/**
 * Ollama配置参数接口 - 简化版，不需要配置项
 */
export interface OllamaConfigOptions {
  // Ollama使用默认配置，不需要额外配置项
}

/**
 * Ollama管理命令模块
 */
export class OllamaCommands {
  /**
   * 启动Ollama服务
   */
  static async startService(): Promise<void> {
    try {
      UIUtils.showSection('Start Ollama Service');

      const spinner = UIUtils.createSpinner('Starting Ollama service...');
      spinner.start();

      const result = await AppServices.startOllamaService({});
      spinner.stop();

      if (result.success) {
        UIUtils.success('Ollama service started successfully');
        console.log('');
        console.log(`📋 Process ID: ${result.pid}`);
      } else {
        UIUtils.error(`Failed to start Ollama service: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error starting Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 停止Ollama服务
   */
  static async stopService(): Promise<void> {
    try {
      UIUtils.showSection('Stop Ollama Service');

      const spinner = UIUtils.createSpinner('Stopping Ollama service...');
      spinner.start();

      const result = await AppServices.stopOllamaService();
      spinner.stop();

      if (result.success) {
        UIUtils.success('Ollama service stopped successfully');
      } else {
        UIUtils.error(`Failed to stop Ollama service: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error stopping Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 重启Ollama服务
   */
  static async restartService(): Promise<void> {
    try {
      UIUtils.showSection('Restart Ollama Service');

      const spinner = UIUtils.createSpinner('Restarting Ollama service...');
      spinner.start();

      const result = await AppServices.restartOllamaService({});
      spinner.stop();

      if (result.success) {
        UIUtils.success('Ollama service restarted successfully');
        console.log('');
        console.log(`📋 Process ID: ${result.pid}`);
      } else {
        UIUtils.error(`Failed to restart Ollama service: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error restarting Ollama service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 查看Ollama进程状态
   */
  static async getProcessStatus(): Promise<void> {
    try {
      UIUtils.showSection('Ollama Process Status');

      const spinner = UIUtils.createSpinner('Checking Ollama process status...');
      spinner.start();

      const result = await AppServices.getOllamaProcessStatus();
      spinner.stop();

      if (result.success) {
        const process = result.process;
        
        if (process.isRunning) {
          UIUtils.success('Ollama service is running');
          console.log('');
          
          const statusTable = [
            ['Process ID', process.pid?.toString() || 'Unknown'],
            ['Port', process.port?.toString() || 'Unknown'],
            ['Start Time', process.startTime?.toLocaleString() || 'Unknown'],
            ['Memory Usage', process.memoryUsage ? `${(process.memoryUsage / 1024 / 1024).toFixed(1)} MB` : 'Unknown'],
            ['CPU Usage', process.cpuUsage ? `${process.cpuUsage.toFixed(1)}%` : 'Unknown'],
            ['Version', process.version || 'Unknown']
          ];

          TableUtils.displayKeyValueTable(statusTable, 'Ollama Process Status');
        } else {
          UIUtils.warning('Ollama service is not running');
          console.log('');
          UIUtils.info('Use "sight ollama start" to start the service');
        }
      } else {
        UIUtils.error(`Failed to get Ollama process status: ${result.error}`);
      }
    } catch (error) {
      UIUtils.error(`Error getting Ollama process status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ollama配置信息 - Ollama使用默认配置
   */
  static async showConfiguration(): Promise<void> {
    try {
      UIUtils.showSection('Ollama Configuration');
      UIUtils.info('Ollama uses default configuration settings');
      console.log('');
      console.log('📋 Default Settings:');
      console.log('   • Host: 0.0.0.0');
      console.log('   • Port: 11434');
      console.log('   • API URL: http://127.0.0.1:11434');
      console.log('');
      UIUtils.info('No additional configuration is required for Ollama');
    } catch (error) {
      UIUtils.error(`Error showing Ollama configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 列出可用的Ollama模型
   */
  static async listModels(): Promise<void> {
    try {
      UIUtils.showSection('Ollama Models');

      const spinner = UIUtils.createSpinner('Fetching Ollama models...');
      spinner.start();

      // 这里可以调用Ollama API获取模型列表
      // 暂时使用框架管理器获取模型
      const result = await AppServices.getUnifiedModels('ollama');
      spinner.stop();

      if (result.success && result.data && result.data.length > 0) {
        UIUtils.success('Available Ollama models:');
        console.log('');
        
        const modelTable = result.data.map((model: any) => [
          model.name || model.id,
          model.size || 'Unknown',
          model.modified || 'Unknown'
        ]);

        TableUtils.displayTable(
          ['Model Name', 'Size', 'Modified'],
          modelTable,
          'Ollama Models'
        );
      } else {
        UIUtils.warning('No Ollama models found or service not available');
        console.log('');
        UIUtils.info('Make sure Ollama service is running and models are installed');
      }
    } catch (error) {
      UIUtils.error(`Error listing Ollama models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 拉取Ollama模型
   */
  static async pullModel(modelName?: string): Promise<void> {
    try {
      UIUtils.showSection('Pull Ollama Model');

      let model = modelName;
      if (!model) {
        const { modelInput } = await inquirer.prompt([
          {
            type: 'input',
            name: 'modelInput',
            message: 'Enter model name to pull (e.g., llama2, codellama):',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Please enter a model name';
              }
              return true;
            }
          }
        ]);
        model = modelInput.trim();
      }

      UIUtils.info(`Pulling model: ${model}`);
      UIUtils.info('This may take a while depending on the model size...');
      
      // 这里应该调用Ollama API来拉取模型
      // 暂时显示提示信息
      console.log('');
      console.log(`To pull the model manually, run:`);
      console.log(`  ollama pull ${model}`);
      console.log('');
      UIUtils.info('Model pulling functionality will be implemented in future versions');

    } catch (error) {
      UIUtils.error(`Error pulling Ollama model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
