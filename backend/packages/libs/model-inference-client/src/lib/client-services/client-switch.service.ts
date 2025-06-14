import { Injectable, Logger } from '@nestjs/common';
import { LocalConfigService } from '@saito/common';
import { ClientType, isValidClientType, getSupportedClientTypes, getDefaultClientType } from './dynamic-client.provider';

/**
 * 客户端切换服务
 * 
 * 负责管理客户端类型的切换逻辑
 * 注意：这个服务只负责写入配置文件，不负责重启服务
 * 重启逻辑应该由 CLI 或外部管理工具处理
 */
@Injectable()
export class ClientSwitchService {
  private readonly logger = new Logger(ClientSwitchService.name);

  constructor(
    private readonly localConfigService: LocalConfigService
  ) {}

  /**
   * 切换客户端类型
   * 
   * @param clientType 目标客户端类型
   * @param options 切换选项
   * @returns 切换结果
   */
  async switchClient(
    clientType: string,
    options: {
      force?: boolean;
      validateAvailability?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    message: string;
    previousClient?: string;
    newClient?: string;
    requiresRestart: boolean;
  }> {
    try {
      // 验证客户端类型
      if (!isValidClientType(clientType)) {
        return {
          success: false,
          message: `Invalid client type: ${clientType}. Supported types: ${getSupportedClientTypes().join(', ')}`,
          requiresRestart: false
        };
      }

      // 获取当前客户端类型
      const currentClient = this.getCurrentClientType();
      
      // 检查是否需要切换
      if (currentClient === clientType && !options.force) {
        return {
          success: true,
          message: `Already using ${clientType} client`,
          previousClient: currentClient,
          newClient: clientType,
          requiresRestart: false
        };
      }

      // 如果需要验证可用性
      if (options.validateAvailability && !options.force) {
        const isAvailable = await this.checkClientAvailability(clientType);
        if (!isAvailable) {
          return {
            success: false,
            message: `Client ${clientType} is not available. Use force=true to switch anyway.`,
            requiresRestart: false
          };
        }
      }

      // 写入配置文件
      const success = this.localConfigService.setClientType(clientType);
      
      if (!success) {
        return {
          success: false,
          message: 'Failed to write client configuration',
          requiresRestart: false
        };
      }

      this.logger.log(`Client switched from ${currentClient} to ${clientType}`);

      return {
        success: true,
        message: `Successfully switched to ${clientType} client. Please restart the service for changes to take effect.`,
        previousClient: currentClient,
        newClient: clientType,
        requiresRestart: true
      };

    } catch (error) {
      this.logger.error('Failed to switch client:', error);
      return {
        success: false,
        message: `Failed to switch client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requiresRestart: false
      };
    }
  }

  /**
   * 获取当前客户端类型
   */
  getCurrentClientType(): ClientType {
    const clientType = this.localConfigService.getClientType();
    return (clientType && isValidClientType(clientType)) ? clientType : getDefaultClientType();
  }

  /**
   * 获取支持的客户端类型列表
   */
  getSupportedClientTypes(): ClientType[] {
    return getSupportedClientTypes();
  }

  /**
   * 检查客户端配置状态
   */
  getClientStatus(): {
    current: ClientType;
    supported: ClientType[];
    configFile: string;
    configExists: boolean;
  } {
    const current = this.getCurrentClientType();
    const supported = this.getSupportedClientTypes();
    const configExists = this.localConfigService.has('config.json', 'client_type');

    return {
      current,
      supported,
      configFile: '~/.sightai/config.json',
      configExists
    };
  }

  /**
   * 重置客户端配置为默认值
   */
  resetToDefault(): {
    success: boolean;
    message: string;
    clientType: ClientType;
  } {
    const defaultClient = getDefaultClientType();
    const success = this.localConfigService.setClientType(defaultClient);

    if (success) {
      this.logger.log(`Client configuration reset to default: ${defaultClient}`);
      return {
        success: true,
        message: `Client configuration reset to default: ${defaultClient}`,
        clientType: defaultClient
      };
    } else {
      return {
        success: false,
        message: 'Failed to reset client configuration',
        clientType: defaultClient
      };
    }
  }

  /**
   * 删除客户端配置 (将使用默认值)
   */
  clearClientConfig(): {
    success: boolean;
    message: string;
  } {
    const success = this.localConfigService.delete('config.json', 'client_type');

    if (success) {
      this.logger.log('Client configuration cleared');
      return {
        success: true,
        message: 'Client configuration cleared. Will use default client on next restart.'
      };
    } else {
      return {
        success: false,
        message: 'Failed to clear client configuration'
      };
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 检查客户端可用性
   * 这里可以添加实际的可用性检查逻辑
   */
  private async checkClientAvailability(clientType: ClientType): Promise<boolean> {
    // TODO: 实现实际的可用性检查
    // 例如：检查对应的服务是否运行，端口是否可访问等
    
    this.logger.debug(`Checking availability for client: ${clientType}`);
    
    // 暂时返回 true，实际实现时可以添加具体的检查逻辑
    return true;
  }
}
