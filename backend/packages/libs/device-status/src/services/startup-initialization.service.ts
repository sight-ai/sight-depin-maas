import { Injectable, Logger, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { 
  TDeviceConfig,
  DEVICE_CONFIG_SERVICE
} from '../device-status.interface';
import { AutoRegistrationService, AUTO_REGISTRATION_SERVICE } from './auto-registration.service';

/**
 * 启动初始化服务
 * 负责在应用启动时执行必要的初始化操作
 */
@Injectable()
export class StartupInitializationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupInitializationService.name);

  constructor(
    @Inject(DEVICE_CONFIG_SERVICE)
    private readonly configService: TDeviceConfig,

    @Inject(AUTO_REGISTRATION_SERVICE)
    private readonly autoRegistrationService: AutoRegistrationService
  ) {}

  /**
   * 应用启动完成后执行
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('🚀 Application bootstrap completed, starting initialization...');

    try {
      // 1. 初始化设备配置
      await this.initializeDeviceConfig();

      // 2. 检查并执行自动注册
      await this.checkAndPerformAutoRegistration();

      // 3. 显示启动状态
      this.displayStartupStatus();

      this.logger.log('✅ Startup initialization completed successfully');
    } catch (error) {
      this.logger.error('❌ Startup initialization failed:', error);
    }
  }

  /**
   * 初始化设备配置
   */
  private async initializeDeviceConfig(): Promise<void> {
    try {
      await this.configService.initialize();
      this.logger.debug('Device configuration initialized');
    } catch (error) {
      this.logger.error('Failed to initialize device configuration:', error);
      throw error;
    }
  }

  /**
   * 检查并执行自动注册
   */
  private async checkAndPerformAutoRegistration(): Promise<void> {
    try {
      const config = this.configService.getCurrentConfig();
      
      if (this.hasStoredRegistrationInfo(config)) {
        this.logger.log('📋 Found stored registration information');
        
        if (config.isRegistered) {
          this.logger.log('🔄 Device is registered, attempting to reconnect to gateway...');
        } else {
          this.logger.log('🔗 Device not registered, attempting initial registration...');
        }

        // 触发自动注册
        const success = await this.autoRegistrationService.attemptAutoRegistration();
        
        if (success) {
          this.logger.log('✅ Auto registration completed successfully');
        } else {
          this.logger.warn('⚠️ Auto registration failed, will retry periodically');
        }
      } else {
        this.logger.log('ℹ️ No stored registration information found');
        this.logger.log('💡 Please register the device manually using the registration API');
      }
    } catch (error) {
      this.logger.error('Auto registration check failed:', error);
    }
  }

  /**
   * 显示启动状态
   */
  private displayStartupStatus(): void {
    try {
      const config = this.configService.getCurrentConfig();
      const autoRegStatus = this.autoRegistrationService.getAutoRegistrationStatus();

      this.logger.log('📊 Startup Status Summary:');
      this.logger.log(`   Device ID: ${config.deviceId || 'Not set'}`);
      this.logger.log(`   Device Name: ${config.deviceName || 'Not set'}`);
      this.logger.log(`   Gateway: ${config.gatewayAddress || 'Not set'}`);
      this.logger.log(`   Registration Status: ${config.isRegistered ? '✅ Registered' : '❌ Not Registered'}`);
      this.logger.log(`   Auto Registration: ${autoRegStatus.isRegistering ? '🔄 In Progress' : '⏸️ Idle'}`);
      
      if (autoRegStatus.retryCount > 0) {
        this.logger.log(`   Retry Count: ${autoRegStatus.retryCount}/${autoRegStatus.maxRetries}`);
      }

      // 显示下一步操作建议
      this.displayNextSteps(config);
    } catch (error) {
      this.logger.error('Failed to display startup status:', error);
    }
  }

  /**
   * 显示下一步操作建议
   */
  private displayNextSteps(config: any): void {
    if (!this.hasStoredRegistrationInfo(config)) {
      this.logger.log('');
      this.logger.log('📝 Next Steps:');
      this.logger.log('   1. Register your device using the registration API');
      this.logger.log('   2. Provide: gateway_address, reward_address, key, code, device_name');
      this.logger.log('   3. The system will automatically connect to the gateway');
    } else if (!config.isRegistered) {
      this.logger.log('');
      this.logger.log('🔄 Auto Registration:');
      this.logger.log('   - The system will automatically retry registration');
      this.logger.log('   - Check network connectivity and gateway availability');
      this.logger.log('   - Verify registration credentials are correct');
    } else {
      this.logger.log('');
      this.logger.log('🎉 Device Ready:');
      this.logger.log('   - Device is registered and connected');
      this.logger.log('   - Heartbeat and monitoring are active');
      this.logger.log('   - Ready to receive tasks from gateway');
    }
  }

  /**
   * 检查是否有存储的注册信息
   */
  private hasStoredRegistrationInfo(config: any): boolean {
    return !!(
      config.gatewayAddress &&
      config.key &&
      config.code &&
      config.rewardAddress &&
      config.deviceName
    );
  }

  /**
   * 获取启动状态
   */
  getStartupStatus(): {
    configInitialized: boolean;
    hasRegistrationInfo: boolean;
    isRegistered: boolean;
    autoRegistrationStatus: any;
  } {
    try {
      const config = this.configService.getCurrentConfig();
      const autoRegStatus = this.autoRegistrationService.getAutoRegistrationStatus();

      return {
        configInitialized: true,
        hasRegistrationInfo: this.hasStoredRegistrationInfo(config),
        isRegistered: config.isRegistered,
        autoRegistrationStatus: autoRegStatus
      };
    } catch (error) {
      this.logger.error('Failed to get startup status:', error);
      return {
        configInitialized: false,
        hasRegistrationInfo: false,
        isRegistered: false,
        autoRegistrationStatus: null
      };
    }
  }

  /**
   * 手动触发重新初始化
   */
  async reinitialize(): Promise<boolean> {
    try {
      this.logger.log('🔄 Manual reinitialization requested...');
      
      await this.initializeDeviceConfig();
      await this.checkAndPerformAutoRegistration();
      this.displayStartupStatus();
      
      this.logger.log('✅ Manual reinitialization completed');
      return true;
    } catch (error) {
      this.logger.error('❌ Manual reinitialization failed:', error);
      return false;
    }
  }
}

// 服务提供者
export const STARTUP_INITIALIZATION_SERVICE = Symbol('STARTUP_INITIALIZATION_SERVICE');

const StartupInitializationServiceProvider = {
  provide: STARTUP_INITIALIZATION_SERVICE,
  useClass: StartupInitializationService
};

export default StartupInitializationServiceProvider;
