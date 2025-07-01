import { Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceModelReportResponseMessage, DeviceModelReportResponseMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 设备模型上报响应消息入站处理器
 *
 * 处理通过tunnel接收到的设备模型上报响应，记录上报状态
 */
@MessageHandler({ type: 'device_model_report_response', direction: 'income' })
@Injectable()
export class IncomeDeviceModelReportResponseHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeDeviceModelReportResponseHandler.name);

  constructor() {
    super();
  }

  /**
   * 处理入站设备模型上报响应消息
   */
  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    try {
      // 验证消息格式
      const modelReportResponse = DeviceModelReportResponseMessageSchema.parse(message) as DeviceModelReportResponseMessage;
      
      this.logger.debug(`收到设备模型上报响应消息: ${JSON.stringify(modelReportResponse)}`);

      if (modelReportResponse.payload.success) {
        this.logger.log(`✅ 设备模型上报响应成功 - DeviceID: ${modelReportResponse.to}`);
        this.logger.debug(`模型上报响应消息: ${modelReportResponse.payload.message || 'Model report acknowledged'}`);

        // 如果响应中包含模型信息，记录下来
        const models = (modelReportResponse.payload as any).models;
        if (models && Array.isArray(models) && models.length > 0) {
          this.logger.log(`📊 网关确认的模型数量: ${models.length}`);
          models.forEach((model: any, index: number) => {
            this.logger.debug(`模型 ${index + 1}: ${model.name || 'Unknown'}`);
          });
        }
      } else {
        this.logger.warn(`❌ 设备模型上报响应失败 - DeviceID: ${modelReportResponse.to}`);

        // 从payload中获取错误信息，支持多种字段名
        const errorMessage = modelReportResponse.payload.message ||
                           (modelReportResponse.payload as any).error ||
                           'Unknown error';
        this.logger.warn(`失败原因: ${errorMessage}`);

        // 如果是设备未找到错误，可能需要重新注册
        if (errorMessage.includes('Device not found')) {
          this.logger.warn(`🚨 设备未在网关找到，可能需要重新注册设备: ${modelReportResponse.to}`);
        }
      }

      // 记录模型上报响应时间
      this.logger.debug(`设备模型上报响应时间: ${new Date().toISOString()}`);

    } catch (error) {
      this.logger.error(`处理设备模型上报响应消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.logger.error(`原始消息: ${JSON.stringify(message)}`);
    }
  }
}
