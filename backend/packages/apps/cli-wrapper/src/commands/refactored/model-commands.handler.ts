import {
  IDirectServiceAccess,
  IUserInterface,
  IStorageManager,
  CommandResult,
  TableData,
  ModelReport,
  BoxType
} from '../../abstractions/cli.interfaces';
import { ErrorHandlerService } from '@saito/common';

/**
 * 模型命令处理器 
 * 只负责模型相关命令的处理逻辑，直接使用libs服务
 */
export class ModelCommandsHandler {
  constructor(
    private readonly serviceAccess: IDirectServiceAccess,
    private readonly ui: IUserInterface,
    private readonly storage: IStorageManager,
    private readonly errorHandler: ErrorHandlerService = new ErrorHandlerService()
  ) {}

  /**
   * 处理模型列表命令
   */
  async handleListModels(format: string = 'table'): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Fetching available models...');
    spinner.start();

    try {
      // 直接获取模型服务
      const modelService = await this.serviceAccess.getModelService();
      const modelsResult = await modelService.listModels();

      if (!modelsResult || !modelsResult.models) {
        spinner.fail('Failed to fetch models');
        this.ui.error('No models available or service unavailable');
        return {
          success: false,
          error: 'Failed to fetch models',
          code: 'MODEL_SERVICE_ERROR',
          timestamp: new Date().toISOString()
        };
      }

      spinner.succeed('Models fetched successfully');

      const models = modelsResult.models || [];
      
      if (models.length === 0) {
        this.ui.warning('No models available');
        return {
          success: true,
          data: { models: [], count: 0 },
          timestamp: new Date().toISOString()
        };
      }

      // 显示模型列表
      if (format === 'json') {
        console.log(JSON.stringify(models, null, 2));
      } else {
        this.showModelsTable(models);
      }

      return {
        success: true,
        data: { models, count: models.length },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Error fetching models');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to fetch models: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'MODEL_LIST_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理模型报告命令
   */
  async handleReportModels(modelNames: string[], reportAll: boolean = false): Promise<CommandResult> {
    try {
      let modelsToReport: string[] = [];

      if (reportAll) {
        // 获取所有可用模型
        const spinner = this.ui.showSpinner('Fetching all available models...');
        spinner.start();

        const modelService = await this.serviceAccess.getModelService();
        const modelsResult = await modelService.listModels();

        if (!modelsResult || !modelsResult.models) {
          spinner.fail('Failed to fetch models');
          this.ui.error('No models available or service unavailable');
          return {
            success: false,
            error: 'Failed to fetch models',
            code: 'MODEL_SERVICE_ERROR',
            timestamp: new Date().toISOString()
          };
        }

        modelsToReport = modelsResult.models?.map((m: any) => m.name) || [];
        spinner.succeed(`Found ${modelsToReport.length} models to report`);
      } else {
        modelsToReport = modelNames;
      }

      if (modelsToReport.length === 0) {
        this.ui.warning('No models to report');
        return {
          success: false,
          error: 'No models specified for reporting',
          timestamp: new Date().toISOString()
        };
      }

      // 显示要报告的模型
      this.ui.info(`Reporting ${modelsToReport.length} models:`);
      this.ui.showList(modelsToReport);

      // 确认报告
      const confirmed = await this.ui.confirm(
        `Do you want to report these ${modelsToReport.length} models to the gateway?`,
        true
      );

      if (!confirmed) {
        this.ui.info('Model reporting cancelled');
        return {
          success: false,
          error: 'Model reporting cancelled by user',
          timestamp: new Date().toISOString()
        };
      }

      const spinner = this.ui.showSpinner('Reporting models to gateway...');
      spinner.start();

      // 执行报告
      const reportResult = await this.performModelReport(modelsToReport);

      if (reportResult.success) {
        // 保存报告记录
        await this.saveModelReport(modelsToReport, true);

        spinner.succeed('Models reported successfully');
        this.showReportSuccess(modelsToReport, reportResult.data);

        return {
          success: true,
          data: { reportedModels: modelsToReport, result: reportResult.data },
          timestamp: new Date().toISOString()
        };
      } else {
        // 保存失败记录
        await this.saveModelReport(modelsToReport, false, reportResult.error);

        spinner.fail('Model reporting failed');
        this.ui.error(reportResult.error || 'Model reporting failed');

        return {
          success: false,
          error: reportResult.error,
          code: reportResult.code,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Model reporting failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        code: 'MODEL_REPORT_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理模型详情命令
   */
  async handleModelDetails(modelName: string): Promise<CommandResult> {
    const spinner = this.ui.showSpinner(`Fetching details for model: ${modelName}...`);
    spinner.start();

    try {
      // 使用模型服务获取详情
      const modelService = await this.serviceAccess.getModelService();
      const modelDetails = await modelService.getModelInfo(modelName);

      if (!modelDetails) {
        spinner.fail('Failed to fetch model details');
        this.ui.error('Model not found or service unavailable');
        return {
          success: false,
          error: 'Model not found',
          code: 'MODEL_NOT_FOUND',
          timestamp: new Date().toISOString()
        };
      }

      spinner.succeed('Model details fetched successfully');
      this.showModelDetails(modelDetails);

      return {
        success: true,
        data: modelDetails,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Error fetching model details');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to fetch model details: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'MODEL_DETAILS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 处理已报告模型查询命令
   */
  async handleReportedModels(): Promise<CommandResult> {
    const spinner = this.ui.showSpinner('Fetching reported models...');
    spinner.start();

    try {
      // 从本地存储获取已报告的模型
      const reportedModels = await this.storage.getReportedModels();

      spinner.succeed('Reported models fetched successfully');

      if (reportedModels.length === 0) {
        this.ui.warning('No models have been reported yet');
      } else {
        this.ui.info(`${reportedModels.length} model reports found:`);

        // 显示报告历史
        const tableData: TableData = {
          title: `Model Report History (${reportedModels.length})`,
          headers: ['Models', 'Reported At', 'Status'],
          rows: reportedModels.map((report: ModelReport) => [
            report.models.join(', '),
            this.formatDate(report.reportedAt),
            report.success ? '✓ Success' : '✗ Failed'
          ])
        };

        this.ui.showTable(tableData);
      }

      return {
        success: true,
        data: { reportedModels, count: reportedModels.length },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      spinner.fail('Error fetching reported models');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.ui.error(`Failed to fetch reported models: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        code: 'REPORTED_MODELS_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 显示模型表格
   */
  private showModelsTable(models: any[]): void {
    const tableData: TableData = {
      title: `Available Models (${models.length})`,
      headers: ['Name', 'Size', 'Modified', 'Family'],
      rows: models.map(model => [
        model.name || 'N/A',
        this.formatSize(model.size),
        this.formatDate(model.modified_at),
        model.family || model.families?.join(', ') || 'N/A'
      ])
    };

    this.ui.showTable(tableData);
  }

  /**
   * 显示模型详情
   */
  private showModelDetails(model: any): void {
    this.ui.showTitle(`Model Details: ${model.name}`);

    this.ui.showKeyValue('Name', model.name);
    this.ui.showKeyValue('Size', this.formatSize(model.size));
    this.ui.showKeyValue('Modified', this.formatDate(model.modified_at));
    this.ui.showKeyValue('Digest', model.digest || 'N/A');
    this.ui.showKeyValue('Format', model.format || 'N/A');
    this.ui.showKeyValue('Family', model.family || 'N/A');
    this.ui.showKeyValue('Parameter Size', model.parameter_size || 'N/A');
    this.ui.showKeyValue('Quantization', model.quantization_level || 'N/A');

    if (model.families && model.families.length > 0) {
      console.log();
      this.ui.info('Families:');
      this.ui.showList(model.families);
    }

    if (model.capabilities && model.capabilities.length > 0) {
      console.log();
      this.ui.info('Capabilities:');
      this.ui.showList(model.capabilities);
    }

    if (model.description) {
      console.log();
      this.ui.showKeyValue('Description', model.description);
    }
  }

  /**
   * 显示报告成功信息
   */
  private showReportSuccess(models: string[], result: any): void {
    this.ui.showBox(
      'Models Reported Successfully',
      `${models.length} models have been successfully reported to the gateway.\n\n` +
      `Reported models:\n${models.map(m => `• ${m}`).join('\n')}\n\n` +
      `Gateway response: ${result?.message || 'Success'}`,
      BoxType.SUCCESS
    );
  }

  /**
   * 执行模型报告
   */
  private async performModelReport(models: string[]): Promise<CommandResult> {
    try {
      const modelReportingService = await this.serviceAccess.getModelReportingService();

      // 执行模型报告
      const result = await modelReportingService.reportModels(models);

      return {
        success: result.success,
        data: {
          message: result.message || 'Models reported successfully',
          reportedModels: models,
          reportedAt: new Date().toISOString()
        },
        error: result.success ? undefined : result.message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Model reporting error',
        code: 'MODEL_REPORTING_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 保存模型报告记录
   */
  private async saveModelReport(models: string[], success: boolean, error?: string): Promise<void> {
    try {
      const report: ModelReport = {
        models,
        reportedAt: new Date().toISOString(),
        success,
        errors: error ? [error] : undefined
      };

      await this.storage.saveModelReport(report);
    } catch (err) {
      // 忽略保存错误，不影响主要功能
      console.warn('Failed to save model report record:', err);
    }
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 格式化日期
   */
  private formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }
}
