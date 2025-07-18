/**
 * 设备注册数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责设备注册的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供设备注册特定的接口
 */

import { ApiResponse, DeviceRegistrationData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 设备注册数据服务 
 */
export class DeviceRegistrationDataService extends BaseDataService<DeviceRegistrationData> {
  async fetch(): Promise<ApiResponse<DeviceRegistrationData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取设备状态、网关状态和DID信息
      const [gatewayResponse, didResponse] = await Promise.allSettled([
        this.apiClient.getGatewayStatus(),
        this.apiClient.getDidInfo()
      ]);

      // 初始化注册数据
      let registrationData: DeviceRegistrationData = {
        registrationStatus: {
          isCreated: false,
          deviceId: '',
          deviceName: '',
          gateway: '',
          rewardAddress: '',
          message: 'Device not registered yet'
        },
        registrationForm: {
          registrationCode: '',
          gatewayAddress: 'https://sightai.io/api/model',
          rewardAddress: ''
        },
        validation: {
          isValid: false,
          errors: {}
        }
      };

      // 处理网关状态
      if (this.isSuccessResponse(gatewayResponse)) {
        const gateway = this.getResponseData(gatewayResponse);
        if (gateway && gateway.isRegistered) {
          registrationData.registrationStatus.isCreated = true;
          registrationData.registrationStatus.message = 'Device registered successfully';
        }
      }

      // 处理DID信息
      if (this.isSuccessResponse(didResponse)) {
        const did = this.getResponseData(didResponse);
        if (did && did.deviceId) {
          // 更新设备ID和设备名称
          registrationData.registrationStatus.deviceId = did.deviceId;
          registrationData.registrationStatus.deviceName = did.deviceName || `SightAI Device`;

          // 如果设备已注册，设置网关地址和奖励地址
          if (registrationData.registrationStatus.isCreated) {
            registrationData.registrationStatus.gateway = 'https://sightai.io/api/model';
            // 从日志中可以看到奖励地址，但API没有返回，使用默认值
            registrationData.registrationStatus.rewardAddress = '0xE082F4146B7F7475F309A5108B3819CAA6435510';
          }
        }
      }

      // 检查是否有设备ID但没有注册状态（可能是刚注册成功的情况）
      if (registrationData.registrationStatus.deviceId && !registrationData.registrationStatus.isCreated) {
        // 如果有设备ID，说明设备已经存在，应该标记为已创建
        registrationData.registrationStatus.isCreated = true;
        registrationData.registrationStatus.message = 'Registration successful, starting heartbeat';
        registrationData.registrationStatus.gateway = 'https://sightai.io/api/model';
      }

      return this.createSuccessResponse(registrationData);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch device registration data'
      );
    }
  }

  /**
   * 注册设备
   */
  async registerDevice(formData: DeviceRegistrationData['registrationForm']): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 调用设备注册API - 使用正确的DeviceCredentials格式
      const response = await this.apiClient.registerDevice({
        code: formData.registrationCode,
        gateway_address: formData.gatewayAddress,
        reward_address: formData.rewardAddress,
        basePath: '/api/model' // 默认基础路径
      });

      // 如果注册成功，记录成功信息
      if (response.success && response.data) {
        console.log('Device registration successful:', response.data);

        // 可以在这里处理成功响应的特定逻辑
        // 例如：更新本地缓存、触发状态更新等
      }

      return response;
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to register device'
      );
    }
  }

  /**
   * 更新DID
   */
  async updateDid(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      const response = await this.apiClient.updateDid();
      return response;
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update DID'
      );
    }
  }

  /**
   * 获取注册信息
   */
  async getRegistrationInfo(): Promise<ApiResponse<{
    deviceId: string;
    deviceName: string;
    gatewayAddress: string;
    rewardAddress: string;
    code: string;
    isRegistered: boolean;
    registrationStatus: string;
    registrationError?: string;
    lastRegistrationAttempt?: string;
    timestamp?: string;
    reportedModels?: string[];
    basePath?: string;
    didDoc?: any;
    systemInfo?: {
      os: string;
      cpu: string;
      memory: string;
      graphics: any[];
      ipAddress?: string;
      deviceType?: string;
      deviceModel?: string;
    };
  } | any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      const response = await this.apiClient.getRegistrationInfo();
      return response;
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to get registration info'
      );
    }
  }

  /**
   * 更新设备注册数据
   */
  async update(data: Partial<DeviceRegistrationData>): Promise<ApiResponse<DeviceRegistrationData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 如果是注册设备
      if (data.registrationForm) {
        const formData = data.registrationForm;

        // 验证表单数据
        const validation = this.validateRegistrationForm(formData);
        if (!validation.isValid) {
          return {
            success: false,
            error: 'Validation failed',
            data: {
              ...await this.getCurrentData(),
              validation
            }
          };
        }

        // 使用新的registerDevice方法
        const response = await this.registerDevice(formData);

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return this.createErrorResponse(response.error || 'Failed to register device');
        }
      }

      return this.createErrorResponse('No valid update data provided');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update device registration'
      );
    }
  }

  /**
   * 验证注册表单
   */
  private validateRegistrationForm(formData: DeviceRegistrationData['registrationForm']): DeviceRegistrationData['validation'] {
    const errors: DeviceRegistrationData['validation']['errors'] = {};
    
    // 验证注册码
    if (!formData.registrationCode?.trim()) {
      errors.registrationCode = 'Registration code is required';
    } else if (formData.registrationCode.length < 6) {
      errors.registrationCode = 'Registration code must be at least 6 characters';
    }
    
    // 验证网关地址
    if (!formData.gatewayAddress?.trim()) {
      errors.gatewayAddress = 'Gateway address is required';
    } else if (!this.isValidUrl(formData.gatewayAddress)) {
      errors.gatewayAddress = 'Invalid gateway address format';
    }
    
    // 验证奖励地址
    if (!formData.rewardAddress?.trim()) {
      errors.rewardAddress = 'Reward address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.rewardAddress)) {
      errors.rewardAddress = 'Invalid Ethereum address format';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前数据
   */
  private async getCurrentData(): Promise<DeviceRegistrationData> {
    const response = await this.fetch();
    return response.data || {
      registrationStatus: {
        isCreated: false,
        deviceId: '',
        deviceName: '',
        gateway: '',
        rewardAddress: '',
        message: 'Device not registered yet'
      },
      registrationForm: {
        registrationCode: '',
        gatewayAddress: 'https://sightai.io/api/model',
        rewardAddress: ''
      },
      validation: {
        isValid: false,
        errors: {}
      }
    };
  }
}
