import { Body, Controller, Get, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { UnifiedModelService } from "@saito/model-inference-client";
import { OllamaProcessManagerService } from "@saito/model-inference-framework-management";

// Ollama 启动配置 Schema（目前为空，但保留扩展性）
const OllamaStartSchema = z.object({
  // Ollama不需要启动配置项，使用默认配置
});

export class OllamaStartDto extends createZodDto(OllamaStartSchema) { }

/**
 * Ollama 进程管理控制器
 * 
 * 职责：
 * 1. Ollama 进程的启动、停止、重启
 * 2. Ollama 进程状态查询
 * 3. 遵循单一职责原则 - 只负责 Ollama 进程管理
 */
@Controller('/api/v1/ollama/process')
export class OllamaProcessController {
  private readonly logger = new Logger(OllamaProcessController.name);

  constructor(
    private readonly unifiedModelService: UnifiedModelService,
    private readonly ollamaProcessManager: OllamaProcessManagerService
  ) {}

  /**
   * 启动 Ollama 服务
   */
  @Post('/start')
  async startOllama(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'ollama') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not Ollama. Please switch to Ollama first.',
          currentFramework
        });
        return;
      }

      // Ollama使用默认配置启动，不需要额外配置项
      const config = {};

      const result = await this.ollamaProcessManager.startOllamaService(config);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          pid: result.pid,
          note: 'Ollama service started with default configuration'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      this.logger.error('Error starting Ollama:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 停止 Ollama 服务
   */
  @Post('/stop')
  async stopOllama(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'ollama') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not Ollama. Please switch to Ollama first.',
          currentFramework
        });
        return;
      }

      const result = await this.ollamaProcessManager.stopOllamaService();

      res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      this.logger.error('Error stopping Ollama:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 重启 Ollama 服务
   */
  @Post('/restart')
  async restartOllama(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'ollama') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not Ollama. Please switch to Ollama first.',
          currentFramework
        });
        return;
      }

      // Ollama使用默认配置重启，不需要额外配置项
      const config = undefined;

      const result = await this.ollamaProcessManager.restartOllamaService(config);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          pid: result.pid,
          config,
          note: config ? 'Ollama service restarted with new configuration' : 'Ollama service restarted with previous configuration'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      this.logger.error('Error restarting Ollama:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取 Ollama 进程状态
   */
  @Get('/status')
  async getOllamaProcessStatus(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'ollama') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not Ollama. Please switch to Ollama first.',
          currentFramework
        });
        return;
      }

      const status = await this.ollamaProcessManager.getOllamaStatus();

      res.status(200).json({
        success: true,
        framework: currentFramework,
        process: status,
        serviceInfo: {
          host: '0.0.0.0', // Ollama默认host
          port: 11434, // Ollama默认端口
          version: status.version
        }
      });
    } catch (error) {
      this.logger.error('Error getting Ollama process status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取 Ollama 监控信息
   */
  @Get('/monitoring')
  async getOllamaMonitoring(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      // 允许获取监控信息，即使不是当前框架
      const monitoringInfo = await this.ollamaProcessManager.getOllamaMonitoringInfo();

      res.status(200).json({
        success: true,
        framework: 'ollama',
        currentFramework: currentFramework,
        isActive: currentFramework === 'ollama',
        timestamp: new Date().toISOString(),
        monitoring: monitoringInfo
      });
    } catch (error) {
      this.logger.error('Error getting Ollama monitoring info:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
