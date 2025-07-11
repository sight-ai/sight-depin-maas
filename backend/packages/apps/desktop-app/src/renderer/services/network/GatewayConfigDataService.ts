/**
 * 网关配置数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责网关配置的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供网关配置特定的接口
 */

import { ApiResponse, GatewayConfigData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 网关配置数据服务 - 按照Figma设计实现
 */
export class GatewayConfigDataService extends BaseDataService<GatewayConfigData> {
  async fetch(): Promise<ApiResponse<GatewayConfigData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取网关状态和配置信息
      const [gatewayResponse, configResponse] = await Promise.allSettled([
        this.apiClient.getGatewayStatus(),
        this.apiClient.getCurrentFramework()
      ]);

      // 初始化网关配置数据 - 按照Figma设计
      let gatewayConfigData: GatewayConfigData = {
        connectionStatus: {
          currentGateway: 'gateway.sightai.com',
          latency: '23ms',
          registrationCode: 'ABC123DEF456',
          environment: 'Production'
        },
        gatewaySettings: {
          autoSelectBestGateway: true,
          dnsOverride: false
        },
        availableGateways: [
          {
            name: 'SightAI Main Gateway',
            url: 'gateway.sightai.com',
            region: 'US-East',
            latency: 23,
            status: 'online',
            load: 45
          },
          {
            name: 'SightAI EU Gateway',
            url: 'eu.gateway.sightai.com',
            region: 'EU-West',
            latency: 67,
            status: 'online',
            load: 32
          },
          {
            name: 'SightAI Asia Gateway',
            url: 'asia.gateway.sightai.com',
            region: 'Asia-Pacific',
            latency: 156,
            status: 'online',
            load: 28
          }
        ],
        connectionHistory: [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            gateway: 'gateway.sightai.com',
            status: 'connected',
            latency: 23,
            duration: 300
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            gateway: 'gateway.sightai.com',
            status: 'disconnected',
            latency: 0,
            duration: 0
          }
        ]
      };

      // 处理网关状态
      if (this.isSuccessResponse(gatewayResponse)) {
        const gateway = this.getResponseData(gatewayResponse);
        if (gateway) {
          // 更新连接状态
          gatewayConfigData.connectionStatus = {
            ...gatewayConfigData.connectionStatus,
            currentGateway: this.safeGet(gateway, 'gatewayUrl', gatewayConfigData.connectionStatus.currentGateway),
            latency: this.safeGet(gateway, 'latency', gatewayConfigData.connectionStatus.latency),
            environment: this.safeGet(gateway, 'environment', gatewayConfigData.connectionStatus.environment)
          };
        }
      }

      // 处理配置设置 - getCurrentFramework只返回framework信息，不包含网关配置
      if (this.isSuccessResponse(configResponse)) {
        // getCurrentFramework响应不包含网关配置，保持默认值
        // const config = this.getResponseData(configResponse);
        // gatewayConfigData.gatewaySettings = {
        //   autoSelectBestGateway: config.autoSelectBestGateway ?? gatewayConfigData.gatewaySettings.autoSelectBestGateway,
        //   dnsOverride: config.dnsOverride ?? gatewayConfigData.gatewaySettings.dnsOverride
        // };
      }

      return this.createSuccessResponse(gatewayConfigData);

    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch gateway config data'
      );
    }
  }

  /**
   * 更新网关配置
   */
  async update(data: Partial<GatewayConfigData>): Promise<ApiResponse<GatewayConfigData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 处理网关设置更新
      if (data.gatewaySettings) {
        // 目前没有更新网关设置的API，返回模拟成功
        // 实际应该调用类似 this.apiClient.updateGatewaySettings(data.gatewaySettings) 的方法
        
        // 重新获取最新状态
        return this.fetch();
      }

      return this.createErrorResponse('No valid update data provided');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update gateway config'
      );
    }
  }

  /**
   * 连接到指定网关
   */
  async connectToGateway(gatewayUrl: string): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有连接网关的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.connectToGateway(gatewayUrl) 的方法
      return {
        success: true,
        data: {
          message: `Connecting to gateway: ${gatewayUrl}`,
          gatewayUrl: gatewayUrl,
          status: 'connecting'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to connect to gateway'
      );
    }
  }

  /**
   * 断开网关连接
   */
  async disconnectFromGateway(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有断开网关的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.disconnectFromGateway() 的方法
      return {
        success: true,
        data: {
          message: 'Disconnected from gateway',
          status: 'disconnected'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to disconnect from gateway'
      );
    }
  }

  /**
   * 测试网关连接
   */
  async testGatewayConnection(gatewayUrl: string): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有测试网关连接的API，返回模拟结果
      // 实际应该调用类似 this.apiClient.testGatewayConnection(gatewayUrl) 的方法
      const latency = Math.floor(Math.random() * 100) + 20; // 模拟20-120ms延迟
      
      return {
        success: true,
        data: {
          gatewayUrl: gatewayUrl,
          latency: latency,
          status: latency < 100 ? 'good' : 'slow',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to test gateway connection'
      );
    }
  }
}
