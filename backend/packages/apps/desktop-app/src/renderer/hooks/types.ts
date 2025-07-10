/**
 * 自定义Hook类型定义
 * 
 * 遵循SOLID原则的类型定义，提供抽象接口和依赖倒置
 */

// ============= 基础类型定义 =============

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * 后端状态接口
 */
export interface BackendStatus {
  isRunning: boolean;
  port: number;
}

/**
 * 加载状态接口
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * 数据获取配置接口
 */
export interface FetchConfig {
  autoRefresh?: boolean;
  refreshInterval?: number;
  retryCount?: number;
  timeout?: number;
}

// ============= 抽象接口定义 =============

/**
 * 数据服务抽象接口 (依赖倒置原则)
 */
export interface IDataService<T> {
  fetch(): Promise<ApiResponse<T>>;
  update?(data: Partial<T>): Promise<ApiResponse<T>>;
  delete?(id: string): Promise<ApiResponse<void>>;
}

/**
 * 状态管理抽象接口
 */
export interface IStateManager<T> {
  data: T | null;
  loading: LoadingState;
  refresh(): Promise<void>;
  reset(): void;
}

/**
 * 错误处理抽象接口
 */
export interface IErrorHandler {
  handleError(error: unknown): string;
  retryOperation<T>(operation: () => Promise<T>, maxRetries?: number): Promise<T>;
}

// ============= 业务数据类型定义 =============

/**
 * Dashboard相关数据类型 - 按照Figma设计更新
 */
export interface DashboardData {
  // 系统基础信息
  systemStatus: string;
  systemPort: string;
  version: string;
  uptime: string;

  // 收益统计
  earnings: {
    today: number;
    total: number;
    tasks: number;
    efficiency: number;
  };

  // 系统资源指标
  systemMetrics: {
    cpu: number;
    memory: number;
    gpu: number;
    temperature: number;
    network: number;
  };

  // 服务状态
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'warning';
    uptime: string;
    connections: number;
    icon?: string;
  }>;
}

/**
 * 设备状态数据类型
 */
export interface DeviceStatusData {
  deviceId: string;
  deviceName: string;
  status: 'registered' | 'unregistered' | 'pending';
  gatewayConnection: {
    connected: boolean;
    latency: string;
    lastPing: string;
  };
  didInfo: {
    did: string;
    publicKey: string;
    lastUpdated: string;
  };
}

/**
 * 设备注册数据类型 - 按照Figma设计
 */
export interface DeviceRegistrationData {
  // 设备注册状态
  registrationStatus: {
    isCreated: boolean;
    deviceId: string;
    deviceName: string;
    gateway: string;
    rewardAddress: string;
    message: string;
  };

  // 注册表单数据
  registrationForm: {
    registrationCode: string;
    gatewayAddress: string;
    rewardAddress: string;
  };

  // 验证状态
  validation: {
    isValid: boolean;
    errors: {
      registrationCode?: string;
      gatewayAddress?: string;
      rewardAddress?: string;
    };
  };
}

/**
 * 模型配置数据类型
 */
export interface ModelConfigData {
  currentFramework: 'ollama' | 'vllm';
  gpuStatus: {
    name: string;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    temperature: number;
    utilization: number;
  };
  models: Array<{
    name: string;
    size: number;
    status: 'available' | 'downloading' | 'error';
    framework: string;
  }>;
}

/**
 * 收益数据类型 - 按照Figma设计更新
 */
export interface EarningsData {
  // 当前余额信息
  currentBalance: {
    totalEarnings: number;
    availableToClaim: number;
    pending: number;
  };

  // 提取收益信息
  claimInfo: {
    walletAddress: string;
    network: string;
    estimatedGasFee: string;
    canClaim: boolean;
  };

  // 收益历史记录
  earningsHistory: Array<{
    id: string;
    date: string;
    taskType: string;
    model: string;
    duration: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
  }>;
}

/**
 * 网关配置数据类型
 */
export interface GatewayConfigData {
  // 连接状态信息
  connectionStatus: {
    currentGateway: string;
    latency: string;
    registrationCode: string;
    environment: string;
  };

  // 网关设置
  gatewaySettings: {
    autoSelectBestGateway: boolean;
    dnsOverride: boolean;
  };
}

/**
 * 通信数据类型 - 按照Figma设计更新
 */
export interface CommunicationData {
  // 服务状态
  serviceStatus: {
    libp2pService: boolean;
    serviceStatus: 'running' | 'stopped';
    availableToClaim: number;
    gatewayConnections: number;
  };

  // Peer信息
  peerInfo: {
    peerId: string;
    listeningAddress: string;
  };

  // 连接的Peers
  connectedPeers: Array<{
    id: string;
    type: 'Gateway Node' | 'Peer Node' | 'Bootstrap Node';
    name: string;
    peerId: string;
    status: 'connected' | 'unstable' | 'disconnected';
    latency: number;
  }>;

  // 网络配置
  networkConfig: {
    port: string;
    maxConnections: string;
    enableDHT: boolean;
    enableRelay: boolean;
  };
}

/**
 * DID管理数据类型 - 按照Figma设计
 */
export interface DIDManagementData {
  // DID信息
  didInfo: {
    did: string;
    controller: string;
    created: string;
    status: 'active' | 'inactive' | 'pending';
  };

  // DID操作
  didOperations: {
    canExportDocument: boolean;
    canCopyDID: boolean;
  };

  // 网关设置
  gatewaySettings: {
    privateKey: string;
    privateKeyVisible: boolean;
    canExportPrivateKey: boolean;
  };

  // 验证状态
  verificationStatus: {
    didDocumentVerified: boolean;
    controllerSignatureValid: boolean;
    gatewayRegistered: boolean;
  };
}

/**
 * 设置数据类型 - 按照Figma设计
 */
export interface SettingsData {
  // 通用设置
  generalSettings: {
    autoStartOnBoot: boolean;
    systemTray: boolean;
    silentMode: boolean;
  };

  // 数据和隐私设置
  dataPrivacySettings: {
    dataDirectory: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };

  // 高级设置
  advancedSettings: {
    canRestartService: boolean;
    canResetSettings: boolean;
  };
}



// ============= Hook返回类型定义 =============

/**
 * 基础Hook返回类型
 */
export interface BaseHookReturn<T> extends IStateManager<T> {
  config: FetchConfig;
  updateConfig(newConfig: Partial<FetchConfig>): void;
}

/**
 * 可更新Hook返回类型
 */
export interface UpdatableHookReturn<T> extends BaseHookReturn<T> {
  update(data: Partial<T>): Promise<boolean>;
  isUpdating: boolean;
}

/**
 * 可操作Hook返回类型
 */
export interface ActionableHookReturn<T, A = any> extends BaseHookReturn<T> {
  executeAction(action: A): Promise<boolean>;
  isExecuting: boolean;
  lastActionResult: string | null;
}
