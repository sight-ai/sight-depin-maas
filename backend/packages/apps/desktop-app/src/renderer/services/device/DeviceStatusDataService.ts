/**
 * 设备状态数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责设备状态的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供设备状态特定的接口
 */

import { ApiResponse, DeviceStatusData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 设备状态数据服务
 */
export class DeviceStatusDataService extends BaseDataService<DeviceStatusData> {
  async fetch(): Promise<ApiResponse<DeviceStatusData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取设备状态和系统资源
      const [deviceResponse, systemResponse] = await Promise.allSettled([
        this.apiClient.getDeviceStatus(),
        this.apiClient.getSystemResources()
      ]);

      // 初始化设备状态数据
      let deviceStatusData: DeviceStatusData = {
        deviceId: 'unknown',
        deviceName: 'Unknown Device',
        status: 'unregistered',
        lastSeen: new Date().toISOString(),
        systemInfo: {
          os: 'Unknown',
          cpu: 'Unknown',
          memory: '0GB',
          gpu: 'Unknown'
        },
        networkInfo: {
          ipAddress: '0.0.0.0',
          port: 8761,
          latency: 0
        },
        performance: {
          cpuUsage: 0,
          memoryUsage: 0,
          gpuUsage: 0,
          diskUsage: 0
        }
      };

      // 处理设备状态数据
      if (this.isSuccessResponse(deviceResponse)) {
        const device = this.getResponseData(deviceResponse);
        deviceStatusData = {
          ...deviceStatusData,
          deviceId: this.safeGet(device, 'deviceId', deviceStatusData.deviceId),
          deviceName: this.safeGet(device, 'deviceName', deviceStatusData.deviceName),
          status: this.safeGet(device, 'status', deviceStatusData.status),
          lastSeen: this.safeGet(device, 'lastSeen', deviceStatusData.lastSeen)
        };
      }

      // 处理系统资源数据
      if (this.isSuccessResponse(systemResponse)) {
        const system = this.getResponseData(systemResponse);
        
        deviceStatusData.systemInfo = {
          os: this.safeGet(system, 'os.name', 'Unknown'),
          cpu: this.safeGet(system, 'cpu.model', 'Unknown'),
          memory: `${this.safeGet(system, 'memory.total', 0)}GB`,
          gpu: this.safeGet(system, 'gpu.name', 'Unknown')
        };

        deviceStatusData.performance = {
          cpuUsage: this.safeGet(system, 'cpu.usage', 0),
          memoryUsage: this.safeGet(system, 'memory.usage', 0),
          gpuUsage: this.safeGet(system, 'gpu.usage', 0),
          diskUsage: this.safeGet(system, 'disk.usage', 0)
        };

        deviceStatusData.networkInfo = {
          ipAddress: this.safeGet(system, 'network.ipAddress', '0.0.0.0'),
          port: this.backendStatus?.port || 8761,
          latency: this.safeGet(system, 'network.latency', 0)
        };
      }

      return this.createSuccessResponse(deviceStatusData);

    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch device status data'
      );
    }
  }

  /**
   * 更新设备状态
   */
  async update(data: Partial<DeviceStatusData>): Promise<ApiResponse<DeviceStatusData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // DeviceStatusDataService不处理设备注册
      // 设备注册应该通过DeviceRegistrationDataService处理
      return this.createErrorResponse('Device status update not implemented');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update device status'
      );
    }
  }
}
