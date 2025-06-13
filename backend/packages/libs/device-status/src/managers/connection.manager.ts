import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { TunnelService } from '@saito/tunnel';
import { ModelOfMiner } from '@saito/models';
import { DeviceConfigManager } from './device-config.manager';
import { DeviceRegistrationManager, ExtendedRegistrationResponse } from './device-registration.manager';
import { ErrorHandler } from '../utils/error-handler';

/**
 * 连接管理器
 * 
 * 负责：
 * 1. 网关连接管理
 * 2. 自动重连逻辑
 * 3. 连接状态监控
 */
@Injectable()
export class ConnectionManager {
  private readonly logger = new Logger(ConnectionManager.name);
  private readonly errorHandler = new ErrorHandler(ConnectionManager.name);

  constructor(
    @Inject('TunnelService')
    private readonly tunnelService: TunnelService,
    private readonly configManager: DeviceConfigManager,
    private readonly registrationManager: DeviceRegistrationManager
  ) {}

  /**
   * 初始化连接（如果已注册则自动重连）
   */
  async initializeConnection(): Promise<void> {
    if (this.configManager.isRegistered()) {
      await this.autoReconnect();
    }
  }

  /**
   * 自动重新连接到网关
   */
  async autoReconnect(): Promise<boolean> {
    if (!this.registrationManager.canAutoReconnect()) {
      this.logger.warn('Cannot auto-reconnect: missing registration information');
      return false;
    }

    return this.errorHandler.safeExecute(
      async () => {
        const config = this.configManager.getCurrentConfig();
        this.logger.log(`Auto-reconnecting to gateway: ${config.gatewayAddress}`);

        const credentials = this.registrationManager.createReconnectCredentials();
        if (!credentials) {
          throw new Error('Failed to create reconnect credentials');
        }

        // 尝试重新注册
        const response = await this.registrationManager.registerDevice(
          credentials,
          [], // 模型列表在重连时可以为空
          true // isAutoReconnect = true
        );
        
        if (response.success && response.config) {
          this.logger.log('Re-registration successful');
          await this.establishConnection(response.config, credentials.basePath);
          return true;
        } else {
          this.logger.error(`Re-registration failed: ${response.error}`);
          // 尝试直接连接
          return await this.directConnect(config);
        }
      },
      'auto-reconnect',
      false
    );
  }

  /**
   * 建立连接
   */
  async establishConnection(
    config: ModelOfMiner<'DeviceConfig'>,
    basePath?: string
  ): Promise<void> {
    await this.tunnelService.createSocket(
      config.gatewayAddress,
      config.key,
      config.code,
      basePath
    );

    await this.tunnelService.connectSocket(config.deviceId);
  }

  /**
   * 直接连接（当重新注册失败时）
   */
  async directConnect(config: ModelOfMiner<'DeviceConfig'>): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        this.logger.log('Attempting direct connection...');

        await this.establishConnection(config, this.configManager.getBasePath());
        
        this.logger.log('Direct connection successful');
        return true;
      },
      'direct-connect',
      false
    );
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        await this.tunnelService.disconnectSocket();
        this.logger.log('Disconnected from gateway');
        return true;
      },
      'disconnect',
      false
    );
  }

  /**
   * 检查连接状态
   */
  async isConnected(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        // 这里可以添加实际的连接状态检查逻辑
        // 目前基于配置状态判断
        return this.configManager.isRegistered();
      },
      'check-connection-status',
      false
    );
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<boolean> {
    return this.errorHandler.safeExecute(
      async () => {
        // 先断开现有连接
        await this.disconnect();
        
        // 然后重新连接
        return await this.autoReconnect();
      },
      'reconnect',
      false
    );
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    isConnected: boolean;
    gatewayAddress: string;
    deviceId: string;
  } {
    const config = this.configManager.getCurrentConfig();
    return {
      isConnected: config.isRegistered,
      gatewayAddress: config.gatewayAddress,
      deviceId: config.deviceId
    };
  }
}
