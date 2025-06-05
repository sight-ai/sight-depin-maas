import inquirer from 'inquirer';
import { AppServices } from '../services/app-services';
import { UIUtils } from '../utils/ui';
import { TableUtils } from '../utils/table';

/**
 * 模型管理命令模块
 */
export class ModelCommands {
  /**
   * 列出本地模型命令
   */
  static async list(): Promise<void> {
    try {
      UIUtils.showSection('Local Models');

      const spinner = UIUtils.createSpinner('Fetching model list...');
      spinner.start();

      try {
        // 使用统一的模型服务接口
        const modelResponse = await AppServices.getUnifiedModels();
        spinner.stop();

        if (!modelResponse.success) {
          UIUtils.error(`Failed to fetch models: ${modelResponse.error}`);
          return;
        }

        const modelList = modelResponse.data;
        if (modelList.models.length === 0) {
          UIUtils.showBox(
            'No Models Found',
            'No models are currently installed.\nPlease install models using the appropriate command for your framework.',
            'warning'
          );
          return;
        }

        console.log('');
        // 显示当前使用的框架
        UIUtils.info(`Framework: ${modelList.framework}`);
        console.log('');
        TableUtils.showModelsTable(modelList.models);
        console.log('');
        UIUtils.info(`Found ${modelList.models.length} model(s) installed locally`);
      } catch (error) {
        spinner.stop();
        UIUtils.error(`Error listing models: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // 提供故障排除建议
        UIUtils.showBox(
          'Troubleshooting',
          '• Check framework status: sight framework status\n• Make sure your inference framework is running\n• Try switching framework: sight framework switch <framework>',
          'info'
        );
      }
    } catch (error) {
      UIUtils.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 交互式模型上报命令
   */
  static async report(): Promise<void> {
    try {
      UIUtils.showSection('Model Reporting');

      const spinner = UIUtils.createSpinner('Fetching available models...');
      spinner.start();

      try {
        // 使用统一的模型服务接口
        const modelResponse = await AppServices.getUnifiedModels();
        spinner.stop();

        if (!modelResponse.success) {
          UIUtils.error(`Failed to fetch models: ${modelResponse.error}`);
          return;
        }

        const modelList = modelResponse.data;
        if (modelList.models.length === 0) {
          UIUtils.showBox(
            'No Models Found',
            'No models are currently installed.\nPlease install models using the appropriate command for your framework.',
            'warning'
          );
          return;
        }

        // 显示当前框架信息
        UIUtils.info(`Using framework: ${modelList.framework}`);
        console.log('');

        // 显示可用模型
        console.log('');
        TableUtils.showSelectionTable(
          modelList.models.map((model: any, index: number) => ({
            index: index + 1,
            name: model.name,
            description: model.details?.family || 'Unknown family',
            size: `${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
          }))
        );

        const { selectionType } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectionType',
            message: 'How would you like to select models?',
            choices: [
              { name: 'Select specific models', value: 'specific' },
              { name: 'Report all models', value: 'all' }
            ]
          }
        ]);

        let selectedModels: string[] = [];

        if (selectionType === 'all') {
          selectedModels = modelList.models.map((model: any) => model.name);
        } else {
          const { selectedIndices } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selectedIndices',
              message: 'Select models to report:',
              choices: modelList.models.map((model: any, index: number) => ({
                name: `${model.name} (${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB)`,
                value: index
              })),
              validate: (answer: number[]) => {
                if (answer.length === 0) {
                  return 'Please select at least one model';
                }
                return true;
              }
            }
          ]);

          selectedModels = selectedIndices.map((index: number) => modelList.models[index].name);
        }

        // 确认选择
        console.log('');
        UIUtils.showSection('Selected Models');
        selectedModels.forEach((model, index) => {
          UIUtils.showListItem(index + 1, model);
        });

        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Report ${selectedModels.length} model(s) to gateway?`,
            default: true
          }
        ]);

        if (!confirmed) {
          UIUtils.info('Model reporting cancelled');
          return;
        }

        // 执行上报
        const reportSpinner = UIUtils.createSpinner('Reporting models to gateway...');
        reportSpinner.start();

        try {
          const result = await AppServices.reportModels(selectedModels);
          const success = result.success;
          reportSpinner.stop();

          if (success) {
            UIUtils.success('Models reported successfully!');
            UIUtils.info('Models have been registered with the gateway');
          } else {
            UIUtils.warning('Models stored locally but not reported to gateway');
            UIUtils.info('This may be due to device not being registered or gateway unavailable');
          }
        } catch (error) {
          reportSpinner.stop();
          UIUtils.error(`Error reporting models: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        spinner.stop();
        UIUtils.error(`Error fetching models: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      UIUtils.error(`Input error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 上报所有模型命令
   */
  static async reportAll(): Promise<void> {
    try {
      UIUtils.showSection('Report All Models');

      const spinner = UIUtils.createSpinner('Fetching available models...');
      spinner.start();

      try {
        // 使用统一的模型服务接口
        const modelResponse = await AppServices.getUnifiedModels();
        spinner.stop();

        if (!modelResponse.success) {
          UIUtils.error(`Failed to fetch models: ${modelResponse.error}`);
          return;
        }

        const modelList = modelResponse.data;
        if (modelList.models.length === 0) {
          UIUtils.showBox(
            'No Models Found',
            'No models are currently installed.\nPlease install models using the appropriate command for your framework.',
            'warning'
          );
          return;
        }

        // 显示当前框架信息
        UIUtils.info(`Using framework: ${modelList.framework}`);

        const allModels = modelList.models.map((model: any) => model.name);

        console.log('');
        UIUtils.info(`Found ${allModels.length} model(s) to report:`);
        allModels.forEach((model: string, index: number) => {
          UIUtils.showListItem(index + 1, model);
        });

        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Report all ${allModels.length} model(s) to gateway?`,
            default: true
          }
        ]);

        if (!confirmed) {
          UIUtils.info('Model reporting cancelled');
          return;
        }

        const reportSpinner = UIUtils.createSpinner('Reporting all models to gateway...');
        reportSpinner.start();

        try {
          const result = await AppServices.reportModels(allModels);
          const success = result.success;
          reportSpinner.stop();

          if (success) {
            UIUtils.success('All models reported successfully!');
            UIUtils.info('Models have been registered with the gateway');
          } else {
            UIUtils.warning('Models stored locally but not reported to gateway');
            UIUtils.info('This may be due to device not being registered or gateway unavailable');
          }
        } catch (error) {
          reportSpinner.stop();
          UIUtils.error(`Error reporting models: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (error) {
        spinner.stop();
        UIUtils.error(`Error fetching models: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      UIUtils.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 查看模型上报状态命令
   */
  static async status(): Promise<void> {
    try {
      UIUtils.showSection('Model Reporting Status');

      const spinner = UIUtils.createSpinner('Checking model status...');
      spinner.start();

      try {
        const registrationStorage = AppServices.getRegistrationStorage();
        const savedModels = registrationStorage.getReportedModels();
        const reportedModels = savedModels; // 使用本地存储的模型信息

        spinner.stop();

        console.log('');
        TableUtils.showModelReportStatusTable(reportedModels, savedModels);

        if (reportedModels.length === 0 && savedModels.length === 0) {
          console.log('');
          UIUtils.showBox(
            'No Models Reported',
            'No models have been reported yet.\nUse "sight models report" command to report models.',
            'info'
          );
        }
      } catch (error) {
        spinner.stop();
        UIUtils.error(`Error checking model status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      UIUtils.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
