/**
 * 服务状态监控服务
 * 
 * 检查各个端口的连通性和服务状态
 * 遵循SOLID原则：
 * - 单一职责原则：只负责服务状态的检查
 * - 依赖倒置原则：通过接口提供数据
 */

import { ApiClient } from '../../utils/api-client';
import { BackendStatus } from '../../hooks/types';

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'unknown';
  port: number;
  url: string;
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface ServicesStatusData {
  backendApi: ServiceStatus;
  p2pService: ServiceStatus;
  gatewayService: ServiceStatus;
  overall: {
    status: 'healthy' | 'degraded' | 'offline';
    onlineCount: number;
    totalCount: number;
  };
}

export class ServiceStatusService {
  private static instance: ServiceStatusService;
  private apiClient: ApiClient | null = null;

  private constructor() {}

  public static getInstance(): ServiceStatusService {
    if (!ServiceStatusService.instance) {
      ServiceStatusService.instance = new ServiceStatusService();
    }
    return ServiceStatusService.instance;
  }

  /**
   * 设置API客户端
   */
  setApiClient(backendStatus: BackendStatus): void {
    this.apiClient = new ApiClient(backendStatus);
  }

  /**
   * 获取所有服务状态
   */
  async getServicesStatus(): Promise<ServicesStatusData> {
    const now = new Date().toISOString();
    
    // 并行检查所有服务
    const [backendStatus, p2pStatus, gatewayStatus] = await Promise.allSettled([
      this.checkBackendApiService(),
      this.checkP2PService(),
      this.checkGatewayService()
    ]);

    const services = {
      backendApi: this.getServiceResult(backendStatus, 'Backend API', 8716, now),
      p2pService: this.getServiceResult(p2pStatus, 'P2P Service', 4010, now),
      gatewayService: this.getServiceResult(gatewayStatus, 'Gateway Service', 0, now) // Gateway doesn't have a fixed port
    };

    // 计算整体状态
    const onlineServices = Object.values(services).filter(s => s.status === 'online');
    const totalServices = Object.values(services).length;
    
    let overallStatus: 'healthy' | 'degraded' | 'offline';
    if (onlineServices.length === totalServices) {
      overallStatus = 'healthy';
    } else if (onlineServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'offline';
    }

    return {
      ...services,
      overall: {
        status: overallStatus,
        onlineCount: onlineServices.length,
        totalCount: totalServices
      }
    };
  }

  /**
   * 检查Backend API服务状态
   */
  private async checkBackendApiService(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.apiClient) {
        throw new Error('API client not initialized');
      }

      const response = await this.apiClient.getHealth();
      const responseTime = Date.now() - startTime;

      if (response.success) {
        return {
          name: 'Backend API',
          status: 'online',
          port: 8716,
          url: 'http://localhost:8716',
          responseTime,
          lastCheck: new Date().toISOString()
        };
      } else {
        throw new Error(response.error || 'Health check failed');
      }
    } catch (error) {
      return {
        name: 'Backend API',
        status: 'offline',
        port: 8716,
        url: 'http://localhost:8716',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 检查P2P服务状态
   */
  private async checkP2PService(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // 使用AbortController实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:4010/health', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          name: 'P2P Service',
          status: 'online',
          port: 4010,
          url: 'http://localhost:4010',
          responseTime,
          lastCheck: new Date().toISOString()
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        name: 'P2P Service',
        status: 'offline',
        port: 4010,
        url: 'http://localhost:4010',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * 检查Gateway服务状态
   */
  private async checkGatewayService(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      if (!this.apiClient) {
        throw new Error('API client not initialized');
      }

      const response = await this.apiClient.getGatewayStatus();
      const responseTime = Date.now() - startTime;

      if (response.success && response.data) {
        // 安全地访问响应数据属性
        const gatewayData = response.data as any;
        const isConnected = gatewayData.isRegistered && gatewayData.status === 'success';

        return {
          name: 'Gateway Service',
          status: isConnected ? 'online' : 'offline',
          port: 0, // Gateway doesn't have a local port
          url: 'Gateway Connection',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: isConnected ? undefined : gatewayData.error
        };
      } else {
        throw new Error(response.error || 'Gateway status check failed');
      }
    } catch (error) {
      return {
        name: 'Gateway Service',
        status: 'offline',
        port: 0,
        url: 'Gateway Connection',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 从Promise结果中提取服务状态
   */
  private getServiceResult(
    result: PromiseSettledResult<ServiceStatus>,
    defaultName: string,
    defaultPort: number,
    timestamp: string
  ): ServiceStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        name: defaultName,
        status: 'offline',
        port: defaultPort,
        url: `http://localhost:${defaultPort}`,
        lastCheck: timestamp,
        error: result.reason?.message || 'Service check failed'
      };
    }
  }

  /**
   * 检查单个端口的连通性
   */
  async checkPortConnectivity(port: number, timeout: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`http://localhost:${port}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 格式化响应时间
   */
  formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  }
}

// 导出单例实例
export const serviceStatusService = ServiceStatusService.getInstance();
