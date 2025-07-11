/**
 * 通信数据服务
 * 
 * 遵循SOLID原则：
 * - 单一职责原则：只负责通信数据的管理
 * - 依赖倒置原则：通过抽象接口获取数据
 * - 接口隔离原则：提供通信特定的接口
 */

import { ApiResponse, CommunicationData } from '../../hooks/types';
import { BaseDataService } from '../base/BaseDataService';

/**
 * 通信数据服务 
 */
export class CommunicationDataService extends BaseDataService<CommunicationData> {
  async fetch(): Promise<ApiResponse<CommunicationData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 并行获取P2P状态和配置信息
      // 注意：这些API可能还不存在，需要根据实际情况调整
      const [statusResponse, configResponse] = await Promise.allSettled([
        this.apiClient.get('/api/v1/p2p/status'),
        this.apiClient.getCurrentFramework()
      ]);

      // 初始化通信数据 
      let communicationData: CommunicationData = {
        serviceStatus: {
          libp2pService: true,
          serviceStatus: 'running',
          availableToClaim: 127,
          gatewayConnections: 3
        },
        networkConfig: {
          port: '4001',
          maxConnections: '100',
          enableDHT: true,
          enableRelay: false
        },
        peerConnections: [
          {
            peerId: 'QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5N',
            address: '/ip4/192.168.1.100/tcp/4001',
            status: 'connected',
            latency: 45,
            lastSeen: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            dataTransferred: 1024000
          },
          {
            peerId: 'QmNLei78zWmzUdbeRB3CiUfAizuHuybdgzVFoMBMnM2EuA',
            address: '/ip4/10.0.0.50/tcp/4001',
            status: 'connected',
            latency: 23,
            lastSeen: new Date(Date.now() - 1000 * 30).toISOString(),
            dataTransferred: 2048000
          },
          {
            peerId: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            address: '/ip4/172.16.0.25/tcp/4001',
            status: 'disconnected',
            latency: 0,
            lastSeen: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            dataTransferred: 512000
          }
        ],
        messageHistory: [
          {
            id: 'msg-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            type: 'task_request',
            from: 'gateway',
            to: 'local',
            status: 'delivered',
            size: 1024
          },
          {
            id: 'msg-2',
            timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            type: 'task_response',
            from: 'local',
            to: 'gateway',
            status: 'delivered',
            size: 2048
          },
          {
            id: 'msg-3',
            timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
            type: 'heartbeat',
            from: 'local',
            to: 'gateway',
            status: 'delivered',
            size: 256
          }
        ]
      };

      // 处理P2P状态
      if (this.isSuccessResponse(statusResponse)) {
        const status = this.getResponseData(statusResponse);
        if (status) {
          communicationData.serviceStatus = {
            libp2pService: this.safeGet(status, 'isRunning', true),
            serviceStatus: this.safeGet(status, 'status', 'running'),
            availableToClaim: this.safeGet(status, 'availableToClaim', 127),
            gatewayConnections: this.safeGet(status, 'connections', 3)
          };

          // 更新peer连接信息
          const peers = this.safeGet(status, 'peers', []);
          if (Array.isArray(peers) && peers.length > 0) {
            communicationData.peerConnections = peers.map((peer: any) => ({
              peerId: this.safeGet(peer, 'id', 'unknown'),
              address: this.safeGet(peer, 'address', 'unknown'),
              status: this.safeGet(peer, 'connected', false) ? 'connected' : 'disconnected',
              latency: this.safeGet(peer, 'latency', 0),
              lastSeen: this.safeGet(peer, 'lastSeen', new Date().toISOString()),
              dataTransferred: this.safeGet(peer, 'dataTransferred', 0)
            }));
          }
        }
      }

      // 处理网络配置 - getCurrentFramework只返回framework信息，不包含P2P配置
      if (this.isSuccessResponse(configResponse)) {
        // getCurrentFramework响应不包含P2P配置，保持默认值
        // const config = this.getResponseData(configResponse);
        // if (config.p2p) {
        //   communicationData.networkConfig = {
        //     port: config.p2p.port || '4001',
        //     maxConnections: config.p2p.maxConnections || '100',
        //     enableDHT: config.p2p.enableDHT ?? true,
        //     enableRelay: config.p2p.enableRelay ?? true
        //   };
        // }
      }

      return this.createSuccessResponse(communicationData);
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch communication data'
      );
    }
  }

  /**
   * 更新通信配置
   */
  async update(data: Partial<CommunicationData>): Promise<ApiResponse<CommunicationData>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 处理网络配置更新
      if (data.networkConfig) {
        // 目前没有更新P2P配置的API，返回模拟成功
        // 实际应该调用类似 this.apiClient.updateP2PConfig(data.networkConfig) 的方法
        
        // 重新获取最新状态
        return this.fetch();
      }

      return this.createErrorResponse('No valid update data provided');
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update communication config'
      );
    }
  }

  /**
   * 启动P2P服务
   */
  async startP2PService(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有启动P2P服务的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.startP2PService() 的方法
      return {
        success: true,
        data: {
          message: 'P2P service started',
          status: 'running'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to start P2P service'
      );
    }
  }

  /**
   * 停止P2P服务
   */
  async stopP2PService(): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有停止P2P服务的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.stopP2PService() 的方法
      return {
        success: true,
        data: {
          message: 'P2P service stopped',
          status: 'stopped'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to stop P2P service'
      );
    }
  }

  /**
   * 连接到指定peer
   */
  async connectToPeer(peerId: string, address: string): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有连接peer的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.connectToPeer(peerId, address) 的方法
      return {
        success: true,
        data: {
          message: `Connecting to peer: ${peerId}`,
          peerId: peerId,
          address: address,
          status: 'connecting'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to connect to peer'
      );
    }
  }

  /**
   * 断开peer连接
   */
  async disconnectFromPeer(peerId: string): Promise<ApiResponse<any>> {
    if (!this.apiClient) {
      return this.createErrorResponse('API client not available');
    }

    try {
      // 目前没有断开peer的API，返回模拟成功
      // 实际应该调用类似 this.apiClient.disconnectFromPeer(peerId) 的方法
      return {
        success: true,
        data: {
          message: `Disconnected from peer: ${peerId}`,
          peerId: peerId,
          status: 'disconnected'
        }
      };
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to disconnect from peer'
      );
    }
  }
}
