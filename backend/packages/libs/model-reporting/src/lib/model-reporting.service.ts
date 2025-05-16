import { Injectable, Inject, Logger } from '@nestjs/common';
import { DeviceStatusService } from '@saito/device-status';
import { OllamaService } from '@saito/ollama';
import got from 'got-cjs';
import { ModelReportingService } from './model-reporting.interface';

/**
 * Service for handling model reporting to gateway
 */
@Injectable()
export class DefaultModelReportingService implements ModelReportingService {
  private readonly logger = new Logger(ModelReportingService.name);
  private reportedModels: string[] = [];

  constructor(
    @Inject(OllamaService) private readonly ollamaService: OllamaService,
    @Inject(DeviceStatusService) private readonly deviceStatusService: DeviceStatusService
  ) {}

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

      // Prepare the models data according to the API specification
      const modelsData = this.prepareModelsData(models, modelDetails);

      // Report to the gateway
      return await this.sendToGateway(deviceId, gatewayAddress, modelsData);
    } catch (error) {
      this.logger.error(`Error reporting models: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Get model details from Ollama
   * @param models List of model names
   */
  private async getModelDetails(models: string[]): Promise<any[]> {
    try {
      const ollamaModels = await this.ollamaService.listModelTags();
      return ollamaModels.models.filter(model => models.includes(model.name));
    } catch (error) {
      this.logger.error(`Error getting model details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Prepare models data for gateway API
   * @param models List of model names
   * @param modelDetails Model details from Ollama
   */
  private prepareModelsData(models: string[], modelDetails: any[]): any[] {
    return models.map(modelName => {
      const modelDetail = modelDetails.find(m => m.name === modelName);

      // Try to extract model information from the name
      let format = '';
      let family = '';
      let parameterSize = '';
      let quantizationLevel = '';

      // Parse model name to extract information
      if (modelName.toLowerCase().includes('gguf')) {
        format = 'gguf';
      }

      // Extract family (llama, mistral, etc.)
      const familyMatches = [
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

      for (const match of familyMatches) {
        if (match.pattern.test(modelName)) {
          family = match.value;
          break;
        }
      }

      // Extract parameter size (7B, 13B, etc.)
      const paramMatch = modelName.match(/(\d+)[bB]/);
      if (paramMatch) {
        parameterSize = `${paramMatch[1]}B`;
      }

      // Extract quantization level (Q4_0, Q5_K_M, etc.)
      const quantMatches = [
        { pattern: /q4_0/i, value: 'Q4_0' },
        { pattern: /q4_k_m/i, value: 'Q4_K_M' },
        { pattern: /q5_0/i, value: 'Q5_0' },
        { pattern: /q5_k_m/i, value: 'Q5_K_M' },
        { pattern: /q6_k/i, value: 'Q6_K' },
        { pattern: /q8_0/i, value: 'Q8_0' }
      ];

      for (const match of quantMatches) {
        if (match.pattern.test(modelName)) {
          quantizationLevel = match.value;
          break;
        }
      }

      // Build families array
      const families = [];
      if (family) {
        families.push(family);
      }

      return {
        name: modelName,
        modified_at: modelDetail ? modelDetail.modified_at : new Date().toISOString(),
        size: modelDetail ? modelDetail.size : 0,
        digest: '',
        details: {
          format,
          family,
          families,
          parameter_size: parameterSize,
          quantization_level: quantizationLevel
        }
      };
    });
  }

  /**
   * Send models data to gateway
   * @param deviceId Device ID
   * @param gatewayAddress Gateway address
   * @param modelsData Models data
   */
  private async sendToGateway(deviceId: string, gatewayAddress: string, modelsData: any[]): Promise<boolean> {
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
