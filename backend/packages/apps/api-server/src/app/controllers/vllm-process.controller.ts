import { Body, Controller, Get, Logger, Post, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { UnifiedModelService } from "@saito/model-inference-client";
import { VllmProcessManagerService } from "@saito/model-inference-framework-management";

// vLLM 启动配置 Schema
const VllmStartSchema = z.object({
  model: z.string().optional(),
  gpuMemoryUtilization: z.number().min(0.1).max(1.0).optional(),
  maxModelLen: z.number().int().positive().optional(),
  maxNumSeqs: z.number().int().positive().optional(),
  maxNumBatchedTokens: z.number().int().positive().optional(),
  enforceEager: z.boolean().optional(),
  swapSpace: z.number().nonnegative().optional(),
  tensorParallelSize: z.number().int().positive().optional(),
  pipelineParallelSize: z.number().int().positive().optional(),
  blockSize: z.number().int().positive().optional(),
  quantization: z.enum(['awq', 'gptq', 'squeezellm', 'fp8', 'int8']).nullable().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().optional()
});

export class VllmStartDto extends createZodDto(VllmStartSchema) { }

/**
 * vLLM 进程管理控制器
 * 
 * 职责：
 * 1. vLLM 进程的启动、停止、重启
 * 2. vLLM 进程状态查询
 * 3. 遵循单一职责原则 - 只负责 vLLM 进程管理
 */
@Controller('/api/v1/vllm/process')
export class VllmProcessController {
  private readonly logger = new Logger(VllmProcessController.name);

  constructor(
    private readonly unifiedModelService: UnifiedModelService,
    private readonly vllmProcessManager: VllmProcessManagerService
  ) {}

  /**
   * 启动 vLLM 服务
   */
  @Post('/start')
  async startVllm(@Body() args: VllmStartDto, @Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // 构建配置
      const config = {
        model: args.model || 'microsoft/DialoGPT-medium',
        gpuMemoryUtilization: args.gpuMemoryUtilization || 0.9,
        maxModelLen: args.maxModelLen || 4096,
        port: args.port || 8000,
        host: args.host || '0.0.0.0',
        maxNumSeqs: args.maxNumSeqs,
        maxNumBatchedTokens: args.maxNumBatchedTokens,
        enforceEager: args.enforceEager,
        swapSpace: args.swapSpace,
        tensorParallelSize: args.tensorParallelSize,
        pipelineParallelSize: args.pipelineParallelSize,
        blockSize: args.blockSize,
        quantization: args.quantization
      };

      const result = await this.vllmProcessManager.startVllmService(config);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          pid: result.pid,
          config
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      this.logger.error('Error starting vLLM:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 停止 vLLM 服务
   */
  @Post('/stop')
  async stopVllm(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      const result = await this.vllmProcessManager.stopVllmService();

      res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      this.logger.error('Error stopping vLLM:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 重启 vLLM 服务
   */
  @Post('/restart')
  async restartVllm(@Body() args: VllmStartDto, @Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // 构建配置（如果提供了新配置）
      const config = Object.keys(args).length > 0 ? {
        model: args.model || 'microsoft/DialoGPT-medium',
        gpuMemoryUtilization: args.gpuMemoryUtilization || 0.9,
        maxModelLen: args.maxModelLen || 4096,
        port: args.port || 8000,
        host: args.host || '0.0.0.0',
        maxNumSeqs: args.maxNumSeqs,
        maxNumBatchedTokens: args.maxNumBatchedTokens,
        enforceEager: args.enforceEager,
        swapSpace: args.swapSpace,
        tensorParallelSize: args.tensorParallelSize,
        pipelineParallelSize: args.pipelineParallelSize,
        blockSize: args.blockSize,
        quantization: args.quantization
      } : undefined;

      const result = await this.vllmProcessManager.restartVllmService(config);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          pid: result.pid,
          config,
          note: config ? 'vLLM service restarted with new configuration' : 'vLLM service restarted with previous configuration'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      this.logger.error('Error restarting vLLM:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取 vLLM 进程状态
   */
  @Get('/status')
  async getVllmProcessStatus(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      const status = await this.vllmProcessManager.getVllmStatus();

      res.status(200).json({
        success: true,
        framework: currentFramework,
        process: status,
        memoryInfo: status.config ? {
          configured: `${(status.config.gpuMemoryUtilization * 100).toFixed(1)}%`,
          maxModelLen: status.config.maxModelLen
        } : null
      });
    } catch (error) {
      this.logger.error('Error getting vLLM process status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取 vLLM 监控信息
   */
  @Get('/monitoring')
  async getVllmMonitoring(@Res() res: Response) {
    try {
      const currentFramework = this.unifiedModelService.getCurrentFramework();

      // 允许获取监控信息，即使不是当前框架
      const monitoringInfo = await this.vllmProcessManager.getVllmMonitoringInfo();

      res.status(200).json({
        success: true,
        framework: 'vllm',
        currentFramework: currentFramework,
        isActive: currentFramework === 'vllm',
        timestamp: new Date().toISOString(),
        monitoring: monitoringInfo
      });
    } catch (error) {
      this.logger.error('Error getting vLLM monitoring info:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
