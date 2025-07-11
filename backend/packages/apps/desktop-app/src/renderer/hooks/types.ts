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
  data: T | any;
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
 * Dashboard相关数据类型 更新
 */
export interface DashboardData {
  // 系统基础信息
  systemInfo: {
    status: string;
    port: string;
    version: string;
    uptime: string;
  };

  // 收益统计
  earnings: {
    today: number;
    total: number;
    tasks: number;
    efficiency: number;
  };

  // 系统资源指标
  systemResources: {
    cpu: { usage: number; cores: number; model: string };
    memory: { usage: number; total: number; used: number };
    gpu: { usage: number; memory: number; temperature: number };
    disk: { usage: number; total: number; used: number };
  };

  // 服务状态
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'warning';
    uptime: string;
    connections: number;
    icon?: string;
  }>;

  // 最近活动记录
  recentActivity: Array<{
    id: string;
    timestamp: string;
    type: 'task' | 'system' | 'error';
    message: string;
    details?: string;
  }>;
}

/**
 * 设备状态数据类型
 */
export interface DeviceStatusData {
  deviceId: string;
  deviceName: string;
  status: 'registered' | 'unregistered' | 'pending';
  lastSeen: string;
  systemInfo: {
    os: string;
    cpu: string;
    memory: string;
    gpu: string;
  };
  networkInfo: {
    ipAddress: string;
    port: number;
    latency: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage: number;
    diskUsage: number;
  };
}

/**
 * 设备注册数据类型 
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
  availableModels: Array<{
    name: string;
    size: number;
    description: string;
    tags: string[];
    popularity: number;
  }>;
  installedModels: Array<{
    name: string;
    size: number;
    modified_at: string;
    digest: string;
    details: {
      format: string;
      family: string;
      families: string[];
      parameter_size: string;
      quantization_level: string;
    };
  }>;
  modelStatus: Record<string, 'ready' | 'downloading' | 'error'>;
  downloadProgress: Record<string, number>;
}

/**
 * 收益数据类型 更新
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

  // 可用网关列表
  availableGateways: Array<{
    name: string;
    url: string;
    region: string;
    latency: number;
    status: 'online' | 'offline' | 'warning';
    load: number;
  }>;

  // 连接历史
  connectionHistory: Array<{
    timestamp: string;
    gateway: string;
    status: 'connected' | 'disconnected';
    latency: number;
    duration: number;
  }>;
}

/**
 * 通信数据类型 更新
 */
export interface CommunicationData {
  // 服务状态
  serviceStatus: {
    libp2pService: boolean;
    serviceStatus: 'running' | 'stopped';
    availableToClaim: number;
    gatewayConnections: number;
  };

  // 网络配置
  networkConfig: {
    port: string;
    maxConnections: string;
    enableDHT: boolean;
    enableRelay: boolean;
  };

  // Peer连接
  peerConnections: Array<{
    peerId: string;
    address: string;
    status: 'connected' | 'disconnected';
    latency: number;
    lastSeen: string;
    dataTransferred: number;
  }>;

  // 消息历史
  messageHistory: Array<{
    id: string;
    timestamp: string;
    type: string;
    from: string;
    to: string;
    status: 'delivered' | 'pending' | 'failed';
    size: number;
  }>;
}

/**
 * DID管理数据类型 
 */
export interface DIDManagementData {
  // DID信息
  didInfo: {
    did: string;
    publicKey: string;
    controller: string;
    created: string;
    updated: string;
    status: 'active' | 'inactive' | 'pending';
  };
  data: any,
  // 验证方法
  verificationMethods: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;

  // 服务
  services: Array<{
    id: string;
    type: string;
    serviceEndpoint: any;
  }>;

  // 密钥管理
  keyManagement: {
    keyRotationEnabled: boolean;
    lastRotation: string;
    nextRotation: string;
    backupStatus: string;
  };
}

/**
 * 设置数据类型 
 */
export interface SettingsData {
  // 通用设置
  generalSettings: {
    autoStartOnBoot: boolean;
    minimizeToTray: boolean;
    enableNotifications: boolean;
    language: string;
    theme: string;
    autoUpdate: boolean;
  };

  // 性能设置
  performanceSettings: {
    maxCpuUsage: number;
    maxMemoryUsage: number;
    maxGpuUsage: number;
    enableGpuAcceleration: boolean;
    modelCacheSize: number;
    concurrentTasks: number;
  };

  // 网络设置
  networkSettings: {
    enableP2P: boolean;
    p2pPort: number;
    maxConnections: number;
    enableUPnP: boolean;
    bandwidthLimit: number;
    enableProxy: boolean;
    proxySettings: {
      host: string;
      port: number;
      username: string;
      password: string;
    };
  };

  // 安全设置
  securitySettings: {
    enableEncryption: boolean;
    requireAuthentication: boolean;
    sessionTimeout: number;
    enableLogging: boolean;
    logLevel: string;
    enableFirewall: boolean;
  };

  // 高级设置
  advancedSettings: {
    debugMode: boolean;
    enableTelemetry: boolean;
    customConfigPath: string;
    enableExperimentalFeatures: boolean;
    apiTimeout: number;
    retryAttempts: number;
  };
}

/**
 * 模型配置数据类型 
 */
export interface ModelConfigurationData {
  // 当前模式
  mode: 'local' | 'cloud' | 'hybrid';

  // GPU状态
  gpuStatus: {
    name: string;
    memory: number;
    utilization: number;
    temperature: number;
    powerDraw: number;
  };

  // 模型设置
  modelSettings: {
    defaultModel: string;
    maxContextLength: number;
    temperature: number;
    topP: number;
    topK: number;
    repeatPenalty: number;
    seed: number;
  };

  // 性能设置
  performanceSettings: {
    batchSize: number;
    numThreads: number;
    useGPU: boolean;
    gpuLayers: number;
    memoryMap: boolean;
    lockMemory: boolean;
  };

  // 资源限制
  resourceLimits: {
    maxMemoryUsage: number;
    maxCpuUsage: number;
    maxGpuUsage: number;
    timeoutSeconds: number;
  };

  // 优化选项
  optimizations: {
    enableQuantization: boolean;
    enableCaching: boolean;
    enablePrefetch: boolean;
    enableBatching: boolean;
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
