/**
 * Dashboard数据服务
 *
 * 遵循SOLID原则：
 * - 单一职责原则：只负责Dashboard页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供Dashboard特定的接口
 */

import { ApiResponse, DashboardData, BackendStatus } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';
import { systemResourcesService } from '../system/SystemResourcesService';
import { serviceStatusService } from '../system/ServiceStatusService';

/**
 * Dashboard数据服务 - 集成真实API接口，带缓存机制
 */
export class DashboardDataService extends BaseDataService<DashboardData> {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_CACHE_TTL = 5000; // 5秒缓存
  private readonly SYSTEM_CACHE_TTL = 2000; // 系统资源2秒缓存
  private readonly SERVICES_CACHE_TTL = 8000; // 服务状态8秒缓存

  constructor(backendStatus: BackendStatus) {
    super(backendStatus);
    // 初始化服务状态监控服务
    serviceStatusService.setApiClient(backendStatus);
  }

  /**
   * 缓存获取方法
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * 缓存设置方法
   */
  private setCachedData<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 缓存API调用
   */
  private async getCachedApiCall<T>(key: string, apiCall: () => Promise<T>): Promise<T> {
    const cached = this.getCachedData<T>(key);
    if (cached) {
      return cached;
    }

    const result = await apiCall();
    this.setCachedData(key, result, this.DEFAULT_CACHE_TTL);
    return result;
  }

  /**
   * 缓存系统资源
   */
  private async getCachedSystemResources(): Promise<any> {
    const cached = this.getCachedData<any>('systemResources');
    if (cached) {
      return { status: 'fulfilled', value: cached };
    }

    try {
      // 设置API客户端
      if (this.backendStatus) {
        systemResourcesService.setApiClient(this.backendStatus);
      }

      const result = await systemResourcesService.getSystemResources();
      this.setCachedData('systemResources', result, this.SYSTEM_CACHE_TTL);
      return { status: 'fulfilled', value: result };
    } catch (error) {
      return { status: 'rejected', reason: error };
    }
  }

  /**
   * 缓存服务状态
   */
  private async getCachedServicesStatus(): Promise<any> {
    const cached = this.getCachedData<any>('servicesStatus');
    if (cached) {
      return { status: 'fulfilled', value: cached };
    }

    try {
      // 优先尝试API调用
      if (this.apiClient) {
        try {
          const apiResult = await this.apiClient.getServicesStatus();
          if (apiResult.success) {
            this.setCachedData('servicesStatus', apiResult, this.SERVICES_CACHE_TTL);
            return { status: 'fulfilled', value: apiResult };
          }
        } catch (apiError) {
          console.warn('API services status call failed, falling back to local service:', apiError);
        }
      }

      // 回退到本地服务状态检查
      const result = await serviceStatusService.getServicesStatus();
      this.setCachedData('servicesStatus', result, this.SERVICES_CACHE_TTL);
      return { status: 'fulfilled', value: result };
    } catch (error) {
      return { status: 'rejected', reason: error };
    }
  }

  async fetch(): Promise<ApiResponse<DashboardData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 检查缓存的完整数据
      const cachedData = this.getCachedData<DashboardData>('dashboard-full');
      if (cachedData) {
        return this.createSuccessResponse(cachedData);
      }

      // 获取或使用缓存的各个数据源
      const [
        statsResponse,
        healthResponse,
        frameworkResponse,
        taskCountResponse,
        earningsResponse,
        deviceStatusResponse,
        systemResourcesResult,
        servicesStatusResult
      ] = await Promise.allSettled([
        this.getCachedApiCall('stats', () => this.apiClient!.getDashboardStatistics()),
        this.getCachedApiCall('health', () => this.apiClient!.getHealth()),
        this.getCachedApiCall('framework', () => this.apiClient!.getCurrentFramework()),
        this.getCachedApiCall('taskCount', () => this.apiClient!.getTaskCount('today')),
        this.getCachedApiCall('earnings', () => this.apiClient!.getEarnings('today')),
        this.getCachedApiCall('deviceStatus', () => this.apiClient!.getDeviceStatus()),
        this.getCachedSystemResources(),
        this.getCachedServicesStatus()
      ]);

      // 处理系统基础信息
      let systemStatus = 'OFFLINE';
      let systemPort = '8716';
      let version = 'v0.9.3 Beta';
      let uptime = '0d 0h 0min';

      if (this.isSuccessResponse(healthResponse)) {
        const health = this.getResponseData(healthResponse);
        systemStatus = health.status === 'OK' ? 'ONLINE' : 'OFFLINE';
        // 格式化uptime
        if (health.uptime) {
          uptime = this.formatUptime(health.uptime);
        }
      }

      if (this.isSuccessResponse(frameworkResponse)) {
        const frameworkData = this.getResponseData(frameworkResponse);
        // 从framework响应中获取基本信息
        version = `v0.9.3 Beta (${frameworkData.framework || 'Unknown'})`;
      }

      // 处理收益统计数据
      let earnings = { today: 0, total: 0, tasks: 0, efficiency: 0 };

      // 从任务统计API获取任务数据
      if (this.isSuccessResponse(taskCountResponse)) {
        const taskData = this.getResponseData(taskCountResponse);
        earnings.tasks = this.safeGet(taskData, 'data.totalTasks', 0);
        earnings.efficiency = this.safeGet(taskData, 'data.successRate', 0);
      }

      // 从收益API获取收益数据
      if (this.isSuccessResponse(earningsResponse)) {
        const earningsData = this.getResponseData(earningsResponse);
        earnings.today = this.safeGet(earningsData, 'data.todayEarnings', 0);
        earnings.total = this.safeGet(earningsData, 'data.totalEarnings', 0);
      }

      // 如果有统计API响应，也使用其数据
      if (this.isSuccessResponse(statsResponse)) {
        const stats = this.getResponseData(statsResponse);
        earnings = {
          today: this.safeGet(stats, 'todayEarnings.totalEarnings', earnings.today),
          total: this.safeGet(stats, 'cumulativeEarnings.totalEarnings', earnings.total),
          tasks: this.safeGet(stats, 'totalTasks', earnings.tasks),
          efficiency: this.calculateEfficiency(stats) || earnings.efficiency
        };
      }

      // 处理系统资源数据
      let systemResources = {
        cpu: { usage: 0, cores: 0, model: 'Unknown' },
        memory: { usage: 0, total: 0, used: 0 },
        gpu: { usage: 0, memory: 0, temperature: 0 },
        disk: { usage: 0, total: 0, used: 0 }
      };

      // 从系统资源服务获取数据
      if (systemResourcesResult.status === 'fulfilled') {
        const systemData = systemResourcesResult.value;
        systemResources = {
          cpu: {
            usage: systemData?.cpu?.usage,
            cores: systemData?.cpu?.cores,
            model: systemData?.cpu?.model
          },
          memory: {
            usage: systemData?.memory?.usage,
            total: systemData?.memory?.total,
            used: systemData?.memory?.used
          },
          gpu: {
            usage: 0, // GPU数据需要额外实现
            memory: 0,
            temperature: 0
          },
          disk: {
            usage: systemData?.disk?.usage,
            total: systemData?.disk?.total,
            used: systemData?.disk?.used
          }
        };
      }

      // 处理服务状态数据
      let services: any[] = [];
      if (servicesStatusResult.status === 'fulfilled') {
        const servicesData = servicesStatusResult.value;

        // 检查是否是从API获取的数据结构
        if (servicesData.data && servicesData.data.services) {
          // 来自后端API的数据结构
          services = servicesData.data.services.map((service: any) => ({
            name: service.name,
            status: service.status,
            port: service.details?.port,
            responseTime: service.details?.responseTime,
            uptime: service.uptime || '0m',
            connections: service.connections || 0,
            icon: service.icon
          }));
        } else if (servicesData.backendApi || servicesData.p2pService || servicesData.gatewayService) {
          // 来自ServiceStatusService的数据结构
          services = [
            {
              name: servicesData.backendApi?.name || 'Backend API',
              status: servicesData.backendApi?.status || 'offline',
              port: servicesData.backendApi?.port,
              responseTime: servicesData.backendApi?.responseTime,
              uptime: this.formatUptime(Date.now() - (servicesData.backendApi?.lastCheck ? new Date(servicesData.backendApi.lastCheck).getTime() : Date.now())),
              connections: servicesData.backendApi?.connections || 0,
              icon: servicesData.backendApi?.icon
            },
            {
              name: servicesData.p2pService?.name || 'P2P Service',
              status: servicesData.p2pService?.status || 'offline',
              port: servicesData.p2pService?.port,
              responseTime: servicesData.p2pService?.responseTime,
              uptime: this.formatUptime(Date.now() - (servicesData.p2pService?.lastCheck ? new Date(servicesData.p2pService.lastCheck).getTime() : Date.now())),
              connections: servicesData.p2pService?.connections || 0,
              icon: servicesData.p2pService?.icon
            },
            {
              name: servicesData.gatewayService?.name || 'Gateway Service',
              status: servicesData.gatewayService?.status || 'offline',
              port: servicesData.gatewayService?.port,
              responseTime: servicesData.gatewayService?.responseTime,
              uptime: this.formatUptime(Date.now() - (servicesData.gatewayService?.lastCheck ? new Date(servicesData.gatewayService.lastCheck).getTime() : Date.now())),
              connections: servicesData.gatewayService?.connections || 0,
              icon: servicesData.gatewayService?.icon
            }
          ];
        }
      }

      // 如果没有获取到服务数据，提供默认数据
      if (services.length === 0) {
        services = [
          {
            name: 'Backend API',
            status: 'offline',
            uptime: '0m',
            connections: 0,
            port: this.backendStatus?.port || 8716,
            responseTime: 0
          },
          {
            name: 'P2P Service',
            status: 'offline',
            uptime: '0m',
            connections: 0,
            port: 4010,
            responseTime: 0
          },
          {
            name: 'Gateway Service',
            status: 'offline',
            uptime: '0m',
            connections: 0,
            port: 0,
            responseTime: 0
          }
        ];
      }

      // 处理设备注册信息
      let deviceInfo = {
        isRegistered: false,
        deviceId: '',
        deviceName: '',
        gatewayAddress: '',
        rewardAddress: ''
      };

      if (this.isSuccessResponse(deviceStatusResponse)) {
        const deviceData = this.getResponseData(deviceStatusResponse);
        deviceInfo = {
          isRegistered: this.safeGet(deviceData, 'data.isRegistered', false),
          deviceId: this.safeGet(deviceData, 'data.deviceId', ''),
          deviceName: this.safeGet(deviceData, 'data.deviceName', ''),
          gatewayAddress: this.safeGet(deviceData, 'data.gatewayAddress', ''),
          rewardAddress: this.safeGet(deviceData, 'data.rewardAddress', '')
        };
      }

      // 构建Dashboard数据
      const dashboardData: DashboardData = {
        systemInfo: {
          status: systemStatus,
          port: systemPort,
          version: version,
          uptime: uptime
        },
        earnings: earnings,
        systemResources: systemResources,
        services: services,
        deviceInfo: deviceInfo,
        recentActivity: []
      };

      // 缓存完整的Dashboard数据
      this.setCachedData('dashboard-full', dashboardData, 3000); // 3秒缓存

      return this.createSuccessResponse(dashboardData);

    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      );
    }
  }

  /**
   * 计算系统效率
   */
  private calculateEfficiency(stats: any): number {
    const totalTasks = this.safeGet(stats, 'totalTasks', 0);
    const completedTasks = this.safeGet(stats, 'taskStatusBreakdown.completed', 0);
    
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  }
}
