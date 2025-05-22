import fetch from 'node-fetch';
import { CliUI } from '../utils/cli-ui';
import { configManager } from '../utils/config';

export interface RegistrationData {
  gatewayUrl: string;
  nodeCode: string;
  gatewayApiKey: string;
  rewardAddress: string;
  apiBasePath?: string;
}

export interface DeviceInfo {
  deviceType: string;
  gpuType: string;
  ipAddress: string;
  localModels: string[];
}

export class GatewayService {
  private ui = new CliUI();
  private backendUrl = 'http://localhost:8716';

  // 检查后端服务是否运行
  async checkBackendService(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/health`, {
        method: 'GET',
        timeout: 3000
      });

      if (response.ok) {
        this.ui.success('后端服务正在运行');
        return true;
      }
    } catch (error) {
      // 后端服务未运行
    }

    this.ui.error('后端服务未运行在端口 8716');
    this.ui.info('请确保 SightAI 后端服务已启动：');
    this.ui.info('1. 如果使用 Windows 安装程序：从开始菜单启动 SightAI Miner');
    this.ui.info('2. 如果使用手动设置：手动运行后端服务');
    this.ui.info('3. 确保端口 8716 可访问');
    
    return false;
  }

  // 注册设备到网关
  async registerDevice(data: RegistrationData): Promise<boolean> {
    this.ui.startSpinner('正在注册设备到网关...');

    try {
      // 检查后端服务
      if (!await this.checkBackendService()) {
        this.ui.stopSpinner(false, '后端服务不可用，无法继续注册');
        return false;
      }

      const registerUrl = `${this.backendUrl}/api/v1/device-status/register`;
      
      const requestData = {
        code: data.nodeCode,
        gateway_address: data.gatewayUrl,
        reward_address: data.rewardAddress,
        key: data.gatewayApiKey
      };

      this.ui.updateSpinner('发送注册数据...');

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        this.ui.stopSpinner(true, '设备注册成功');
        
        // 保存注册信息
        configManager.saveRegistrationInfo(data);
        
        this.ui.success('开始心跳报告...');
        return true;
      } else {
        const responseText = await response.text();
        let errorMessage = `注册失败 (状态码: ${response.status})`;

        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage += `\n错误: ${errorData.message}`;
          }
        } catch (e) {
          errorMessage += `\n响应: ${responseText}`;
        }

        this.ui.stopSpinner(false, errorMessage);
        this.ui.error('请检查：');
        this.ui.info('1. 所有注册参数是否正确');
        this.ui.info('2. 网关服务器是否可访问');
        this.ui.info('3. API 密钥是否有效');
        this.ui.info('4. 网络连接是否稳定');
        
        return false;
      }
    } catch (error: any) {
      this.ui.stopSpinner(false, `注册失败: ${error.message}`);
      this.ui.error('请检查：');
      this.ui.info('1. 网关服务器是否运行且可访问');
      this.ui.info('2. 网络连接是否稳定');
      this.ui.info('3. 防火墙设置是否允许连接');
      
      return false;
    }
  }

  // 使用保存的参数重新注册
  async reRegisterDevice(): Promise<boolean> {
    const savedInfo = configManager.getRegistrationInfo();
    
    if (!savedInfo) {
      this.ui.error('未找到保存的注册参数');
      this.ui.info('请先使用注册命令进行初始注册');
      return false;
    }

    this.ui.info('使用保存的注册参数重新注册...');
    this.ui.info(`网关 URL: ${savedInfo.gatewayUrl}`);
    this.ui.info(`奖励地址: ${savedInfo.rewardAddress}`);
    this.ui.info(`上次注册时间: ${configManager.get('lastRegistration')}`);

    return await this.registerDevice(savedInfo);
  }

  // 获取网关状态
  async getGatewayStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/v1/device-status/gateway-status`);
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      this.ui.error(`获取网关状态失败: ${error.message}`);
      return null;
    }
  }

  // 清除注册信息
  async clearRegistration(): Promise<boolean> {
    try {
      // 调用后端 API 清除注册信息
      const response = await fetch(`${this.backendUrl}/api/v1/device-status/clear-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // 清除本地配置
        configManager.clearRegistrationInfo();
        this.ui.success('注册信息已清除');
        return true;
      } else {
        this.ui.error('清除注册信息失败');
        return false;
      }
    } catch (error: any) {
      this.ui.error(`清除注册信息失败: ${error.message}`);
      return false;
    }
  }
}
