/**
 * DID管理数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责DID管理的数据管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供DID管理特定的接口
 */

import { ApiResponse, DIDManagementData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * DID管理数据服务 - 按照Figma设计实现
 */
export class DIDManagementDataService extends BaseDataService<DIDManagementData> {
  async fetch(): Promise<ApiResponse<DIDManagementData>> {
    try {
      // 初始化DID管理数据 - 按照Figma设计（使用模拟数据）
      const didManagementData: DIDManagementData = this.getDefaultDIDManagementData();

      return this.createSuccessResponse(didManagementData);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch DID management data'
      );
    }
  }

  /**
   * 更新DID管理数据
   */
  async update(data: Partial<DIDManagementData>): Promise<ApiResponse<DIDManagementData>> {
    try {
      // 处理DID信息更新
      if (data.didInfo) {
        // 目前没有更新DID信息的API，返回模拟成功
        // 实际应该调用类似 this.apiClient.updateDIDInfo(data.didInfo) 的方法
        
        // 重新获取最新状态
        return this.fetch();
      }

      return this.createErrorResponse('No valid update data provided');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update DID management data'
      );
    }
  }

  /**
   * 生成新的DID
   */
  async generateNewDID(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 调用更新DID API
      const response = await this.apiClient.updateDid();
      return response;
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to generate new DID'
      );
    }
  }

  /**
   * 导出DID文档
   */
  async exportDIDDocument(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 获取DID信息
      const response = await this.apiClient.getDidInfo();
      
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            message: 'DID document exported',
            document: (response.data as any)?.didDoc || response.data,
            filename: `did-document-${Date.now()}.json`
          }
        };
      } else {
        return this.createErrorResponse('Failed to get DID document');
      }
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to export DID document'
      );
    }
  }

  /**
   * 验证DID
   */
  async verifyDID(did: string): Promise<ApiResponse<any>> {
    try {
      // 目前没有验证DID的API，返回模拟结果
      // 实际应该调用类似 this.apiClient.verifyDID(did) 的方法
      
      const isValid = did.startsWith('did:sight:') && did.length > 20;
      
      return {
        success: true,
        data: {
          isValid: isValid,
          did: did,
          verificationResult: isValid ? 'valid' : 'invalid',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to verify DID'
      );
    }
  }

  /**
   * 获取默认的DID管理数据
   */
  private getDefaultDIDManagementData(): DIDManagementData | any {
    return {
      didInfo: {
        did: 'did:sight:hoster:6Mkk9zpVANguzDtR68hwCtDKESrJbKjNpvJEkHPzuHHmmKf',
        publicKey: '6hjmtv8FaSjRJbJ1FdvNU8trV23sxwfwYjNUAdKGrYYH',
        controller: 'did:sight:hoster:6Mkk9zpVANguzDtR68hwCtDKESrJbKjNpvJEkHPzuHHmmKf',
        created: '2025-07-11T06:10:31.790Z',
        updated: '2025-07-11T06:10:31.790Z',
        status: 'active'
      },
      verificationMethods: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:sight:hoster:6Mkk9zpVANguzDtR68hwCtDKESrJbKjNpvJEkHPzuHHmmKf',
          publicKeyMultibase: '6hjmtv8FaSjRJbJ1FdvNU8trV23sxwfwYjNUAdKGrYYH'
        }
      ],
      services: [
        {
          id: '#ping-handler',
          type: 'P2PMessageHandler',
          serviceEndpoint: {
            type: 'ping',
            direction: 'income',
            schema: 'https://schemas.sight.ai/message-types/ping.json',
            description: 'Accepts ping messages'
          }
        },
        {
          id: '#pong-handler',
          type: 'P2PMessageHandler',
          serviceEndpoint: {
            type: 'pong',
            direction: 'income',
            schema: 'https://schemas.sight.ai/message-types/pong.json',
            description: 'Accepts pong messages'
          }
        },
        {
          id: '#manifest',
          type: 'ModelManifestService',
          serviceEndpoint: 'did:sight:hoster:6Mkk9zpVANguzDtR68hwCtDKESrJbKjNpvJEkHPzuHHmmKf/model_manifest'
        }
      ],
      keyManagement: {
        keyRotationEnabled: true,
        lastRotation: '2025-07-11T06:10:31.790Z',
        nextRotation: '2025-08-11T06:10:31.790Z',
        backupStatus: 'completed'
      }
    };
  }
}
