import { Body, Controller, Get, Inject, Logger, Post, Put, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { ModelReportingService } from "@saito/model-reporting";
import { FrameworkManagerService, VllmProcessManagerService, OllamaProcessManagerService } from "@saito/model-framework";
import type { VllmProcessConfig } from "@saito/model-framework";

// Define DTOs for the new endpoints
const ModelReportRequestSchema = z.object({
  models: z.array(z.string()).min(1)
});

const VllmConfigUpdateSchema = z.object({
  gpuMemoryUtilization: z.number().min(0.1).max(1.0).optional(),
  maxModelLen: z.number().int().positive().optional()
});

const VllmStartSchema = z.object({
  model: z.string().optional(),
  gpuMemoryUtilization: z.number().min(0.1).max(1.0).optional(),
  maxModelLen: z.number().int().positive().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  host: z.string().optional()
});

const OllamaStartSchema = z.object({
  // Ollama不需要启动配置项，使用默认配置
});

export class ModelReportRequestDto extends createZodDto(ModelReportRequestSchema) { }
export class VllmConfigUpdateDto extends createZodDto(VllmConfigUpdateSchema) { }
export class VllmStartDto extends createZodDto(VllmStartSchema) { }
export class OllamaStartDto extends createZodDto(OllamaStartSchema) { }

@Controller('/api/v1/models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly frameworkManager: FrameworkManagerService,
    @Inject(ModelReportingService) private readonly modelReportingService: ModelReportingService,
    private readonly vllmProcessManager: VllmProcessManagerService,
    private readonly ollamaProcessManager: OllamaProcessManagerService
  ) { }

  @Get('/list')
  async listModels(@Res() res: Response) {
    try {
      // 使用新的框架管理器
      const service = await this.frameworkManager.createFrameworkService();
      const currentFramework = this.frameworkManager.getCurrentFramework();
      const modelList = await service.listModels();

      res.status(200).json({
        success: true,
        framework: currentFramework,
        models: modelList.models,
        total: modelList.total
      });
    } catch (error) {
      this.logger.error('Error listing models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        models: [],
        total: 0
      });
    }
  }

  @Post('/report')
  async reportModels(@Body() args: ModelReportRequestDto, @Res() res: Response) {
    try {
      // Use the model reporting service to report models
      const success = await this.modelReportingService.reportModels(args.models);

      res.status(200).json({
        success: true,
        message: success ? 'Models reported successfully' : 'Models stored locally but not reported to gateway',
        reportedModels: args.models
      });
    } catch (error) {
      this.logger.error('Error reporting models:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  @Get('/vllm/config')
  async getVllmConfig(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // Get vLLM specific configuration from environment variables
      const config = {
        gpuMemoryUtilization: parseFloat(process.env['VLLM_GPU_MEMORY_UTILIZATION'] || '0.9'),
        maxModelLen: parseInt(process.env['VLLM_MAX_MODEL_LEN'] || '4096')
      };

      res.status(200).json({
        success: true,
        framework: currentFramework,
        config
      });
    } catch (error) {
      this.logger.error('Error getting vLLM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  @Put('/vllm/config')
  async updateVllmConfig(@Body() args: VllmConfigUpdateDto, @Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // Update environment variables with new configuration
      const updates: string[] = [];

      if (args.gpuMemoryUtilization !== undefined) {
        process.env['VLLM_GPU_MEMORY_UTILIZATION'] = args.gpuMemoryUtilization.toString();
        updates.push(`GPU Memory Utilization: ${args.gpuMemoryUtilization}`);
      }

      if (args.maxModelLen !== undefined) {
        process.env['VLLM_MAX_MODEL_LEN'] = args.maxModelLen.toString();
        updates.push(`Max Model Length: ${args.maxModelLen}`);
      }

      res.status(200).json({
        success: true,
        message: 'vLLM configuration updated successfully',
        updates,
        note: 'Configuration changes will take effect when vLLM service is restarted',
        recommendation: 'Use "sight vllm restart" or POST /api/v1/models/vllm/restart to apply changes immediately'
      });
    } catch (error) {
      this.logger.error('Error updating vLLM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }



  @Post('/vllm/start')
  async startVllm(@Body() args: VllmStartDto, @Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // 构建vLLM配置
      const config: VllmProcessConfig = {
        model: args.model || process.env['VLLM_MODEL'] || 'microsoft/DialoGPT-medium',
        gpuMemoryUtilization: args.gpuMemoryUtilization || parseFloat(process.env['VLLM_GPU_MEMORY_UTILIZATION'] || '0.9'),
        maxModelLen: args.maxModelLen || parseInt(process.env['VLLM_MAX_MODEL_LEN'] || '4096'),
        port: args.port || parseInt(process.env['VLLM_PORT'] || '8000'),
        host: args.host || process.env['VLLM_HOST'] || '0.0.0.0'
      };

      const result = await this.vllmProcessManager.startVllmService(config);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          pid: result.pid,
          config,
          note: `vLLM service started with GPU memory utilization: ${(config.gpuMemoryUtilization * 100).toFixed(1)}%`
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

  @Post('/vllm/stop')
  async stopVllm(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

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

  @Post('/vllm/restart')
  async restartVllm(@Body() args: VllmStartDto, @Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

      if (currentFramework !== 'vllm') {
        res.status(400).json({
          success: false,
          error: 'Current framework is not vLLM. Please switch to vLLM first.',
          currentFramework
        });
        return;
      }

      // 如果提供了新配置，使用新配置重启
      let config: VllmProcessConfig | undefined = undefined;
      if (args && Object.keys(args).length > 0) {
        config = {
          model: args.model || process.env['VLLM_MODEL'] || 'microsoft/DialoGPT-medium',
          gpuMemoryUtilization: args.gpuMemoryUtilization || parseFloat(process.env['VLLM_GPU_MEMORY_UTILIZATION'] || '0.9'),
          maxModelLen: args.maxModelLen || parseInt(process.env['VLLM_MAX_MODEL_LEN'] || '4096'),
          port: args.port || parseInt(process.env['VLLM_PORT'] || '8000'),
          host: args.host || process.env['VLLM_HOST'] || '0.0.0.0'
        };
      }

      const result = await this.vllmProcessManager.restartVllmService(config);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          pid: result.pid,
          config,
          note: config ? `vLLM service restarted with new configuration` : 'vLLM service restarted with previous configuration'
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

  @Get('/vllm/status')
  async getVllmProcessStatus(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

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

  // ========================================
  // Ollama Process Management Endpoints
  // ========================================

  @Post('/ollama/start')
  async startOllama(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

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

  @Post('/ollama/stop')
  async stopOllama(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

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

  @Post('/ollama/restart')
  async restartOllama(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

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

  @Get('/ollama/status')
  async getOllamaProcessStatus(@Res() res: Response) {
    try {
      const currentFramework = this.frameworkManager.getCurrentFramework();

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
}
