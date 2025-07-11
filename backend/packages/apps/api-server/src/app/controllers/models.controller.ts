import { Body, Controller, Get, Inject, Logger, Post, Put, Res } from "@nestjs/common";
import { createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import { ModelReportingService } from "@saito/model-reporting";
import { UnifiedModelService, ClientSwitchService } from "@saito/model-inference-client";
import { FrameworkSwitchService } from "@saito/model-inference-framework-management";
import { VllmProcessManagerService, OllamaProcessManagerService } from "@saito/model-inference-framework-management";
import type { VllmProcessConfig } from "@saito/model-inference-framework-management";
import { DeviceStatusService, TunnelCommunicationService } from "@saito/device-status";

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
    private readonly unifiedModelService: UnifiedModelService,
    @Inject(ModelReportingService) private readonly modelReportingService: ModelReportingService,
    private readonly vllmProcessManager: VllmProcessManagerService,
    private readonly ollamaProcessManager: OllamaProcessManagerService,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService,
    @Inject(TunnelCommunicationService) private readonly tunnelService: TunnelCommunicationService
  ) { }

  @Get('/list')
  async listModels(@Res() res: Response) {
    try {
      // 使用统一模型服务
      const modelList = await this.unifiedModelService.listModels();
      const currentFramework = this.unifiedModelService.getCurrentFramework();

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
      // 首先尝试通过tunnel发送模型上报
      console.log(args)
      try {
        const deviceId = await this.deviceStatusService.getDeviceId();
        const tunnelResult = await this.tunnelService.sendModelReport(
          deviceId,
          'gateway', // 固定发送给网关
          {
            device_id: deviceId,
            models: args.models.map(modelName => ({
              name: modelName,
              modified_at: new Date().toISOString(),
              size: 2048000000,
              digest: `sha256:${Buffer.from(modelName).toString('hex').substring(0, 12)}`,
              details: {
                format: 'gguf',
                family: this.extractModelFamily(modelName),
                families: [this.extractModelFamily(modelName)],
                parameter_size: this.extractParameters(modelName),
                quantization_level: this.extractQuantization(modelName)
              }
            }))
          }
        );

        if (tunnelResult) {
          this.logger.log('Model report sent via tunnel');
        }
      } catch (tunnelError) {
        this.logger.warn('Failed to send model report via tunnel:', tunnelError);
      }

      // 继续执行原有的HTTP上报逻辑
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
      const currentFramework = this.unifiedModelService.getCurrentFramework();

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
      const currentFramework = this.unifiedModelService.getCurrentFramework();

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
      const currentFramework = this.unifiedModelService.getCurrentFramework();

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

  @Post('/vllm/restart')
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

  // ========================================
  // Ollama Process Management Endpoints
  // ========================================

  @Post('/ollama/start')
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

  @Post('/ollama/stop')
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

  @Post('/ollama/restart')
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

  @Get('/ollama/status')
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

  // 辅助方法
  private extractModelFamily(modelName: string): string {
    const familyPatterns = [
      { pattern: /llama/i, value: 'llama' },
      { pattern: /mistral/i, value: 'mistral' },
      { pattern: /deepseek/i, value: 'deepseek' },
      { pattern: /phi/i, value: 'phi' },
      { pattern: /qwen/i, value: 'qwen' },
      { pattern: /gemma/i, value: 'gemma' },
      { pattern: /mixtral/i, value: 'mixtral' },
      { pattern: /vicuna/i, value: 'vicuna' },
      { pattern: /falcon/i, value: 'falcon' }
    ];

    for (const { pattern, value } of familyPatterns) {
      if (pattern.test(modelName)) {
        return value;
      }
    }
    return 'unknown';
  }

  private extractParameters(modelName: string): string {
    const paramMatch = modelName.match(/(\d+)[bB]/);
    return paramMatch ? `${paramMatch[1]}B` : 'unknown';
  }

  private extractQuantization(modelName: string): string {
    const quantMatches = [
      { pattern: /q4_0/i, value: 'Q4_0' },
      { pattern: /q4_k_m/i, value: 'Q4_K_M' },
      { pattern: /q5_0/i, value: 'Q5_0' },
      { pattern: /q5_k_m/i, value: 'Q5_K_M' },
      { pattern: /q6_k/i, value: 'Q6_K' },
      { pattern: /q8_0/i, value: 'Q8_0' }
    ];

    for (const { pattern, value } of quantMatches) {
      if (pattern.test(modelName)) {
        return value;
      }
    }
    return '';
  }
}
