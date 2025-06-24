import { Injectable, Logger } from '@nestjs/common';
import { IncomeBaseMessageHandler } from '../base-message-handler';
import { TunnelMessage, DeviceModelReportMessage, DeviceModelReportMessageSchema } from '@saito/models';
import { MessageHandler } from '../message-handler.decorator';

/**
 * 模型上报消息入站处理器
 *
 * 处理通过tunnel接收到的模型上报请求，记录日志并可以触发事件
 * 注意：为避免循环依赖，此处理器不直接调用ModelReportingService
 */
@MessageHandler({ type: 'device_model_report', direction: 'income' })
@Injectable()
export class IncomeDeviceModelReportHandler extends IncomeBaseMessageHandler {
  private readonly logger = new Logger(IncomeDeviceModelReportHandler.name);

  constructor() {
    super();
  }

  async handleIncomeMessage(message: TunnelMessage): Promise<void> {
    try {
      const reportMessage = DeviceModelReportMessageSchema.parse(message) as DeviceModelReportMessage;

      this.logger.log(`Processing model report request from ${reportMessage.from}`);
      this.logger.debug(`Model report payload:`, reportMessage.payload);

      // 记录模型上报请求信息
      this.logger.log(`Model report request details:`, {
        device_id: reportMessage.payload.device_id,
        models_count: reportMessage.payload.models.length,
        models: reportMessage.payload.models.map(model => {
          return {
            name: model.name,
            size: model.size,
            family: model.details.family,
            parameter_size: model.details.parameter_size
          };
        })
      });

      // TODO: 这里可以发送事件或者通过其他方式通知模型上报服务
      // 避免直接依赖ModelReportingService以防止循环依赖

      // 这里可以发送响应消息回给发送方
      // 或者触发其他后续处理逻辑

    } catch (error) {
      this.logger.error('Error processing model report message:', error);
      
      // 这里可以发送错误响应消息
    }
  }
}
