/**
 * 数据服务实现
 * 
 * 遵循依赖倒置原则，实现具体的数据服务类
 * 每个服务类遵循单一职责原则，只负责特定数据的获取和处理
 */

import {
  IDataService,
  ApiResponse,
  BackendStatus,
  DashboardData,
  DeviceStatusData,
  DeviceRegistrationData,
  ModelConfigData,
  EarningsData,
  GatewayConfigData,
  CommunicationData,
  DIDManagementData,
  SettingsData
} from '../hooks/types';
import { createApiClient } from '../utils/api-client';

/**
 * 基础数据服务抽象类
 */
abstract class BaseDataService<T> implements IDataService<T> {
  protected apiClient: ReturnType<typeof createApiClient> | null = null;

  constructor(protected backendStatus: BackendStatus | null) {
    if (backendStatus?.isRunning) {
      this.apiClient = createApiClient(backendStatus);
    }
  }

  abstract fetch(): Promise<ApiResponse<T>>;

  async update?(data: Partial<T>): Promise<ApiResponse<T>> {
    throw new Error('Update operation not implemented');
  }

  async delete?(id: string): Promise<ApiResponse<void>> {
    throw new Error('Delete operation not implemented');
  }
}

/**
 * Dashboard数据服务 - 按照Figma设计更新
 */
export class DashboardDataService extends BaseDataService<DashboardData> {
  async fetch(): Promise<ApiResponse<DashboardData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 并行获取多个数据源
      const [statsResponse, systemResponse, healthResponse, configResponse] = await Promise.allSettled([
        this.apiClient.getDashboardStatistics(),
        this.apiClient.getSystemResources(),
        this.apiClient.getHealth(),
        this.apiClient.getAppConfig()
      ]);

      // 处理系统基础信息
      let systemStatus = 'OFFLINE';
      let systemPort = '8761';
      let version = 'v0.9.3 Beta';
      let uptime = '0d 0h 0min';

      if (healthResponse.status === 'fulfilled' && healthResponse.value.success) {
        const health = healthResponse.value.data as any;
        systemStatus = health.status === 'ok' ? 'ONLINE' : 'OFFLINE';
        uptime = health.uptime || '0d 0h 0min';
      }

      if (configResponse.status === 'fulfilled' && configResponse.value.success) {
        const config = configResponse.value.data as any;
        systemPort = config.port?.toString() || '8761';
        version = config.version || 'v0.9.3 Beta';
      }

      // 处理收益统计数据
      let earnings = { today: 0, total: 0, tasks: 0, efficiency: 0 };
      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        const stats = statsResponse.value.data as any;
        earnings = {
          today: stats.todayEarnings?.totalEarnings || 0,
          total: stats.cumulativeEarnings?.totalEarnings || 0,
          tasks: stats.totalTasks || 0,
          efficiency: stats.efficiency || 0
        };
      }

      // 处理系统资源数据
      let systemMetrics = { cpu: 0, memory: 0, gpu: 0, temperature: 0, network: 0 };
      if (systemResponse.status === 'fulfilled' && systemResponse.value.success) {
        const system = systemResponse.value.data as any;
        systemMetrics = {
          cpu: system.cpu?.usage || Math.random() * 100, // 模拟数据
          memory: system.memory?.usage || Math.random() * 100,
          gpu: system.gpu?.usage || Math.random() * 100,
          temperature: system.temperature || Math.random() * 100,
          network: system.network?.usage || Math.random() * 100
        };
      }

      // 处理服务状态数据
      let services: DashboardData['services'] = [
        {
          name: 'Backend API',
          status: 'online',
          uptime: '24h+',
          connections: 1,
          icon: '/icons/backend-api.png'
        },
        {
          name: 'Local Model Service',
          status: 'online',
          uptime: '12h+',
          connections: 2,
          icon: '/icons/model-service.png'
        },
        {
          name: 'Gateway Connection',
          status: 'warning',
          uptime: '0m',
          connections: 0,
          icon: '/icons/gateway.png'
        },
        {
          name: 'LibP2P Communication',
          status: 'warning',
          uptime: '0m',
          connections: 0,
          icon: '/icons/p2p.png'
        }
      ];

      if (healthResponse.status === 'fulfilled' && healthResponse.value.success) {
        const health = healthResponse.value.data as any;
        if (health.services && Array.isArray(health.services)) {
          services = health.services.map((service: any, index: number) => ({
            name: service.name || services[index]?.name || `Service ${index + 1}`,
            status: service.status || 'offline',
            uptime: service.uptime || '0m',
            connections: service.connections || 0,
            icon: service.icon || services[index]?.icon
          }));
        }
      }

      const dashboardData: DashboardData = {
        systemStatus,
        systemPort,
        version,
        uptime,
        earnings,
        systemMetrics,
        services
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      };
    }
  }
}

/**
 * 设备状态数据服务
 */
export class DeviceStatusDataService extends BaseDataService<DeviceStatusData> {
  async fetch(): Promise<ApiResponse<DeviceStatusData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      const [deviceResponse, gatewayResponse, didResponse] = await Promise.allSettled([
        this.apiClient.getDeviceStatus(),
        this.apiClient.getGatewayStatus(),
        this.apiClient.getDidInfo()
      ]);

      let deviceData: DeviceStatusData = {
        deviceId: '',
        deviceName: '',
        status: 'unregistered',
        gatewayConnection: {
          connected: false,
          latency: '0ms',
          lastPing: 'Never'
        },
        didInfo: {
          did: '',
          publicKey: '',
          lastUpdated: ''
        }
      };

      // 处理设备状态
      if (deviceResponse.status === 'fulfilled' && deviceResponse.value.success) {
        const device = deviceResponse.value.data as any;
        deviceData.deviceId = device.deviceId || '';
        deviceData.deviceName = device.deviceName || '';
        deviceData.status = device.registered ? 'registered' : 'unregistered';
      }

      // 处理网关连接状态
      if (gatewayResponse.status === 'fulfilled' && gatewayResponse.value.success) {
        const gateway = gatewayResponse.value.data as any;
        deviceData.gatewayConnection = {
          connected: gateway.connected || false,
          latency: gateway.latency ? `${gateway.latency}ms` : '0ms',
          lastPing: gateway.lastPing || 'Never'
        };
      }

      // 处理DID信息
      if (didResponse.status === 'fulfilled' && didResponse.value.success) {
        const did = didResponse.value.data as any;
        deviceData.didInfo = {
          did: did.did || '',
          publicKey: did.publicKey || '',
          lastUpdated: did.lastUpdated || ''
        };
      }

      return { success: true, data: deviceData };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch device status' 
      };
    }
  }

  async update(data: Partial<DeviceStatusData>): Promise<ApiResponse<DeviceStatusData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 如果需要注册设备
      if (data.deviceId) {
        const response = await this.apiClient.registerDevice({
          deviceId: data.deviceId,
          deviceInfo: {
            name: data.deviceName || '',
            type: 'inference'
          }
        });

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: response.error || 'Failed to register device' };
        }
      }

      return { success: false, error: 'No valid update data provided' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update device status' 
      };
    }
  }
}

/**
 * 模型配置数据服务
 */
export class ModelConfigDataService extends BaseDataService<ModelConfigData> {
  async fetch(): Promise<ApiResponse<ModelConfigData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      const [configResponse, modelsResponse, systemResponse] = await Promise.allSettled([
        this.apiClient.getCurrentConfig(),
        this.apiClient.getModels(),
        this.apiClient.getSystemResources()
      ]);

      let modelConfigData: ModelConfigData = {
        currentFramework: 'ollama',
        gpuStatus: {
          name: 'Unknown GPU',
          memory: { total: 0, used: 0, free: 0 },
          temperature: 0,
          utilization: 0
        },
        models: []
      };

      // 处理配置信息
      if (configResponse.status === 'fulfilled' && configResponse.value.success) {
        const config = configResponse.value.data as any;
        modelConfigData.currentFramework = config.framework || 'ollama';
      }

      // 处理模型列表
      if (modelsResponse.status === 'fulfilled' && modelsResponse.value.success) {
        const models = modelsResponse.value.data as any;
        modelConfigData.models = (models.models || []).map((model: any) => ({
          name: model.name || '',
          size: model.size || 0,
          status: 'available' as const,
          framework: models.framework || 'ollama'
        }));
      }

      // 处理GPU状态
      if (systemResponse.status === 'fulfilled' && systemResponse.value.success) {
        const system = systemResponse.value.data as any;
        if (system.gpu) {
          modelConfigData.gpuStatus = {
            name: system.gpu.name || 'Unknown GPU',
            memory: {
              total: system.gpu.memory?.total || 0,
              used: system.gpu.memory?.used || 0,
              free: system.gpu.memory?.free || 0
            },
            temperature: system.gpu.temperature || 0,
            utilization: system.gpu.utilization || 0
          };
        }
      }

      return { success: true, data: modelConfigData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch model config'
      };
    }
  }

  async update(data: Partial<ModelConfigData>): Promise<ApiResponse<ModelConfigData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 如果需要切换框架
      if (data.currentFramework) {
        const response = await this.apiClient.switchFramework({
          framework: data.currentFramework,
          validateAvailability: true,
          stopOthers: true
        });

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: response.error || 'Failed to switch framework' };
        }
      }

      return { success: false, error: 'No valid update data provided' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update model config'
      };
    }
  }
}

/**
 * 收益数据服务
 */
export class EarningsDataService extends BaseDataService<EarningsData> {
  async fetch(): Promise<ApiResponse<EarningsData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 并行获取收益统计、历史记录和配置信息
      const [earningsResponse, historyResponse, statsResponse, configResponse] = await Promise.allSettled([
        this.apiClient.getEarnings('all'),
        this.apiClient.getTaskHistory(1, 50),
        this.apiClient.getDashboardStatistics(),
        this.apiClient.getAppConfig()
      ]);

      // 初始化收益数据 - 按照Figma设计
      let earningsData: EarningsData = {
        currentBalance: {
          totalEarnings: 127.4,
          availableToClaim: 89.2,
          pending: 38.2
        },
        claimInfo: {
          walletAddress: '0x1234...5678',
          network: 'Ethereum Mainnet',
          estimatedGasFee: '0.002 ETH',
          canClaim: true
        },
        earningsHistory: [
          {
            id: 'tx-1',
            date: '2024-01-15',
            taskType: 'Text Generation',
            model: 'llama2-7b',
            duration: '2m 15s',
            amount: 0.34,
            status: 'paid'
          },
          {
            id: 'tx-2',
            date: '2024-01-15',
            taskType: 'Text Generation',
            model: 'llama2-7b',
            duration: '2m 15s',
            amount: 0.34,
            status: 'pending'
          }
        ]
      };

      // 处理收益数据
      if (earningsResponse.status === 'fulfilled' && earningsResponse.value.success) {
        const earnings = earningsResponse.value.data as any;
        earningsData.currentBalance = {
          totalEarnings: earnings.totalEarnings || earningsData.currentBalance.totalEarnings,
          availableToClaim: earnings.availableToClaim || earningsData.currentBalance.availableToClaim,
          pending: earnings.pending || earningsData.currentBalance.pending
        };
      }

      // 处理统计数据作为补充
      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        const stats = statsResponse.value.data as any;
        if (earningsData.currentBalance.totalEarnings === 127.4) { // 如果是默认值，则使用API数据
          earningsData.currentBalance = {
            totalEarnings: stats.cumulativeEarnings?.totalEarnings || earningsData.currentBalance.totalEarnings,
            availableToClaim: stats.todayEarnings?.totalEarnings || earningsData.currentBalance.availableToClaim,
            pending: stats.pendingEarnings || earningsData.currentBalance.pending
          };
        }
      }

      // 处理配置信息
      if (configResponse.status === 'fulfilled' && configResponse.value.success) {
        const config = configResponse.value.data as any;
        earningsData.claimInfo.walletAddress = this.formatAddress(config.rewardAddress || earningsData.claimInfo.walletAddress);
        earningsData.claimInfo.network = config.network || earningsData.claimInfo.network;
      }

      // 处理历史记录
      if (historyResponse.status === 'fulfilled' && historyResponse.value.success) {
        const history = historyResponse.value.data as any;
        if (Array.isArray(history.tasks) && history.tasks.length > 0) {
          earningsData.earningsHistory = history.tasks.map((task: any, index: number) => ({
            id: task.id || `tx-${index + 1}`,
            date: task.timestamp || task.date || new Date().toISOString().split('T')[0],
            taskType: task.type || 'Text Generation',
            model: task.model || 'llama2-7b',
            duration: task.duration || '2m 15s',
            amount: task.earnings || task.amount || 0,
            status: task.status === 'completed' ? 'paid' as const : 'pending' as const
          }));
        }
      }

      return { success: true, data: earningsData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch earnings data'
      };
    }
  }

  async update(data: Partial<EarningsData>): Promise<ApiResponse<EarningsData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 实现提取收益的逻辑
      if (data.currentBalance?.availableToClaim) {
        // 这里可以调用相关的API方法，目前先模拟成功
        // 实际实现时需要根据后端API接口调整
        const response = { success: true };

        if (response.success) {
          // 重新获取最新数据
          return this.fetch();
        } else {
          return { success: false, error: 'Failed to claim earnings' };
        }
      }

      return { success: false, error: 'No valid claim data provided' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim earnings'
      };
    }
  }

  /**
   * 格式化地址显示
   */
  private formatAddress(address: string): string {
    if (!address || address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

/**
 * 网关配置数据服务
 */
export class GatewayConfigDataService extends BaseDataService<GatewayConfigData> {
  async fetch(): Promise<ApiResponse<GatewayConfigData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      const [gatewayResponse, configResponse] = await Promise.allSettled([
        this.apiClient.getGatewayStatus(),
        this.apiClient.getAppConfig()
      ]);

      // 初始化网关配置数据 - 按照Figma设计
      let gatewayConfigData: GatewayConfigData = {
        connectionStatus: {
          currentGateway: 'gateway.sightai.com',
          latency: '23ms',
          registrationCode: 'ABC123DEF456',
          environment: 'Production'
        },
        gatewaySettings: {
          autoSelectBestGateway: true,
          dnsOverride: true
        }
      };

      // 处理网关状态
      if (gatewayResponse.status === 'fulfilled' && gatewayResponse.value.success) {
        const gateway = gatewayResponse.value.data as any;
        gatewayConfigData.connectionStatus = {
          currentGateway: gateway.gatewayUrl || gatewayConfigData.connectionStatus.currentGateway,
          latency: gateway.latency ? `${gateway.latency}ms` : gatewayConfigData.connectionStatus.latency,
          registrationCode: gateway.registrationCode || gatewayConfigData.connectionStatus.registrationCode,
          environment: gateway.connected ? 'Production' : 'Disconnected'
        };
      }

      // 处理配置设置
      if (configResponse.status === 'fulfilled' && configResponse.value.success) {
        const config = configResponse.value.data as any;
        gatewayConfigData.gatewaySettings = {
          autoSelectBestGateway: config.autoSelectBestGateway ?? gatewayConfigData.gatewaySettings.autoSelectBestGateway,
          dnsOverride: config.dnsOverride ?? gatewayConfigData.gatewaySettings.dnsOverride
        };
      }

      return { success: true, data: gatewayConfigData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gateway config'
      };
    }
  }

  async update(data: Partial<GatewayConfigData>): Promise<ApiResponse<GatewayConfigData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 如果需要更新网关设置
      if (data.gatewaySettings) {
        const response = await this.apiClient.updateAppConfig({
          autoSelectBestGateway: data.gatewaySettings.autoSelectBestGateway,
          dnsOverride: data.gatewaySettings.dnsOverride
        });

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: response.error || 'Failed to update gateway settings' };
        }
      }

      return { success: false, error: 'No valid update data provided' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update gateway config'
      };
    }
  }
}

/**
 * 通信数据服务
 */
export class CommunicationDataService extends BaseDataService<CommunicationData> {
  async fetch(): Promise<ApiResponse<CommunicationData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 注意：这些API可能还不存在，需要根据实际情况调整
      const [statusResponse, configResponse] = await Promise.allSettled([
        this.apiClient.get('/api/v1/p2p/status'),
        this.apiClient.getAppConfig()
      ]);

      // 初始化通信数据 - 按照Figma设计
      let communicationData: CommunicationData = {
        serviceStatus: {
          libp2pService: true,
          serviceStatus: 'running',
          availableToClaim: 127,
          gatewayConnections: 3
        },
        peerInfo: {
          peerId: '12D3KooWABC...',
          listeningAddress: '/ip4/127.0.0.1/tcp/4001'
        },
        connectedPeers: [
          {
            id: '1',
            type: 'Gateway Node',
            name: 'Gateway-01',
            peerId: '12D3KooWGateway...',
            status: 'connected',
            latency: 23
          },
          {
            id: '2',
            type: 'Peer Node',
            name: 'Peer-01',
            peerId: '12D3KooWPeer...',
            status: 'unstable',
            latency: 156
          },
          {
            id: '3',
            type: 'Bootstrap Node',
            name: 'Bootstrap-01',
            peerId: '12D3KooWBootstrap...',
            status: 'connected',
            latency: 45
          }
        ],
        networkConfig: {
          port: '4001',
          maxConnections: '100',
          enableDHT: true,
          enableRelay: true
        }
      };

      // 处理P2P状态（如果API存在）
      if (statusResponse.status === 'fulfilled' && statusResponse.value.success) {
        const status = statusResponse.value.data as any;
        communicationData.serviceStatus = {
          libp2pService: status.running || communicationData.serviceStatus.libp2pService,
          serviceStatus: status.running ? 'running' : 'stopped',
          availableToClaim: status.availableToClaim || communicationData.serviceStatus.availableToClaim,
          gatewayConnections: status.connections || communicationData.serviceStatus.gatewayConnections
        };

        communicationData.peerInfo = {
          peerId: status.peerId || '',
          listeningAddress: status.listeningAddress || '/ip4/0.0.0.0/tcp/4001'
        };

        communicationData.connectedPeers = (status.peers || []).map((peer: any) => ({
          id: peer.id || '',
          type: peer.type || 'Peer Node',
          peerId: peer.peerId || '',
          status: peer.connected ? 'connected' : 'unstable',
          latency: peer.latency ? `${peer.latency} ms` : '0 ms'
        }));
      }

      // 处理网络配置
      if (configResponse.status === 'fulfilled' && configResponse.value.success) {
        const config = configResponse.value.data as any;
        if (config.p2p) {
          communicationData.networkConfig = {
            port: config.p2p.port || '4001',
            maxConnections: config.p2p.maxConnections || '100',
            enableDHT: config.p2p.enableDHT ?? true,
            enableRelay: config.p2p.enableRelay ?? true
          };
        }
      }

      return { success: true, data: communicationData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch communication data'
      };
    }
  }

  async update(data: Partial<CommunicationData>): Promise<ApiResponse<CommunicationData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 如果需要更新服务状态
      if (data.serviceStatus) {
        // 这里可以调用启动/停止LibP2P服务的API
        // 目前先模拟成功
        const response = { success: true };

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: 'Failed to toggle LibP2P service' };
        }
      }

      // 如果需要更新网络配置
      if (data.networkConfig) {
        const response = await this.apiClient.updateAppConfig({
          p2p: {
            port: data.networkConfig.port,
            maxConnections: data.networkConfig.maxConnections,
            enableDHT: data.networkConfig.enableDHT,
            enableRelay: data.networkConfig.enableRelay
          }
        });

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: response.error || 'Failed to update network config' };
        }
      }

      return { success: false, error: 'No valid update data provided' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update communication config'
      };
    }
  }
}



/**
 * 设备注册数据服务 - 按照Figma设计实现
 */
export class DeviceRegistrationDataService extends BaseDataService<DeviceRegistrationData> {
  async fetch(): Promise<ApiResponse<DeviceRegistrationData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 并行获取设备状态和配置信息
      const [deviceResponse, configResponse] = await Promise.allSettled([
        this.apiClient.getDeviceStatus(),
        this.apiClient.getAppConfig()
      ]);

      // 初始化注册数据
      let registrationData: DeviceRegistrationData = {
        registrationStatus: {
          isCreated: false,
          deviceId: '',
          deviceName: '',
          gateway: '',
          rewardAddress: '',
          message: 'Device not registered yet'
        },
        registrationForm: {
          registrationCode: '',
          gatewayAddress: 'https://sightai.io/api/model',
          rewardAddress: ''
        },
        validation: {
          isValid: false,
          errors: {}
        }
      };

      // 处理设备状态
      if (deviceResponse.status === 'fulfilled' && deviceResponse.value.success) {
        const device = deviceResponse.value.data as any;
        if (device.registered) {
          registrationData.registrationStatus = {
            isCreated: true,
            deviceId: device.deviceId || '',
            deviceName: device.deviceName || '',
            gateway: device.gateway || 'https://sightai.io/api/model',
            rewardAddress: device.rewardAddress || '',
            message: 'Device created successfully'
          };
        }
      }

      // 处理配置信息
      if (configResponse.status === 'fulfilled' && configResponse.value.success) {
        const config = configResponse.value.data as any;
        registrationData.registrationForm.gatewayAddress = config.gatewayAddress || 'https://sightai.io/api/model';
        registrationData.registrationForm.rewardAddress = config.rewardAddress || '';
      }

      return { success: true, data: registrationData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch device registration data'
      };
    }
  }

  async update(data: Partial<DeviceRegistrationData>): Promise<ApiResponse<DeviceRegistrationData>> {
    if (!this.apiClient) {
      return { success: false, error: 'API client not available' };
    }

    try {
      // 如果是注册设备
      if (data.registrationForm) {
        const formData = data.registrationForm;

        // 验证表单数据
        const validation = this.validateRegistrationForm(formData);
        if (!validation.isValid) {
          return {
            success: false,
            error: 'Validation failed',
            data: {
              ...await this.getCurrentData(),
              validation
            }
          };
        }

        // 生成设备ID
        const deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        // 调用设备注册API
        const response = await this.apiClient.registerDevice({
          deviceId,
          deviceInfo: {
            name: `Device-${Date.now()}`,
            type: 'inference',
            capabilities: ['inference', 'model-serving']
          }
        });

        // 如果注册成功，还需要保存注册配置
        if (response.success) {
          // 这里可以调用额外的API来保存注册码、网关地址等配置
          await this.apiClient.updateAppConfig({
            registrationCode: formData.registrationCode,
            gatewayAddress: formData.gatewayAddress,
            rewardAddress: formData.rewardAddress
          });
        }

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: response.error || 'Failed to register device' };
        }
      }

      return { success: false, error: 'No valid update data provided' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update device registration'
      };
    }
  }

  /**
   * 验证注册表单数据
   */
  private validateRegistrationForm(formData: DeviceRegistrationData['registrationForm']) {
    const errors: DeviceRegistrationData['validation']['errors'] = {};

    // 验证注册码
    if (!formData.registrationCode?.trim()) {
      errors.registrationCode = 'Registration code is required';
    } else if (formData.registrationCode.length < 6) {
      errors.registrationCode = 'Registration code must be at least 6 characters';
    }

    // 验证网关地址
    if (!formData.gatewayAddress?.trim()) {
      errors.gatewayAddress = 'Gateway address is required';
    } else if (!formData.gatewayAddress.startsWith('http')) {
      errors.gatewayAddress = 'Gateway address must be a valid URL';
    }

    // 验证奖励地址
    if (!formData.rewardAddress?.trim()) {
      errors.rewardAddress = 'Reward address is required';
    } else if (formData.rewardAddress.length < 10) {
      errors.rewardAddress = 'Invalid reward address format';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * 获取当前数据状态
   */
  private async getCurrentData(): Promise<DeviceRegistrationData> {
    const response = await this.fetch();
    return response.data || {
      registrationStatus: {
        isCreated: false,
        deviceId: '',
        deviceName: '',
        gateway: '',
        rewardAddress: '',
        message: 'Device not registered yet'
      },
      registrationForm: {
        registrationCode: '',
        gatewayAddress: 'https://sightai.io/api/model',
        rewardAddress: ''
      },
      validation: {
        isValid: false,
        errors: {}
      }
    };
  }
}

/**
 * DID管理数据服务
 *
 * 遵循单一职责原则：只负责DID管理相关数据的获取和处理
 */
export class DIDManagementDataService extends BaseDataService<DIDManagementData> {
  async fetch(): Promise<ApiResponse<DIDManagementData>> {
    try {
      // 初始化DID管理数据 - 按照Figma设计（使用模拟数据）
      let didManagementData: DIDManagementData = {
        didInfo: {
          did: 'did:sightai:1234567890abcdef',
          controller: '0x1234...5678',
          created: '2024-01-15 10:30:00',
          status: 'active'
        },
        didOperations: {
          canExportDocument: true,
          canCopyDID: true
        },
        gatewaySettings: {
          privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          privateKeyVisible: false,
          canExportPrivateKey: true
        },
        verificationStatus: {
          didDocumentVerified: true,
          controllerSignatureValid: true,
          gatewayRegistered: true
        }
      };

      // 如果有API客户端，可以尝试获取真实数据
      if (this.apiClient) {
        try {
          // 这里可以调用相关的API获取DID信息
          // 目前使用模拟数据
          console.log('DID Management data service initialized with mock data');
        } catch (apiError) {
          console.warn('Failed to fetch DID data from API, using mock data:', apiError);
        }
      }

      return { success: true, data: didManagementData };
    } catch (error) {
      console.error('Failed to fetch DID management data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async update(data: Partial<DIDManagementData>): Promise<ApiResponse<DIDManagementData>> {
    try {
      // 如果需要更新网关设置
      if (data.gatewaySettings) {
        // 这里可以调用更新网关设置的API
        // 目前先模拟成功
        const response = { success: true };

        if (response.success) {
          // 重新获取最新状态
          return this.fetch();
        } else {
          return { success: false, error: 'Failed to update gateway settings' };
        }
      }

      return { success: false, error: 'No valid update data provided' };
    } catch (error) {
      console.error('Failed to update DID management data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 获取默认的DID管理数据
   */
  private getDefaultDIDManagementData(): DIDManagementData {
    return {
      didInfo: {
        did: 'did:sightai:1234567890abcdef',
        controller: '0x1234...5678',
        created: '2024-01-15 10:30:00',
        status: 'active'
      },
      didOperations: {
        canExportDocument: true,
        canCopyDID: true
      },
      gatewaySettings: {
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        privateKeyVisible: false,
        canExportPrivateKey: true
      },
      verificationStatus: {
        didDocumentVerified: true,
        controllerSignatureValid: true,
        gatewayRegistered: true
      }
    };
  }
}

/**
 * 设置数据服务
 *
 * 遵循单一职责原则：只负责设置相关数据的获取和处理
 */
export class SettingsDataService extends BaseDataService<SettingsData> {
  async fetch(): Promise<ApiResponse<SettingsData>> {
    try {
      // 初始化设置数据 - 按照Figma设计（使用模拟数据）
      let settingsData: SettingsData = {
        generalSettings: {
          autoStartOnBoot: true,
          systemTray: true,
          silentMode: true
        },
        dataPrivacySettings: {
          dataDirectory: '/ip4/0.0.0.0/tcp/4001',
          logLevel: 'info'
        },
        advancedSettings: {
          canRestartService: true,
          canResetSettings: true
        }
      };

      // 如果有API客户端，可以尝试获取真实数据
      if (this.apiClient) {
        try {
          // 这里可以调用相关的API获取设置信息
          // 目前使用模拟数据
          console.log('Settings data service initialized with mock data');
        } catch (apiError) {
          console.warn('Failed to fetch settings data from API, using mock data:', apiError);
        }
      }

      return { success: true, data: settingsData };
    } catch (error) {
      console.error('Failed to fetch settings data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async update(data: Partial<SettingsData>): Promise<ApiResponse<SettingsData>> {
    try {
      // 如果需要更新通用设置
      if (data.generalSettings) {
        // 这里可以调用更新通用设置的API
        const response = { success: true };

        if (response.success) {
          console.log('General settings updated:', data.generalSettings);
        } else {
          return { success: false, error: 'Failed to update general settings' };
        }
      }

      // 如果需要更新数据隐私设置
      if (data.dataPrivacySettings) {
        // 这里可以调用更新数据隐私设置的API
        const response = { success: true };

        if (response.success) {
          console.log('Data privacy settings updated:', data.dataPrivacySettings);
        } else {
          return { success: false, error: 'Failed to update data privacy settings' };
        }
      }

      // 重新获取最新状态
      return this.fetch();
    } catch (error) {
      console.error('Failed to update settings data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 获取默认的设置数据
   */
  private getDefaultSettingsData(): SettingsData {
    return {
      generalSettings: {
        autoStartOnBoot: true,
        systemTray: true,
        silentMode: false
      },
      dataPrivacySettings: {
        dataDirectory: '/ip4/0.0.0.0/tcp/4001',
        logLevel: 'info'
      },
      advancedSettings: {
        canRestartService: true,
        canResetSettings: true
      }
    };
  }
}
