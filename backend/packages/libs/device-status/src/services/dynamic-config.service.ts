import { Injectable, Logger } from '@nestjs/common';
import { RegistrationStorage } from '../registration-storage';

/**
 * 动态配置服务
 * 
 * 从注册信息和系统检测中动态获取配置，
 * 替代原来依赖环境变量的方式
 */
@Injectable()
export class DynamicConfigService {
  private readonly logger = new Logger(DynamicConfigService.name);

  constructor(
    private readonly registrationStorage: RegistrationStorage
  ) {}

  /**
   * 获取网关 API URL
   * 从注册信息中动态获取，不依赖环境变量
   */
  async getGatewayApiUrl(): Promise<string> {
    try {
      const registration = this.registrationStorage.loadRegistrationInfo();

      if (registration?.gatewayAddress) {
        this.logger.debug(`Gateway URL from registration: ${registration.gatewayAddress}`);
        return registration.gatewayAddress;
      }

      // 如果没有注册信息，返回默认值
      const defaultUrl = 'http://localhost:3000';
      this.logger.warn(`No gateway URL in registration, using default: ${defaultUrl}`);
      return defaultUrl;

    } catch (error) {
      this.logger.error('Failed to get gateway URL from registration:', error);
      return 'http://localhost:3000';
    }
  }

  /**
   * 获取节点代码
   * 从注册信息中动态获取
   */
  async getNodeCode(): Promise<string | null> {
    try {
      const registration = this.registrationStorage.loadRegistrationInfo();

      if (registration?.code) {
        this.logger.debug('Node code retrieved from registration');
        return registration.code;
      }

      this.logger.warn('No node code found in registration');
      return null;

    } catch (error) {
      this.logger.error('Failed to get node code from registration:', error);
      return null;
    }
  }

  /**
   * 获取奖励地址
   * 从注册信息中动态获取
   */
  async getRewardAddress(): Promise<string | null> {
    try {
      const registration = this.registrationStorage.loadRegistrationInfo();

      if (registration?.rewardAddress) {
        this.logger.debug('Reward address retrieved from registration');
        return registration.rewardAddress;
      }

      this.logger.warn('No reward address found in registration');
      return null;

    } catch (error) {
      this.logger.error('Failed to get reward address from registration:', error);
      return null;
    }
  }


  /**
   * 获取基础路径
   * 从注册信息中动态获取
   */
  async getBasePath(): Promise<string> {
    try {
      const registration = this.registrationStorage.loadRegistrationInfo();
      console.log('registration', registration)
      if (registration?.basePath) {
        this.logger.debug(`Base path from registration: ${registration.basePath}`);
        return registration.basePath;
      }

      // 默认基础路径
      const defaultPath = '';
      this.logger.debug(`No base path in registration, using default: ${defaultPath}`);
      return defaultPath;

    } catch (error) {
      this.logger.error('Failed to get base path from registration:', error);
      return '/';
    }
  }

  /**
   * 获取完整的网关配置
   * 一次性获取所有网关相关配置
   */
  async getGatewayConfig(): Promise<{
    gatewayUrl: string;
    nodeCode: string | null;
    rewardAddress: string | null;
    basePath: string;
  }> {
    try {
      const registration = this.registrationStorage.loadRegistrationInfo();

      return {
        gatewayUrl: registration?.gatewayAddress || 'http://localhost:3000',
        nodeCode: registration?.code || null,
        rewardAddress: registration?.rewardAddress || null,
        basePath: registration?.basePath || '/api/model'
      };

    } catch (error) {
      this.logger.error('Failed to get gateway config from registration:', error);
      return {
        gatewayUrl: 'http://localhost:3000',
        nodeCode: null,
        rewardAddress: null,
        basePath: '/api/model'
      };
    }
  }

  /**
   * 检查是否有完整的注册配置
   */
  async hasCompleteRegistration(): Promise<boolean> {
    try {
      const config = await this.getGatewayConfig();
      
      return !!(
        config.gatewayUrl && 
        config.nodeCode && 
        config.rewardAddress
      );
      
    } catch (error) {
      this.logger.error('Failed to check registration completeness:', error);
      return false;
    }
  }

  /**
   * 获取注册状态摘要
   */
  async getRegistrationSummary(): Promise<{
    isRegistered: boolean;
    hasGatewayUrl: boolean;
    hasNodeCode: boolean;
    hasRewardAddress: boolean;
    hasBasePath: boolean;
  }> {
    try {
      const config = await this.getGatewayConfig();
      
      return {
        isRegistered: await this.hasCompleteRegistration(),
        hasGatewayUrl: !!config.gatewayUrl,
        hasNodeCode: !!config.nodeCode,
        hasRewardAddress: !!config.rewardAddress,
        hasBasePath: !!config.basePath
      };
      
    } catch (error) {
      this.logger.error('Failed to get registration summary:', error);
      return {
        isRegistered: false,
        hasGatewayUrl: false,
        hasNodeCode: false,
        hasRewardAddress: false,
        hasBasePath: false
      };
    }
  }

  /**
   * 验证注册配置的有效性
   */
  async validateRegistrationConfig(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = await this.getGatewayConfig();

      // 检查必需字段
      if (!config.gatewayUrl || config.gatewayUrl === 'http://localhost:3000') {
        errors.push('Gateway URL is missing or using default value');
      }

      if (!config.nodeCode) {
        errors.push('Node code is missing');
      }

      if (!config.rewardAddress) {
        errors.push('Reward address is missing');
      }


      // 检查 URL 格式
      if (config.gatewayUrl) {
        try {
          new URL(config.gatewayUrl);
        } catch (e) {
          errors.push('Gateway URL format is invalid');
        }
      }

      // 检查基础路径格式
      if (config.basePath && !config.basePath.startsWith('/')) {
        warnings.push('Base path should start with "/"');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('Failed to validate registration config:', error);
      return {
        isValid: false,
        errors: ['Failed to load registration configuration'],
        warnings: []
      };
    }
  }
}
