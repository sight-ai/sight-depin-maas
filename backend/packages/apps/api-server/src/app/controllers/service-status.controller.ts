import { Controller, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { UnifiedHealthService } from '../services/unified-health.service';
import * as net from 'net';
import { DeviceStatusService } from '@saito/device-status';
import { UnifiedConfigService } from '../services/unified-config.service';
import { IModelClient, UnifiedModelService } from '@saito/model-inference-client';

/**
 * 服务状态控制器
 * 
 * 提供各种服务的运行状态监控，包括：
 * - Backend API 服务状态
 * - Local Model Service 状态
 * - Gateway Connection 状态
 * - LibP2P Communication 状态
 */
@Controller('/api/v1/services')
export class ServiceStatusController {
  private readonly logger = new Logger(ServiceStatusController.name);

  constructor(
    private readonly unifiedHealthService: UnifiedHealthService,
    private readonly deviceStatusService: DeviceStatusService,
    private readonly unifiedConfigService: UnifiedConfigService,
    private readonly ollamaService: UnifiedModelService,
    private readonly vllmService: UnifiedModelService
  ) { }

  /**
   * 获取所有服务状态
   * GET /api/v1/services/status
   */
  @Get('/status')
  async getAllServicesStatus() {
    try {
      // 获取基础健康状态
      const healthStatus = this.unifiedHealthService.getDetailedHealth();

      // 模拟各种服务状态 - 实际实现时需要调用相应的服务
      const services = [
        {
          name: 'Backend API',
          status: healthStatus.status === 'OK' ? 'online' : 'offline',
          uptime: this.formatUptime(healthStatus.uptime),
          connections: 1,
          icon: '/icons/backend-api.png',
          details: {
            port: 3000,
            version: '1.0.0',
            lastCheck: new Date().toISOString()
          }
        },
        {
          name: 'Local Model Service',
          status: await this.checkModelServiceStatus(),
          uptime: '12h+',
          connections: 2,
          icon: '/icons/model-service.png',
          details: {
            framework: 'ollama', // 或 'vllm'
            modelsLoaded: 2,
            lastCheck: new Date().toISOString()
          }
        },
        {
          name: 'Gateway Connection',
          status: await this.checkGatewayStatus(),
          uptime: '0m',
          connections: 0,
          icon: '/icons/gateway.png',
          details: {
            gatewayUrl: 'gateway.sightai.com',
            latency: '23ms',
            lastCheck: new Date().toISOString()
          }
        },
        {
          name: 'LibP2P Communication',
          status: await this.checkLibP2PStatus(),
          uptime: '0m',
          connections: 0,
          icon: '/icons/p2p.png',
          details: {
            peerId: '12D3KooWABC...',
            listeningPort: 4001,
            lastCheck: new Date().toISOString()
          }
        }
      ];

      return {
        success: true,
        data: {
          services,
          summary: {
            total: services.length,
            online: services.filter(s => s.status === 'online').length,
            warning: services.filter(s => s.status === 'warning').length,
            offline: services.filter(s => s.status === 'offline').length
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get services status:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get services status',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 获取特定服务状态
   * GET /api/v1/services/:serviceName/status
   */
  @Get('/:serviceName/status')
  async getServiceStatus() {
    // 这里可以实现获取特定服务状态的逻辑
    return {
      success: true,
      message: 'Service-specific status endpoint - to be implemented',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 检查模型服务状态
   */
  private async checkModelServiceStatus(): Promise<'online' | 'warning' | 'offline'> {
    try {
      const framework = this.unifiedConfigService.getCurrentFramework();
      if (framework === 'ollama') {
        if (await this.ollamaService.checkStatus()) {
          return 'online';
        } else {
          return 'offline';
        }
      } else if (framework === 'vllm') {
        if (await this.vllmService.checkStatus()) {
          return 'online';
        } else {
          return 'offline';
        }
      } else {
        return 'warning';
      }
    } catch (error) {
      this.logger.warn('Failed to check model service status:', error);
      return 'offline';
    }
  }

  /**
   * 检查网关连接状态
   */
  private async checkGatewayStatus(): Promise<'online' | 'warning' | 'offline'> {
    try {
      // 这里应该检查网关连接状态
      // 目前返回模拟状态
      const data = await this.deviceStatusService.getGatewayStatus()
      return data.isRegistered ? 'online' : 'offline';
    } catch (error) {
      this.logger.warn('Failed to check gateway status:', error);
      return 'offline';
    }
  }

  /**
   * 检查LibP2P通信状态
   */
  private async checkLibP2PStatus(): Promise<'online' | 'offline'> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(1000); // 1 秒超时
      socket.once('connect', () => {
        socket.destroy();
        resolve('online');
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve('offline');
      });

      socket.once('error', () => {
        resolve('offline');
      });

      socket.connect(4010, '127.0.0.1');
    });
  }

  /**
   * 格式化运行时间
   */
  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}
