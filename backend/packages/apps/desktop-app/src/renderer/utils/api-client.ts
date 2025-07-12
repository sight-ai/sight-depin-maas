/**
 * API 客户端工具
 *
 * 提供统一的 API 调用接口，支持错误处理、超时控制和重试机制
 */


export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface BackendStatus {
  isRunning: boolean;
  port: number;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(backendStatus: BackendStatus, timeout = 10000) {
    this.baseUrl = `http://localhost:${backendStatus.port}`;
    this.timeout = timeout;
  }

  /**
   * 通用 API 请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs?: number
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        // signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string, timeoutMs?: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, timeoutMs);
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, data?: any, timeoutMs?: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, timeoutMs);
  }

  /**
   * PUT 请求
   */
  async put<T>(endpoint: string, data?: any, timeoutMs?: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, timeoutMs);
  }

  // ===== 具体 API 方法 =====

  /**
   * 健康检查
   */
  async getHealth() {
    return this.get('/api/v1/health', 5000);
  }

  /**
   * 获取系统资源信息 (已存在的接口)
   */
  async getSystemResources() {
    return this.get('/api/app/system-resources', 5000);
  }

  /**
   * 获取应用状态 (已存在的接口)
   */
  async getAppStatus() {
    return this.get('/api/app/status', 5000);
  }



  /**
   * 更新应用配置 (已存在的接口)
   */
  async updateAppConfig(config: any) {
    return this.put('/api/app/config', config);
  }

  /**
   * 切换推理框架 (已存在的接口)
   */
  async switchAppFramework(framework: 'ollama' | 'vllm', options?: {
    validateAvailability?: boolean;
    stopOthers?: boolean;
    restartRequired?: boolean;
  }) {
    return this.post('/api/app/switch-framework', { framework, ...options });
  }

  /**
   * 执行应用健康检查 (已存在的接口)
   */
  async performAppHealthCheck() {
    return this.get('/api/app/health', 5000);
  }

  /**
   * 获取仪表板统计
   */
  async getDashboardStatistics(timeRange?: string) {
    const params = timeRange ? `?timeRange=${encodeURIComponent(timeRange)}` : '';
    return this.get(`/api/v1/dashboard/statistics${params}`);
  }

  /**
   * 获取任务计数
   */
  async getTaskCount(period: 'today' | 'week' | 'month' | 'all' = 'today') {
    return this.get(`/api/v1/dashboard/task-count?period=${period}`);
  }

  /**
   * 获取任务活动
   */
  async getTaskActivity() {
    return this.get('/api/v1/dashboard/task-activity');
  }

  /**
   * 获取任务趋势
   */
  async getTaskTrends(days = 30) {
    return this.get(`/api/v1/dashboard/task-trends?days=${days}`);
  }

  /**
   * 获取收益数据
   */
  async getEarnings(period: 'today' | 'week' | 'month' | 'all' = 'today') {
    return this.get(`/api/v1/dashboard/earnings?period=${period}`);
  }

  /**
   * 获取服务状态
   */
  async getServicesStatus() {
    return this.get('/api/v1/services/status');
  }

  /**
   * 获取特定服务状态
   */
  async getServiceStatus(serviceName: string) {
    return this.get(`/api/v1/services/${serviceName}/status`);
  }

  /**
   * 获取当前推理框架
   */
  async getCurrentFramework() {
    return this.get('/api/v1/config/current');
  }

  /**
   * 获取设备状态
   */
  async getDeviceStatus() {
    return this.get('/api/v1/device-status');
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo() {
    return this.get('/api/v1/device-status/registration-info');
  }

  /**
   * 注册设备
   */
  async registerDevice(credentials: {
    code: string;
    gateway_address: string;
    reward_address: string;
    basePath?: string;
  }) {
    return this.post('/api/v1/device-status/register', credentials);
  }

  /**
   * 获取网关状态
   */
  async getGatewayStatus() {
    return this.get('/api/v1/device-status/gateway-status');
  }

  /**
   * 更新 DID
   */
  async updateDid() {
    return this.post('/api/v1/device-status/update-did');
  }

  /**
   * 获取 DID 信息
   */
  async getDidInfo() {
    return this.get('/api/v1/device-status/did-info');
  }

  /**
   * 获取注册信息
   */
  async getRegistrationInfo() {
    return this.get('/api/v1/device-status/registration-info');
  }

  /**
   * 获取模型列表
   */
  async getModels() {
    return this.get('/api/v1/models/list');
  }

  /**
   * 报告模型到网关
   */
  async reportModels(models: string[]) {
    return this.post('/api/v1/models/report', { models });
  }

  /**
   * 获取挖矿摘要
   */
  async getMiningSummary(timeRange?: string) {
    const params = timeRange ? `?timeRange=${encodeURIComponent(timeRange)}` : '';
    return this.get(`/api/v1/miner/summary${params}`);
  }

  /**
   * 获取任务历史
   */
  async getTaskHistory(page = 1, limit = 10) {
    return this.get(`/api/v1/miner/history?page=${page}&limit=${limit}`);
  }

  /**
   * 获取连接任务列表
   */
  async getConnectedTaskList(page = 1, limit = 10, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append('status', status);
    }
    return this.get(`/api/v1/miner/connect-task-list?${params}`);
  }



  /**
   * 获取当前配置
   */
  async getCurrentConfig() {
    return this.get('/api/v1/config/current');
  }

  /**
   * 切换推理框架
   */
  async switchFramework(options: {
    framework: 'ollama' | 'vllm';
    validateAvailability?: boolean;
    stopOthers?: boolean;
    restartRequired?: boolean;
  }) {
    return this.post('/api/v1/config/switch-framework', options);
  }

  /**
   * 更新 vLLM 配置
   */
  async updateVllmConfig(config: {
    gpuMemoryUtilization?: number;
    maxModelLen?: number;
    maxNumSeqs?: number;
    maxNumBatchedTokens?: number;
    enforceEager?: boolean;
    swapSpace?: number;
    tensorParallelSize?: number;
    pipelineParallelSize?: number;
    blockSize?: number;
    quantization?: string;
  }) {
    return this.put('/api/v1/config/vllm', config);
  }

  /**
   * 更新通用配置
   */
  async updateGenericConfig(config: {
    configFile: string;
    key: string;
    value: any;
    gatewayPath?: string;
  }) {
    return this.put('/api/v1/config/generic', config);
  }

  // ===== P2P 通信接口 =====

  /**
   * 获取邻居节点列表
   */
  async getPeerNeighbors() {
    return this.get('/peer/neighbors');
  }

  /**
   * 获取所有 DID 文档
   */
  async getAllPeerDocuments() {
    return this.get('/peer/all-documents');
  }

  /**
   * 添加节点
   */
  async addPeer(peerData: {
    did?: string;
    peerId?: string;
    multiAddr?: string;
  }) {
    return this.post('/peer/add', peerData);
  }

  /**
   * 发送测试消息
   */
  async sendTestMessage(data: {
    peerId: string;
    message: string;
  }) {
    return this.post('/peer/send-test-message', data);
  }

  /**
   * 获取本地 DID
   */
  async getMyDid() {
    return this.get('/did/my-did');
  }

  /**
   * 获取本地公钥
   */
  async getMyPublicKey() {
    return this.get('/did/my-public-key');
  }

  /**
   * 获取 DID 文档
   */
  async getDidDocument() {
    return this.get('/did/document');
  }

  // ===== 进程管理接口 =====

  /**
   * 获取 Ollama 进程状态
   */
  async getOllamaProcessStatus() {
    return this.get('/api/v1/ollama-process/status');
  }

  /**
   * 获取 Ollama 监控信息
   */
  async getOllamaProcessMonitoring() {
    return this.get('/api/v1/ollama-process/monitoring');
  }

  /**
   * 获取 vLLM 进程状态
   */
  async getVllmProcessStatus() {
    return this.get('/api/v1/vllm-process/status');
  }

  /**
   * 获取 vLLM 监控信息
   */
  async getVllmProcessMonitoring() {
    return this.get('/api/v1/vllm-process/monitoring');
  }

  // ===== 框架配置接口 =====

  /**
   * 获取 vLLM 配置
   */
  async getVllmFrameworkConfig() {
    return this.get('/api/v1/framework/config/vllm');
  }

  /**
   * 更新 vLLM 框架配置
   */
  async updateVllmFrameworkConfig(config: any) {
    return this.put('/api/v1/framework/config/vllm', config);
  }

  /**
   * 获取 vLLM 推荐配置
   */
  async getVllmRecommendedConfig() {
    return this.get('/api/v1/framework/config/vllm/recommended');
  }

  /**
   * 分析 vLLM 错误
   */
  async analyzeVllmError(error: string) {
    return this.post('/api/v1/framework/config/vllm/analyze-error', { error });
  }
}

/**
 * 创建 API 客户端实例
 */
export function createApiClient(backendStatus: BackendStatus): ApiClient {
  return new ApiClient(backendStatus);
}

/**
 * API 错误处理工具
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'Request timeout. Please check your connection.';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Network error. Please check if the backend is running.';
    }
    return error.message;
  }
  return 'Unknown error occurred';
}
