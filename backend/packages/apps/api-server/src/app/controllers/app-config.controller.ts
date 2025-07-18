import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { AppConfigurationService } from '../services/app-configuration.service';
import { EnhancedSystemMonitorService } from '@saito/common';

/**
 * 框架切换请求 DTO
 */
interface SwitchFrameworkDto {
  framework: 'ollama' | 'vllm';
  validateAvailability?: boolean;
  stopOthers?: boolean;
  restartRequired?: boolean;
}



/**
 * 应用配置控制器
 * 
 * 提供应用级配置和状态管理的 REST API
 */
@Controller('api/app')
export class AppConfigController {
  private readonly logger = new Logger(AppConfigController.name);

  constructor(
    private readonly appConfigService: AppConfigurationService,
    private readonly systemMonitorService: EnhancedSystemMonitorService
  ) {}

  /**
   * 获取应用状态
   * GET /api/app/status
   */
  @Get('status')
  async getAppStatus() {
    try {
      const status = await this.appConfigService.getAppStatus();
      
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get app status:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get application status',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 切换推理框架
   * POST /api/app/switch-framework
   */
  @Post('switch-framework')
  async switchFramework(@Body() switchDto: SwitchFrameworkDto) {
    try {
      // 验证请求
      if (!['ollama', 'vllm'].includes(switchDto.framework)) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid framework. Must be "ollama" or "vllm"'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.appConfigService.switchFramework(
        switchDto.framework,
        {
          validateAvailability: switchDto.validateAvailability,
          stopOthers: switchDto.stopOthers,
          restartRequired: switchDto.restartRequired
        }
      );

      return {
        success: result.success,
        message: result.message,
        restartRequired: result.restartRequired,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to switch framework:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to switch framework',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  /**
   * 执行应用健康检查
   * GET /api/app/health
   */
  @Get('health')
  async performHealthCheck() {
    try {
      const healthCheck = await this.appConfigService.performHealthCheck();

      return {
        success: healthCheck.overall !== 'critical',
        data: healthCheck,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to perform health check:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to perform health check',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 获取系统资源信息
   * GET /api/app/system-resources
   */
  @Get('system-resources')
  async getSystemResources() {
    try {
      const systemMetrics = await this.systemMonitorService.getSystemMetrics();

      return {
        success: true,
        data: {
          cpu: {
            usage: systemMetrics.cpu.usage,
            temperature: systemMetrics.cpu.temperature,
            cores: systemMetrics.cpu.cores,
            model: systemMetrics.cpu.model
          },
          memory: {
            total: systemMetrics.memory.total,
            used: systemMetrics.memory.used,
            free: systemMetrics.memory.free,
            usage: systemMetrics.memory.usage
          },
          gpu: systemMetrics.gpus.length > 0 ? {
            name: systemMetrics.gpus[0].name,
            memory: {
              total: systemMetrics.gpus[0].memory,
              used: Math.round(systemMetrics.gpus[0].memory * systemMetrics.gpus[0].usage / 100),
              free: Math.round(systemMetrics.gpus[0].memory * (100 - systemMetrics.gpus[0].usage) / 100)
            },
            usage: systemMetrics.gpus[0].usage,
            temperature: systemMetrics.gpus[0].temperature,
            vendor: systemMetrics.gpus[0].vendor
          } : {
            name: 'No GPU detected',
            memory: { total: 0, used: 0, free: 0 },
            usage: 0,
            temperature: 0,
            vendor: 'Unknown'
          },
          gpus: systemMetrics.gpus,
          disk: systemMetrics.disk,
          network: systemMetrics.network,
          os: systemMetrics.os
        },
        timestamp: systemMetrics.timestamp
      };
    } catch (error) {
      this.logger.error('Failed to get system resources:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get system resources',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


}
