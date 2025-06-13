import inquirer from 'inquirer';
import { ModelOfMiner } from '@saito/models';
import { AppServices } from '../services/app-services';
import { UIUtils } from '../utils/ui';
import { TableUtils } from '../utils/table';

/**
 * 设备注册参数接口
 */
export interface RegisterOptions {
  code?: string;
  gatewayAddress?: string;
  rewardAddress?: string;
  key?: string;
  basePath?: string;
}

/**
 * 设备管理命令模块
 */
export class DeviceCommands {
  /**
   * 设备注册命令
   * @param options 可选的命令行参数
   */
  static async register(options?: RegisterOptions): Promise<void> {
    try {
      UIUtils.showSection('Device Registration');

      // 如果提供了所有必需的参数，直接使用；否则进入交互模式
      let credentials: any;

      if (options?.code && options?.gatewayAddress && options?.rewardAddress && options?.key) {
        // 使用命令行参数
        credentials = {
          code: options.code.trim(),
          gateway_address: options.gatewayAddress.trim(),
          reward_address: options.rewardAddress.trim(),
          key: options.key.trim(),
          basePath: options.basePath
        };

        // 显示basePath信息
        if (options.basePath !== undefined) {
          UIUtils.info(`Using basePath: "${options.basePath}"`);
        }

        // 验证URL格式
        try {
          new URL(options.gatewayAddress);
        } catch {
          UIUtils.error('Invalid gateway address URL format');
          return;
        }

        UIUtils.info('Using provided registration parameters...');
      } else {
        // 交互式输入
        const questions = [];

        if (!options?.code) {
          questions.push({
            type: 'input',
            name: 'code',
            message: 'Registration Code:',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Registration code is required';
              }
              return true;
            }
          });
        }

        if (!options?.gatewayAddress) {
          questions.push({
            type: 'input',
            name: 'gatewayAddress',
            message: 'Gateway Address:',
            default: 'https://gateway.saito.ai',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Gateway address is required';
              }
              try {
                new URL(input);
                return true;
              } catch {
                return 'Please enter a valid URL';
              }
            }
          });
        }

        if (!options?.rewardAddress) {
          questions.push({
            type: 'input',
            name: 'rewardAddress',
            message: 'Reward Address:',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Reward address is required';
              }
              return true;
            }
          });
        }

        if (!options?.key) {
          questions.push({
            type: 'password',
            name: 'key',
            message: 'Authentication Key:',
            mask: '*',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Authentication key is required';
              }
              return true;
            }
          });
        }

        if (!options?.basePath) {
          questions.push({
            type: 'input',
            name: 'basePath',
            message: 'API Server Base Path (optional):',
            default: process.env.API_SERVER_BASE_PATH || '',
            validate: () => {
              // basePath可以为空，所以总是返回true
              return true;
            }
          });
        }

        const answers = await inquirer.prompt(questions);

        // 合并命令行参数和交互式输入
        const basePath = options?.basePath !== undefined ? options.basePath : answers.basePath;
        credentials = {
          code: (options?.code || answers.code).trim(),
          gateway_address: (options?.gatewayAddress || answers.gatewayAddress).trim(),
          reward_address: (options?.rewardAddress || answers.rewardAddress).trim(),
          key: (options?.key || answers.key).trim(),
          basePath: basePath?.trim()
        };

        // 显示basePath信息
        if (basePath !== undefined && basePath.trim()) {
          UIUtils.info(`Using basePath: "${basePath.trim()}"`);
        }
      }

      const spinner = UIUtils.createSpinner('Registering device...');
      spinner.start();

      try {
        const result = await AppServices.register(credentials);
        spinner.stop();
        // console.log(result)
        if (result.success) {
          UIUtils.success('Device registered successfully!');

          if (result.node_id || result.name) {
            const info: Record<string, string> = {};
            if (result.node_id) info['Node ID'] = result.node_id;
            if (result.name) info['Device Name'] = result.name;

            console.log('');
            TableUtils.showKeyValueTable(info);
          }

          UIUtils.info('Heartbeat started automatically');
        } else {
          UIUtils.error(`Registration failed: ${result.error}`);
        }
      } catch (error) {
        spinner.stop();
        UIUtils.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      UIUtils.error(`Input error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 查看设备状态命令
   */
  static async status(): Promise<void> {
    try {
      UIUtils.showSection('Device Registration Status');

      const registrationStorage = AppServices.getStorageManager();
      const savedInfo = await registrationStorage.loadRegistrationInfo();
      if (savedInfo && savedInfo.isRegistered) {
        TableUtils.showDeviceStatusTable({
          deviceId: savedInfo.deviceId,
          deviceName: savedInfo.deviceName,
          gatewayAddress: savedInfo.gatewayAddress,
          rewardAddress: savedInfo.rewardAddress,
          isRegistered: savedInfo.isRegistered,
          timestamp: savedInfo.timestamp
        });
      } else {
        UIUtils.showBox(
          'Registration Status',
          'Device is not registered.\nUse "sight register" command to register this device.',
          'warning'
        );
      }
    } catch (error) {
      UIUtils.error(`Error checking registration status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取消注册命令
   */
  static async unregister(): Promise<void> {
    try {
      UIUtils.showSection('Device Unregistration');

      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you sure you want to unregister this device? This will disconnect from the gateway and clear all registration information.',
          default: false
        }
      ]);

      if (!confirmed) {
        UIUtils.info('Unregistration cancelled');
        return;
      }

      const spinner = UIUtils.createSpinner('Unregistering device...');
      spinner.start();

      try {
        const result = await AppServices.clearRegistration();
        spinner.stop();

        if (result) {
          UIUtils.success('Device unregistered successfully');
          UIUtils.info('All registration information has been cleared');
        } else {
          UIUtils.error('Failed to unregister device');
        }
      } catch (error) {
        spinner.stop();
        UIUtils.error(`Unregistration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      UIUtils.error(`Input error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
