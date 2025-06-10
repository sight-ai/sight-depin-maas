import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { DeviceStatusService, RegistrationStorage } from '@saito/device-status';
import { UnifiedModelService } from '@saito/model-inference-client';
import got from 'got-cjs';
import { ModelReportingService } from './model-reporting.interface';
import { ModelReportingModule } from './model-reporting.module';

/**
 * Service for handling model reporting to gateway
 */
@Injectable()
export class DefaultModelReportingService implements ModelReportingService, OnModuleInit {
  private readonly logger = new Logger(ModelReportingService.name);
  private reportedModels: string[] = [];
  private readonly registrationStorage = new RegistrationStorage();

  constructor(
    private readonly unifiedModelService: UnifiedModelService,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService
  ) {}

  /**
   * 在模块初始化时自动上报上次的模型信息
   */
  async onModuleInit() {
    try {
      // 检查设备是否已注册
      const isRegistered = await this.deviceStatusService.isRegistered();
      if (!isRegistered) {
        this.logger.debug('Device is not registered. Skipping auto model reporting.');
        return;
      }

      // 从存储中获取上次上报的模型信息
      const savedModels = this.registrationStorage.getReportedModels();
      if (savedModels && savedModels.length > 0) {
        this.logger.log(`Found ${savedModels.length} previously reported models. Auto-reporting...`);

        // 自动上报模型
        await this.reportModels(savedModels);
      } else {
        this.logger.debug('No previously reported models found.');
      }
    } catch (error) {
      this.logger.error(`Error in auto model reporting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the list of reported models
   */
  getReportedModels(): string[] {
    return this.reportedModels;
  }


  /**
   * Report models to the gateway
   * @param models List of model names to report
   */
  async reportModels(models: string[]): Promise<boolean> {
    try {
      this.logger.log(`Reporting models: ${models.join(', ')}`);

      // Store the reported models
      this.reportedModels = models;

      // Get device information for reporting
      const deviceId = await this.deviceStatusService.getDeviceId();
      const deviceInfo = await this.deviceStatusService.getDeviceStatus(deviceId);

      // Log the reported models with device info
      this.logger.log(`Device ${deviceId} (${deviceInfo?.name || 'Unknown'}) reported models: ${models.join(', ')}`);

      // Check if device is registered with a gateway
      const isRegistered = await this.deviceStatusService.isRegistered();
      if (!isRegistered) {
        this.logger.warn('Device is not registered with a gateway. Skipping model reporting.');
        return false;
      }

      // Get gateway address
      const gatewayAddress = await this.deviceStatusService.getGatewayAddress();
      if (!gatewayAddress) {
        this.logger.warn('No gateway address found. Skipping model reporting.');
        return false;
      }

      // Get model details
      const modelDetails = await this.getModelDetails(models);

      // Prepare the models data for gateway reporting
      const modelsData = modelDetails;

      // 保存上报的模型信息到用户目录
      this.registrationStorage.updateReportedModels(models);
      this.logger.log('Saved reported models to user directory');

      // Report to the gateway
      const result = await this.sendToGateway(deviceId, gatewayAddress, modelsData);

      return result;
    } catch (error) {
      this.logger.error(`Error reporting models: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Get model details from current model service
   * @param models List of model names
   */
  private async getModelDetails(models: string[]): Promise<Record<string, any>[]> {
    try {
      const modelList = await this.unifiedModelService.listModels();

      // 确保模型列表格式正确，无论来自哪个框架
      // 获取当前框架类型
      const currentFramework = this.unifiedModelService.getCurrentFramework();
      let processedModels = modelList.models;

      if (currentFramework === 'vllm') {
        // 将 vLLM 模型转换为 Ollama 格式
        processedModels = modelList.models.map((model: any) => ({
          name: model.name || model.id,
          size: this.formatModelSize(this.estimateModelSize(model.name || model.id)),
          modified_at: model.modified_at || new Date().toISOString(),
          digest: this.generateDigest(model.name || model.id),
          details: {
            format: 'vllm',
            family: this.extractModelFamily(model.name || model.id),
            families: [this.extractModelFamily(model.name || model.id)],
            parameter_size: this.extractParameters(model.name || model.id),
            quantization_level: this.extractQuantization(model.name || model.id)
          }
        }));
      }

      return processedModels.filter((model: {name: string }) => models.includes(model.name));
    } catch (error) {
      this.logger.error(`Error getting model details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Extract model family from model name
   */
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

  /**
   * Extract parameter size from model name
   */
  private extractParameters(modelName: string): string {
    const paramMatch = modelName.match(/(\d+)[bB]/);
    return paramMatch ? `${paramMatch[1]}B` : 'unknown';
  }

  /**
   * Extract quantization level from model name
   */
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

  /**
   * Estimate model size based on parameters
   */
  private estimateModelSize(modelName: string): number {
    const params = this.extractParameters(modelName);
    const paramNum = parseInt(params.replace('B', ''));

    if (isNaN(paramNum)) return 0;

    // Rough estimation: 1B parameters ≈ 2GB
    return paramNum * 2 * 1024 * 1024 * 1024;
  }

  /**
   * Format model size as string
   */
  private formatModelSize(sizeInBytes: number): string {
    if (sizeInBytes === 0) return '0';

    const gb = sizeInBytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}GB`;
  }

  /**
   * Generate a simple digest for models without one
   */
  private generateDigest(modelName: string): string {
    // Simple hash-like string for consistency
    return `sha256:${Buffer.from(modelName).toString('hex').substring(0, 12)}`;
  }



  /**
   * Send models data to gateway
   * @param deviceId Device ID
   * @param gatewayAddress Gateway address
   * @param modelsData Models data
   */
  private async sendToGateway(deviceId: string, gatewayAddress: string, modelsData: Record<string, any>[]): Promise<boolean> {
    try {
      const gatewayUrl = `${gatewayAddress}/node/report-models`;
      this.logger.log(`Reporting models to gateway at ${gatewayUrl}`);

      const response = await got.post(gatewayUrl, {
        headers: {
          'Content-Type': 'application/json'
        },
        json: {
          device_id: deviceId,
          models: modelsData
        },
        throwHttpErrors: false
      });

      if (response.statusCode >= 400) {
        this.logger.warn(`Failed to report models to gateway: ${response.statusCode}`);
        return false;
      } else {
        this.logger.log('Successfully reported models to gateway');
        return true;
      }
    } catch (error) {
      this.logger.error(`Error sending to gateway: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}


const ModelReportingServiceProvider = {
  provide: ModelReportingService,
  useClass: DefaultModelReportingService,
};

export default ModelReportingServiceProvider;
