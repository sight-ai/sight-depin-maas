import inquirer from 'inquirer';
import { ModelOfMiner } from '@saito/models';
import { AppServices } from '../services/app-services';
import { UIUtils } from '../utils/ui';
import { TableUtils } from '../utils/table';

/**
 * 设备管理命令模块
 */
export class DeviceCommands {
  /**
   * 设备注册命令
   */
  static async register(): Promise<void> {
    try {
      UIUtils.showSection('Device Registration');
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'code',
          message: 'Registration Code:',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Registration code is required';
            }
            return true;
          }
        },
        {
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
        },
        {
          type: 'input',
          name: 'rewardAddress',
          message: 'Reward Address:',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Reward address is required';
            }
            return true;
          }
        },
        {
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
        }
      ]);

      const spinner = UIUtils.createSpinner('Registering device...');
      spinner.start();

      try {
        const deviceStatusService = await AppServices.getDeviceStatusService();
        const credentials: ModelOfMiner<'DeviceCredentials'> = {
          code: answers.code.trim(),
          gateway_address: answers.gatewayAddress.trim(),
          reward_address: answers.rewardAddress.trim(),
          key: answers.key.trim()
        };

        const result = await deviceStatusService.register(credentials);
        spinner.stop();

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
      
      const registrationStorage = AppServices.getRegistrationStorage();
      const savedInfo = registrationStorage.loadRegistrationInfo();

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
        const deviceStatusService = await AppServices.getDeviceStatusService();
        const result = await deviceStatusService.clearRegistration();
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
