/**
 * Dashboard数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责Dashboard页面的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供Dashboard特定的接口
 */

import { ApiResponse, DashboardData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * Dashboard数据服务 - 集成真实API接口
 */
export class DashboardDataService extends BaseDataService<DashboardData> {
  async fetch(): Promise<ApiResponse<DashboardData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取多个数据源
      const [
        statsResponse,
        systemResponse,
        healthResponse,
        frameworkResponse,
        servicesResponse
      ] = await Promise.allSettled([
        this.apiClient.getDashboardStatistics(),
        this.apiClient.getSystemResources(),
        this.apiClient.getHealth(),
        this.apiClient.getCurrentFramework(),
        this.apiClient.getServicesStatus()
      ]);

      // 处理系统基础信息
      let systemStatus = 'OFFLINE';
      let systemPort = '8761';
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
      if (this.isSuccessResponse(statsResponse)) {
        const stats = this.getResponseData(statsResponse);
        earnings = {
          today: this.safeGet(stats, 'todayEarnings.totalEarnings', 0),
          total: this.safeGet(stats, 'cumulativeEarnings.totalEarnings', 0),
          tasks: this.safeGet(stats, 'totalTasks', 0),
          efficiency: this.calculateEfficiency(stats)
        };
      }

      // 处理系统资源数据
      let systemResources = {
        cpu: { usage: 0, cores: 0, model: 'Unknown' },
        memory: { usage: 0, total: 0, used: 0 },
        gpu: { usage: 0, memory: 0, temperature: 0 },
        disk: { usage: 0, total: 0, used: 0 }
      };

      if (this.isSuccessResponse(systemResponse)) {
        const system = this.getResponseData(systemResponse);
        systemResources = {
          cpu: {
            usage: this.safeGet(system, 'cpu.usage', 0),
            cores: this.safeGet(system, 'cpu.cores', 0),
            model: this.safeGet(system, 'cpu.model', 'Unknown')
          },
          memory: {
            usage: this.safeGet(system, 'memory.usage', 0),
            total: this.safeGet(system, 'memory.total', 0),
            used: this.safeGet(system, 'memory.used', 0)
          },
          gpu: {
            usage: this.safeGet(system, 'gpu.usage', 0),
            memory: this.safeGet(system, 'gpu.memory.total', 0),
            temperature: this.safeGet(system, 'gpu.temperature', 0)
          },
          disk: {
            usage: this.safeGet(system, 'disk.usage', 0),
            total: this.safeGet(system, 'disk.total', 0),
            used: this.safeGet(system, 'disk.used', 0)
          }
        };
      }

      // 处理服务状态数据
      let services: any[] = [];
      if (this.isSuccessResponse(servicesResponse)) {
        const servicesData = this.getResponseData(servicesResponse);
        services = this.safeGet(servicesData, 'services', []);
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
        recentActivity: []
      };

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
