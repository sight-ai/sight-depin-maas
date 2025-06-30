import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RegistrationStorage } from '../registration-storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DID 集成服务
 * 负责在运行时获取真正的 DID 并更新注册信息
 */
@Injectable()
export class DidIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(DidIntegrationService.name);
  private readonly didFilePath = path.join(process.env['HOME'] || '', '.sightai', 'config', 'did-local.json');

  constructor(
    private readonly registrationStorage: RegistrationStorage
  ) {}

  async onModuleInit() {
    // 延迟执行，确保 DID 文档已经生成
    setTimeout(() => {
      this.updateRegistrationWithRealDid().catch(error => {
        this.logger.error('Failed to update registration with real DID:', error);
      });
    }, 3000); // 增加延迟时间，确保 DID 文档已生成
  }

  /**
   * 更新注册信息中的设备ID为真正的DID
   */
  private async updateRegistrationWithRealDid(): Promise<void> {
    try {
      // 1. 检查是否存在 DID 文档
      if (!fs.existsSync(this.didFilePath)) {
        this.logger.warn('DID document not found, skipping DID integration');
        return;
      }

      // 2. 读取 DID 文档
      const didDocContent = fs.readFileSync(this.didFilePath, 'utf8');
      const didDocument = JSON.parse(didDocContent);
      
      if (!didDocument.id) {
        this.logger.warn('Invalid DID document, missing id field');
        return;
      }

      const realDeviceId = didDocument.id;
      this.logger.log(`🔍 Found real device ID from DID: ${realDeviceId}`);

      // 3. 获取当前注册信息
      const currentRegistration = this.registrationStorage.loadRegistrationInfo();
      
      if (!currentRegistration) {
        this.logger.log('No registration info found, nothing to update');
        return;
      }

      // 4. 检查是否需要更新
      if (currentRegistration.deviceId === realDeviceId) {
        this.logger.log('Device ID already correct, no update needed');
        return;
      }

      // 5. 更新注册信息
      const updatedRegistration = {
        ...currentRegistration,
        deviceId: realDeviceId,
        didDoc: didDocument,
        timestamp: new Date().toISOString()
      };

      this.registrationStorage.saveRegistrationInfo(updatedRegistration);
      
      this.logger.log(`✅ Updated registration with real DID:`);
      this.logger.log(`   Old Device ID: ${currentRegistration.deviceId}`);
      this.logger.log(`   New Device ID: ${realDeviceId}`);
      this.logger.log(`   DID Document: Saved`);

    } catch (error) {
      this.logger.error('Error updating registration with real DID:', error);
    }
  }

  /**
   * 手动触发 DID 更新（用于 API 调用）
   */
  async manualUpdateDid(): Promise<{ success: boolean; message: string; deviceId?: string }> {
    try {
      await this.updateRegistrationWithRealDid();
      
      const registration = this.registrationStorage.loadRegistrationInfo();
      return {
        success: true,
        message: 'DID updated successfully',
        deviceId: registration?.deviceId
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update DID: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 获取当前的 DID 信息
   */
  getCurrentDidInfo(): { deviceId?: string; didDoc?: any; hasRealDid: boolean } {
    try {
      const registration = this.registrationStorage.loadRegistrationInfo();
      
      if (!registration) {
        return { hasRealDid: false };
      }

      const hasRealDid = registration.deviceId !== 'temp-device-id' && 
                        registration.deviceId?.startsWith('did:sight:');

      return {
        deviceId: registration.deviceId,
        didDoc: registration.didDoc,
        hasRealDid
      };
    } catch (error) {
      this.logger.error('Error getting DID info:', error);
      return { hasRealDid: false };
    }
  }
}
