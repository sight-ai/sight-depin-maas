import {
  IDirectServiceAccess,
  IUserInterface,
  IStorageManager,
  CommandResult,
  RegisterOptions,
  BoxType
} from '../../abstractions/cli.interfaces';

/**
 * 设备命令处理器 
 * 只负责设备相关命令的处理逻辑，直接使用libs服务
 */
export class DeviceCommandsHandler {
  constructor(
    private readonly serviceAccess: IDirectServiceAccess,
    private readonly ui: IUserInterface,
    private readonly storage: IStorageManager
  ) {}

  /**
   * 处理设备注册命令
   */
  async handleRegister(options: RegisterOptions): Promise<CommandResult> {
    this.ui.info('Device Registration');

    const spinner = this.ui.showSpinner('Registering device...');
    spinner.start();

    try {
      // 1. 检查是否已注册
      const existingRegistration = await this.storage.loadRegistration();
      if (existingRegistration?.isRegistered) {
        spinner.warn('Device is already registered');
        
        const shouldReregister = await this.ui.confirm(
          'Device is already registered. Do you want to re-register?',
          false
        );
        
        if (!shouldReregister) {
          return {
            success: false,
            error: 'Registration cancelled by user',
            timestamp: new Date().toISOString()
          };
        }
      }

      // 2. 收集注册信息
      const registrationData = await this.collectRegistrationData(options);
      
      // 3. 执行注册
      const registrationResult = await this.performRegistration(registrationData);
      
      if (registrationResult.success) {
        spinner.succeed('Device registered successfully');
        this.showRegistrationSuccess(registrationResult.data);

        return {
          success: true,
          data: registrationResult.data,
          timestamp: new Date().toISOString()
        };
      } else {
        spinner.fail('Registration failed');
        this.ui.error(registrationResult.error || 'Registration failed');
        return registrationResult;
      }

    } catch (error) {
      spinner.fail('Registration error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Registration failed: ${JSON.stringify(errorMessage)}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'REGISTRATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理设备注销命令
   */
  async handleUnregister(): Promise<CommandResult> {
    try {
      // 1. 检查注册状态
      const registration = await this.storage.loadRegistration();
      if (!registration?.isRegistered) {
        this.ui.warning('Device is not registered');
        return {
          success: false,
          error: 'Device is not registered',
          timestamp: new Date().toISOString()
        };
      }

      // 2. 确认注销
      const confirmed = await this.ui.confirm(
        'Are you sure you want to unregister this device?',
        false
      );

      if (!confirmed) {
        this.ui.info('Unregistration cancelled');
        return {
          success: false,
          error: 'Unregistration cancelled by user',
          timestamp: new Date().toISOString()
        };
      }

      const spinner = this.ui.showSpinner('Unregistering device...');
      spinner.start();

      // 3. 执行注销
      const unregisterResult = await this.performUnregistration();

      if (unregisterResult.success) {
        // 4. 清除本地注册信息
        await this.storage.clearRegistration();

        spinner.succeed('Device unregistered successfully');
        this.ui.success('Device has been unregistered from the gateway');

        return {
          success: true,
          data: unregisterResult.data,
          timestamp: new Date().toISOString()
        };
      } else {
        spinner.fail('Unregistration failed');
        this.ui.error(unregisterResult.error || 'Unregistration failed');
        return {
          success: false,
          error: unregisterResult.error,
          code: unregisterResult.code,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Unregistration failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'UNREGISTRATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理设备状态查询命令
   */
  async handleStatus(): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Checking device status...');
    spinner.start();

    try {
      // 1. 获取本地注册信息
      const localRegistration = await this.storage.loadRegistration();
      
      // 2. 获取远程设备状态
      const [deviceStatus, healthStatus] = await Promise.allSettled([
        this.getDeviceStatus(),
        this.getDeviceHealth()
      ]);

      spinner.stop();

      // 3. 显示状态信息
      this.showDeviceStatus({
        localRegistration,
        deviceStatus: deviceStatus.status === 'fulfilled' ? deviceStatus.value : null,
        healthStatus: healthStatus.status === 'fulfilled' ? healthStatus.value : null
      });

      return {
        success: true,
        data: {
          localRegistration,
          deviceStatus: deviceStatus.status === 'fulfilled' ? deviceStatus.value : null,
          healthStatus: healthStatus.status === 'fulfilled' ? healthStatus.value : null
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Failed to get device status');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Status check failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'STATUS_CHECK_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 收集注册数据
   */
  private async collectRegistrationData(options: RegisterOptions): Promise<any> {
    const data: any = {};

    // 从选项或交互式输入收集数据
    data.code = options.code || await this.ui.input('Enter registration code:');
    data.gateway_address = options.gatewayAddress || await this.ui.input('Enter gateway address:', 'http://localhost:8716');
    data.reward_address = options.rewardAddress || await this.ui.input('Enter reward address:');
    data.key = options.key || await this.ui.input('Enter authentication key:');
    data.base_path = options.basePath || await this.ui.input('Enter base path (optional):', '');

    return data;
  }

  /**
   * 执行注销
   */
  private async performUnregistration(): Promise<CommandResult> {
    try {
      // 调用本地 API 接口进行注销
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch('http://localhost:8716/api/v1/device-status/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          code: 'UNREGISTRATION_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      // 检查是否是连接错误（后台服务未运行）
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Backend API server may be slow or unresponsive.',
          code: 'TIMEOUT_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.cause?.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Backend API server is not running. Please start the backend server first using: ./sightai start',
          code: 'CONNECTION_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: error.message || 'Unregistration error',
        code: 'UNREGISTRATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取设备状态
   */
  private async getDeviceStatus(): Promise<any> {
    try {
      const deviceService = await this.serviceAccess.getDeviceStatusService();
      const currentDevice = await deviceService.getCurrentDevice();

      return {
        success: !!currentDevice,
        data: { currentDevice }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get device status'
      };
    }
  }

  /**
   * 获取设备健康状态
   */
  private async getDeviceHealth(): Promise<any> {
    try {
      const servicesHealth = await this.serviceAccess.checkServicesHealth();

      return {
        success: servicesHealth.isHealthy,
        data: { health: servicesHealth }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get device health'
      };
    }
  }

  /**
   * 执行注册 - 调用本地 API 接口
   */
  private async performRegistration(data: any): Promise<CommandResult> {
    try {
      // 构建请求数据
      const requestData = {
        code: data.code,
        gateway_address: data.gateway_address,
        reward_address: data.reward_address,
        basePath: data.base_path,
        key: data.key
      };

      // 调用本地 API 接口
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch('http://localhost:8716/api/v1/device-status/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(response)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          code: 'REGISTRATION_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      const result = await response.json() as { deviceId?: string; message?: string };

      return {
        success: true,
        data: {
          deviceInfo: {
            gatewayAddress: requestData.gateway_address,
            rewardAddress: requestData.reward_address,
            registeredAt: new Date().toISOString(),
            deviceId: result.deviceId || 'unknown'
          },
          message: result.message || 'Registration successful'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      // 检查是否是连接错误（后台服务未运行）
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Backend API server may be slow or unresponsive.',
          code: 'TIMEOUT_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.cause?.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Backend API server is not running. Please start the backend server first using: ./sightai start',
          code: 'CONNECTION_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: error.message || 'Registration error',
        code: 'REGISTRATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }



  /**
   * 显示注册成功信息
   */
  private showRegistrationSuccess(data: any): void {
    this.ui.showBox(
      'Registration Successful',
      `Device has been successfully registered with the gateway.\n\n` +
      `Gateway: ${data.deviceInfo?.gatewayAddress || 'N/A'}\n` +
      `Reward Address: ${data.deviceInfo?.rewardAddress || 'N/A'}\n\n` +
      `Next steps:\n` +
      `• Heartbeat service will start automatically\n` +
      `• Device status will be monitored\n` +
      `• Use 'status' command to check device status`,
      BoxType.SUCCESS
    );
  }

  /**
   * 显示设备状态
   */
  private showDeviceStatus(statusData: any): void {
    this.ui.showTitle('Device Status');

    // 本地注册状态
    this.ui.showSubtitle('Local Registration');
    if (statusData.localRegistration) {
      this.ui.showKeyValue('Device ID', statusData.localRegistration.deviceId);
      this.ui.showKeyValue('Device Name', statusData.localRegistration.deviceName);
      this.ui.showKeyValue('Gateway', statusData.localRegistration.gatewayAddress);
      this.ui.showKeyValue('Registered', statusData.localRegistration.isRegistered ? 'Yes' : 'No');
      this.ui.showKeyValue('Registration Time', statusData.localRegistration.timestamp);
    } else {
      this.ui.warning('No local registration found');
    }

    console.log();

    // 远程状态
    this.ui.showSubtitle('Remote Status');
    if (statusData.deviceStatus?.success) {
      const device = statusData.deviceStatus.data?.currentDevice;
      if (device) {
        this.ui.showKeyValue('Status', device.status || 'Unknown');
        this.ui.showKeyValue('Last Update', device.updated_at || 'Unknown');
        this.ui.showKeyValue('Created', device.created_at || 'Unknown');
      } else {
        this.ui.warning('Device not found on gateway');
      }
    } else {
      this.ui.error('Failed to get remote device status');
    }

    console.log();

    // 健康状态
    this.ui.showSubtitle('Health Status');
    if (statusData.healthStatus?.success) {
      const health = statusData.healthStatus.data?.health;
      if (health) {
        this.ui.showKeyValue('Overall Status', health.overall);
        this.ui.showKeyValue('Device Component', health.components?.device?.status || 'Unknown');
        this.ui.showKeyValue('Gateway Component', health.components?.gateway?.status || 'Unknown');
        this.ui.showKeyValue('Configuration', health.components?.configuration?.status || 'Unknown');
        
        if (health.issues && health.issues.length > 0) {
          console.log();
          this.ui.warning('Issues:');
          this.ui.showList(health.issues);
        }
      }
    } else {
      this.ui.error('Failed to get health status');
    }
  }
}
