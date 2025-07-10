import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { AppConfigurationService } from '../services/app-configuration.service';
import {
  RequestValidators,
  type AppConfig
} from '@saito/models';
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
 * 资源限制设置请求 DTO
 */
interface SetResourceLimitsDto {
  framework: 'ollama' | 'vllm';
  gpuIds?: number[];
  memoryLimit?: string;
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
   * 获取应用配置
   * GET /api/app/config
   */
  @Get('config')
  async getAppConfig() {
    try {
      const config = await this.appConfigService.getAppConfig();

      return {
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get app config:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get application configuration',
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
      // 使用增强的系统监控服务获取完整的系统指标
      const systemMetrics = await this.systemMonitorService.getSystemMetrics();

      return {
        success: true,
        data: {
          // 保持向后兼容的字段名
          cpuUsage: systemMetrics.cpu.usage,
          memoryUsage: systemMetrics.memory.usage,
          gpus: systemMetrics.gpus.map(gpu => ({
            name: gpu.name,
            memory: gpu.memory,
            usage: gpu.usage,
            temperature: gpu.temperature,
            vendor: gpu.vendor
          })),
          // 新增的详细系统信息
          cpu: systemMetrics.cpu,
          memory: systemMetrics.memory,
          disk: systemMetrics.disk,
          network: systemMetrics.network,
          os: systemMetrics.os,
          timestamp: systemMetrics.timestamp
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



  /**
   * 更新应用配置
   * PUT /api/app/config
   */
  @Put('config')
  async updateAppConfig(@Body() configUpdate: Partial<AppConfig>) {
    try {
      // 验证请求数据
      if (configUpdate.frameworkConfig) {
        RequestValidators.validateFrameworkConfig(configUpdate.frameworkConfig);
      }

      const result = await this.appConfigService.updateAppConfig(configUpdate);
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new HttpException(
          {
            success: false,
            message: result.message
          },
          HttpStatus.BAD_REQUEST
        );
      }
    } catch (error) {
      this.logger.error('Failed to update app config:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update application configuration',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

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
   * 获取应用初始化结果
   * GET /api/app/initialization
   */
  @Get('initialization')
  async getInitializationResult() {
    try {
      const result = this.appConfigService.getInitializationResult();
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get initialization result:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get initialization result',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 检查应用是否就绪
   * GET /api/app/ready
   */
  @Get('ready')
  async checkAppReady() {
    try {
      const isReady = this.appConfigService.isAppReady();
      
      return {
        success: true,
        data: {
          ready: isReady,
          message: isReady ? 'Application is ready' : 'Application is not ready'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to check app readiness:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to check application readiness',
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

      const statusCode = result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST;
      
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
   * 设置资源限制
   * POST /api/app/resource-limits
   */
  @Post('resource-limits')
  async setResourceLimits(@Body() limitsDto: SetResourceLimitsDto) {
    try {
      // 验证请求
      if (!['ollama', 'vllm'].includes(limitsDto.framework)) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid framework. Must be "ollama" or "vllm"'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.appConfigService.setResourceLimits(
        limitsDto.framework,
        {
          gpuIds: limitsDto.gpuIds,
          memoryLimit: limitsDto.memoryLimit
        }
      );

      const statusCode = result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST;
      
      return {
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to set resource limits:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to set resource limits',
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
      
      // 根据健康状态设置 HTTP 状态码
      let statusCode = HttpStatus.OK;
      if (healthCheck.overall === 'critical') {
        statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      } else if (healthCheck.overall === 'warning') {
        statusCode = HttpStatus.PARTIAL_CONTENT;
      }

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
}
