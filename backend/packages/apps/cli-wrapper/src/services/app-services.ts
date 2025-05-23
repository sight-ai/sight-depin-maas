import { NestFactory } from '@nestjs/core';
import { AppModule } from '@saito/api-server/app/app.module';
import { DeviceStatusService } from '@saito/device-status';
import { ModelReportingService } from '@saito/model-reporting';
import { OllamaService } from '@saito/ollama';
import { RegistrationStorage } from '@saito/device-status';

/**
 * 应用服务访问层
 * 提供统一的服务实例获取和管理
 */
export class AppServices {
  private static appInstance: any = null;

  /**
   * 创建NestJS应用实例
   */
  private static async createAppInstance() {
    if (!this.appInstance) {
      this.appInstance = await NestFactory.create(AppModule, {
        logger: false,
        abortOnError: false
      });
    }
    return this.appInstance;
  }

  /**
   * 获取DeviceStatusService实例
   */
  static async getDeviceStatusService(): Promise<DeviceStatusService> {
    const app = await this.createAppInstance();
    return app.get(DeviceStatusService);
  }

  /**
   * 获取ModelReportingService实例
   */
  static async getModelReportingService(): Promise<ModelReportingService> {
    const app = await this.createAppInstance();
    return app.get(ModelReportingService);
  }

  /**
   * 获取OllamaService实例
   */
  static async getOllamaService(): Promise<OllamaService> {
    const app = await this.createAppInstance();
    return app.get(OllamaService);
  }

  /**
   * 获取RegistrationStorage实例
   */
  static getRegistrationStorage(): RegistrationStorage {
    return new RegistrationStorage();
  }

  /**
   * 关闭应用实例
   */
  static async closeApp(): Promise<void> {
    if (this.appInstance) {
      await this.appInstance.close();
      this.appInstance = null;
    }
  }

  /**
   * 检查服务是否可用
   */
  static async checkServicesHealth(): Promise<{
    ollama: boolean;
    backend: boolean;
  }> {
    try {
      const ollamaService = await this.getOllamaService();
      const ollamaStatus = await ollamaService.checkStatus();

      return {
        ollama: ollamaStatus,
        backend: true
      };
    } catch (error) {
      return {
        ollama: false,
        backend: false
      };
    }
  }
}
