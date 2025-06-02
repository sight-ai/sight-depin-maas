import { TunnelService } from "./tunnel.interface";
import { Injectable, Logger } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import * as http from 'http';
import { URL } from 'url';

// Ollama API 接口地址
const OLLAMA_API_URL = 'http://localhost:8716';

/**
 * 隧道服务
 * 负责建立和管理与网关的WebSocket连接，处理消息传递
 */
@Injectable()
export class DefaultTunnelService implements TunnelService {
  private readonly logger = new Logger(DefaultTunnelService.name);
  socket: Socket;
  node_id: string = '';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;
  private readonly reconnectDelay: number = 2000;
  gatewayUrl: string = '';

  // 存储已连接的设备
  private connectedDevices: Set<string> = new Set<string>();

  // 存储任务处理器
  private streamHandlers: Map<string, (message: any) => Promise<void>> = new Map();
  private noStreamHandlers: Map<string, (message: any) => Promise<any>> = new Map();

  // 存储设备与任务的映射关系
  private deviceTaskMap: Map<string, Set<string>> = new Map();

  constructor() {
    this.socket = io();
  }

  /**
   * 创建Socket连接
   * @param gatewayAddress 网关地址
   * @param key 认证密钥
   * @param code 一次性认证码（可选）
   * @param basePath API服务器基础路径（可选）
   */
  async createSocket(gatewayAddress: string, key: string, code?: string, basePath?: string): Promise<void> {
    try {
      // 从完整地址中提取基础URL
      const url = new URL(gatewayAddress);
      this.gatewayUrl = `${url.protocol}//${url.host}`;
      // 使用传入的basePath参数，如果没有提供则使用空字符串
      const apiBasePath = basePath || '';
      const socketPath = `${apiBasePath}/socket.io`;

      this.logger.debug('Socket连接配置信息:');
      this.logger.debug(`基础URL: ${this.gatewayUrl}`);
      this.logger.debug(`Socket.IO路径: ${socketPath}`);
      if (code) {
        this.logger.debug(`使用认证码: ${code}`);
      }

      // 创建Socket连接，使用API文档中推荐的配置
      this.socket = io(this.gatewayUrl, {
        path: socketPath,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 60000,
        timeout: 20000,
        transports: ['polling', 'websocket'],
        forceNew: true,
        secure: true,
        rejectUnauthorized: false,
        extraHeaders: {
          'Origin': this.gatewayUrl,
          'Authorization': `Bearer ${key}`,
          ...(code ? { 'X-Auth-Code': code } : {})
        }
      });

      // 设置Socket事件监听器
      this.setupSocketListeners();
    } catch (error) {
      this.logger.error(`创建Socket连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 设置Socket事件监听器
   */
  setupSocketListeners(): void {
    // 连接建立时
    this.socket.on('connect', () => {
      this.logger.log('Socket连接成功');
      this.logger.log(`Socket ID: ${this.socket.id}`);
      this.reconnectAttempts = 0;
    });

    // 设备注册确认
    this.socket.on('register_device_ack', (data: { success: boolean, deviceId?: string, error?: string }) => {
      if (data.success && data.deviceId) {
        this.logger.log(`设备注册成功，ID: ${data.deviceId}`);
        this.connectedDevices.add(data.deviceId);
      } else {
        this.logger.error(`设备注册失败: ${data.error || '未知错误'}`);
      }
    });

    // 任务请求
    this.socket.on('task_request', async (data: { message: string }) => {
      try {
        const { message } = data;
        const parsedMessage = JSON.parse(message);
        const { type, taskId, data: taskData, path } = parsedMessage;

        this.logger.debug(`收到任务请求: ${type}, taskId: ${taskId} path: ${path}`);

        // 处理任务
        switch (type) {
          case 'chat_request_stream':
            await this.handleChatRequestStream(taskId, taskData, path);
            break;
          case 'chat_request_no_stream':
            await this.handleChatRequestNoStream(taskId, taskData, path);
            break;
          case 'generate_request_stream':
            await this.handleGenerateRequestStream(taskId, taskData, path);
            break;
          case 'generate_request_no_stream':
            await this.handleGenerateRequestNoStream(taskId, taskData, path);
            break;
          case 'proxy_request':
            await this.handleProxyRequest(taskId, taskData);
            break;
          default:
            this.logger.warn(`未知任务类型: ${type}`);
            this.socket.emit('task_error', {
              taskId,
              error: `不支持的任务类型: ${type}`
            });
        }
      } catch (error) {
        this.logger.error(`处理任务请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });

    // 任务响应（非流式）
    this.socket.on('task_response', async (data: { taskId: string, message: any }) => {
      try {
        const { taskId, message } = data;
        this.logger.debug(`收到任务响应: ${taskId}`);

        const handler = this.noStreamHandlers.get(taskId);
        if (handler) {
          await handler(message);
          // 处理完成后删除处理器
          this.noStreamHandlers.delete(taskId);
        } else {
          this.logger.warn(`未找到任务处理器: ${taskId}`);
        }
      } catch (error) {
        this.logger.error(`处理任务响应错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });

    // 任务流式响应
    this.socket.on('task_stream', async (data: { taskId: string, message: string }) => {
      try {
        const { taskId, message } = data;

        const handler = this.streamHandlers.get(taskId);
        if (handler) {
          // 解析消息（如果是字符串）
          let parsedMessage;
          try {
            parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
          } catch (e) {
            parsedMessage = message;
          }

          await handler(parsedMessage);

          // 如果消息中包含完成标志，删除处理器
          if (typeof parsedMessage === 'object' && parsedMessage.done) {
            this.streamHandlers.delete(taskId);
          }
        } else {
          this.logger.warn(`未找到流式任务处理器: ${taskId}`);
        }
      } catch (error) {
        this.logger.error(`处理流式任务响应错误: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });

    // 任务错误
    this.socket.on('task_error', async (data: { taskId: string, error: string }) => {
      try {
        const { taskId, error } = data;
        this.logger.error(`任务错误: ${taskId}, ${error}`);

        // 尝试调用流式和非流式处理器
        const streamHandler = this.streamHandlers.get(taskId);
        if (streamHandler) {
          await streamHandler({ error });
          this.streamHandlers.delete(taskId);
        }

        const noStreamHandler = this.noStreamHandlers.get(taskId);
        if (noStreamHandler) {
          await noStreamHandler({ error });
          this.noStreamHandlers.delete(taskId);
        }
      } catch (error) {
        this.logger.error(`处理任务错误响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });

    // 连接错误
    this.socket.on('connect_error', (error: Error) => {
      this.logger.error(`Socket连接错误: ${error.message}`);
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.logger.log(`尝试重新连接 (${attemptNumber})`);
    });

    // 连接断开
    this.socket.on('disconnect', (reason: string) => {
      this.logger.warn(`Socket连接断开: ${reason}`);
      this.handleDisconnect();
    });

    // 一般错误
    this.socket.on('error', (error: Error) => {
      this.logger.error(`Socket错误: ${error.message}`);
    });
  }

  /**
   * 处理连接断开
   */
  handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        if (this.node_id) {
          this.connectSocket(this.node_id);
        } else {
          this.socket.connect();
        }
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // 使用指数退避算法
    } else {
      this.logger.error('达到最大重连尝试次数');
    }
  }

  /**
   * 连接Socket
   * @param node_id 节点ID
   */
  async connectSocket(node_id: string): Promise<void> {
    this.node_id = node_id;
    if (!this.socket.connected) {
      this.socket.connect();
    }

    // 发送设备注册请求
    this.socket.emit('register_device', { deviceId: node_id });
    this.logger.log(`发送设备注册请求，ID: ${node_id}`);
  }

  /**
   * 断开Socket连接
   */
  async disconnectSocket(): Promise<void> {
    this.socket.disconnect();
    this.logger.log('Socket连接已断开');

    // 清理状态
    this.connectedDevices.clear();
    this.streamHandlers.clear();
    this.noStreamHandlers.clear();
    this.deviceTaskMap.clear();
  }

  /**
   * 发送消息
   * @param message 消息内容
   */
  sendMessage(message: unknown): void {
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.emit('message', messageString);
      this.logger.debug('消息已发送');
    } catch (error) {
      this.logger.error(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 向设备发送消息
   * @param params 发送消息的参数
   */
  async handleSendToDevice(params: { deviceId: string; message: string }): Promise<void> {
    try {
      const { deviceId, message } = params;

      // 检查设备是否已连接
      if (!await this.isDeviceConnected(deviceId)) {
        throw new Error(`设备未连接: ${deviceId}`);
      }

      // 发送任务请求
      this.socket.emit('task_request', {
        deviceId,
        message
      });

      this.logger.debug(`向设备 ${deviceId} 发送任务请求`);
    } catch (error) {
      this.logger.error(`向设备发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 为任务注册流式处理器
   * @param params 注册流式处理器的参数
   */
  async handleRegisterStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<void>;
  }): Promise<void> {
    try {
      const { taskId, targetDeviceId, onMessage } = params;

      // 存储处理器
      this.streamHandlers.set(taskId, onMessage);

      // 更新设备任务映射
      if (!this.deviceTaskMap.has(targetDeviceId)) {
        this.deviceTaskMap.set(targetDeviceId, new Set<string>());
      }
      this.deviceTaskMap.get(targetDeviceId)?.add(taskId);

      this.logger.debug(`为任务 ${taskId} 注册流式处理器，目标设备: ${targetDeviceId}`);
    } catch (error) {
      this.logger.error(`注册流式处理器失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 为任务注册非流式处理器
   * @param params 注册非流式处理器的参数
   */
  async handleRegisterNoStreamHandler(params: {
    taskId: string;
    targetDeviceId: string;
    onMessage: (message: any) => Promise<any>;
  }): Promise<void> {
    try {
      const { taskId, targetDeviceId, onMessage } = params;

      // 存储处理器
      this.noStreamHandlers.set(taskId, onMessage);

      // 更新设备任务映射
      if (!this.deviceTaskMap.has(targetDeviceId)) {
        this.deviceTaskMap.set(targetDeviceId, new Set<string>());
      }
      this.deviceTaskMap.get(targetDeviceId)?.add(taskId);

      this.logger.debug(`为任务 ${taskId} 注册非流式处理器，目标设备: ${targetDeviceId}`);
    } catch (error) {
      this.logger.error(`注册非流式处理器失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 获取所有已连接设备
   * @returns 已连接设备ID列表
   */
  async getConnectedDevices(): Promise<string[]> {
    return Array.from(this.connectedDevices);
  }

  /**
   * 检查设备是否已连接
   * @param deviceId 设备ID
   * @returns 设备是否已连接
   */
  async isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.connectedDevices.has(deviceId);
  }

  /**
   * 发送HTTP请求到Ollama API
   * @param method HTTP方法
   * @param path API路径
   * @param data 请求数据
   * @param isStream 是否为流式请求
   * @returns Promise<响应>
   */
  private makeOllamaRequest(method: string, path: string, data?: any, isStream: boolean = false): Promise<any> {
    this.logger.debug(`发送HTTP请求到Ollama API: ${method} ${path}`);
    return new Promise((resolve, reject) => {
      const url = new URL(`${OLLAMA_API_URL}${path}`);
      const options: http.RequestOptions = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      let requestBody: string | undefined;
      if (data) {
        requestBody = JSON.stringify(data);
        options.headers = {
          ...options.headers,
          'Content-Length': Buffer.byteLength(requestBody).toString(),
        };
      }

      const req = http.request(url, options, (res) => {
        if (isStream) {
          resolve(res);
          return;
        }

        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (responseData.trim()) {
              const parsedData = JSON.parse(responseData);
              resolve(parsedData);
            } else {
              resolve({});
            }
          } catch (error) {
            reject(new Error(`解析响应失败: ${error instanceof Error ? error.message : '未知错误'}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (requestBody) {
        req.write(requestBody);
      }
      req.end();
    });
  }

  /**
   * 处理流式聊天请求
   * @param taskId 任务ID
   * @param data 请求数据
   * @param path 路径
   */
  private async handleChatRequestStream(taskId: string, data: any, path: string): Promise<void> {
    try {
      this.logger.debug(`处理流式聊天请求: ${taskId}`);
      this.logger.debug(`处理流式聊天请求: ${taskId}, path: ${path} data: ${JSON.stringify(data)}`);

      // 调用 Ollama API 处理请求
      const stream = await this.makeOllamaRequest('POST', path, data, true);

      stream.on('data', (chunk: Buffer) => {
        try {
            try {
              this.socket.emit('task_stream', {
                taskId,
                message: chunk
              });
            } catch (e) {
              this.logger.error(`解析 JSON 错误: ${e instanceof Error ? e.message : '未知错误'}`);
          }
        } catch (error) {
          this.logger.error(`处理流数据错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`流错误: ${error.message}`);
        this.socket.emit('task_error', {
          taskId,
          error: error.message
        });
      });

      stream.on('end', () => {
        this.logger.debug(`流式聊天请求完成: ${taskId}`);
      });
    } catch (error) {
      this.logger.error(`处理流式聊天请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      this.socket.emit('task_error', {
        taskId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 处理非流式聊天请求
   * @param taskId 任务ID
   * @param data 请求数据
   */
  private async handleChatRequestNoStream(taskId: string, data: any, path: string): Promise<void> {
    try {
      this.logger.debug(`处理非流式聊天请求: ${taskId}`);

      // 调用 Ollama API 处理请求
      const response = await this.makeOllamaRequest('POST', path, data);

      // 发送非流式响应
      this.socket.emit('task_response', {
        taskId,
        message: response
      });

      this.logger.debug(`非流式聊天请求完成: ${taskId}`);
    } catch (error) {
      this.logger.error(`处理非流式聊天请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      this.socket.emit('task_error', {
        taskId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 处理流式生成请求
   * @param taskId 任务ID
   * @param data 请求数据
   */
  private async handleGenerateRequestStream(taskId: string, data: any, path: string): Promise<void> {
    try {
      this.logger.debug(`处理流式生成请求: ${taskId}`);

      // 调用 Ollama API 处理请求
      const stream = await this.makeOllamaRequest('POST', path, data, true);

      stream.on('data', (chunk: Buffer) => {
        try {
          const content = chunk.toString();
          const lines = content.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              // 发送流式响应
              this.socket.emit('task_stream', {
                taskId,
                message: line
              });
            } catch (e) {
              this.logger.error(`解析 JSON 错误: ${e instanceof Error ? e.message : '未知错误'}`);
            }
          }
        } catch (error) {
          this.logger.error(`处理流数据错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`流错误: ${error.message}`);
        this.socket.emit('task_error', {
          taskId,
          error: error.message
        });
      });

      stream.on('end', () => {
        this.logger.debug(`流式生成请求完成: ${taskId}`);
      });
    } catch (error) {
      this.logger.error(`处理流式生成请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      this.socket.emit('task_error', {
        taskId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 处理非流式生成请求
   * @param taskId 任务ID
   * @param data 请求数据
   */
  private async handleGenerateRequestNoStream(taskId: string, data: any, path: string): Promise<void> {
    try {
      this.logger.debug(`处理非流式生成请求: ${taskId}`);

      // 调用 Ollama API 处理请求
      const response = await this.makeOllamaRequest('POST', path, data);

      // 发送非流式响应
      this.socket.emit('task_response', {
        taskId,
        message: response
      });

      this.logger.debug(`非流式生成请求完成: ${taskId}`);
    } catch (error) {
      this.logger.error(`处理非流式生成请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      this.socket.emit('task_error', {
        taskId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 处理代理请求
   * @param taskId 任务ID
   * @param data 请求数据
   */
  private async handleProxyRequest(taskId: string, data: any): Promise<void> {
    try {
      this.logger.debug(`处理代理请求: ${taskId}`);

      if (!data || !data.method || !data.url) {
        throw new Error('请求数据不完整');
      }

      // 解析请求数据
      const { method, url, headers, body, userId } = data;

      // 提取路径和查询参数
      const parsedUrl = new URL(url, 'http://localhost');
      const path = parsedUrl.pathname;

      // 确定目标API
      let targetPath = '';
      let targetMethod = method;
      const targetBody = body;

      // 根据路径确定目标Ollama API
      if (path.includes('/api/chat')) {
        targetPath = '/api/chat';
      } else if (path.includes('/api/generate')) {
        targetPath = '/api/generate';
      } else if (path.includes('/api/embeddings')) {
        targetPath = '/api/embeddings';
      } else if (path.includes('/api/tags')) {
        targetPath = '/api/tags';
        targetMethod = 'GET';
      } else if (path.includes('/api/show')) {
        targetPath = '/api/show';
      } else if (path.includes('/api/version')) {
        targetPath = '/api/version';
        targetMethod = 'GET';
      } else if (path.includes('/openai/v1/models')) {
        targetPath = '/v1/models';
        targetMethod = 'GET';
      } else {
        throw new Error(`不支持的API路径: ${path}`);
      }

      // 如果有用户ID，可以在这里处理
      if (userId) {
        this.logger.debug(`处理用户ID: ${userId} 的请求`);
        // 可以在这里添加用户相关的逻辑
      }

      // 调用Ollama API
      let response;
      if (targetMethod === 'GET') {
        response = await this.makeOllamaRequest('GET', targetPath);
      } else {
        response = await this.makeOllamaRequest('POST', targetPath, targetBody);
      }

      // 发送响应
      this.socket.emit('task_response', {
        taskId,
        message: response
      });

      this.logger.debug(`代理请求完成: ${taskId}`);
    } catch (error) {
      this.logger.error(`处理代理请求错误: ${error instanceof Error ? error.message : '未知错误'}`);
      this.socket.emit('task_error', {
        taskId,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}

// 提供TunnelService的Provider
export const TunnelServiceProvider = {
  provide: TunnelService,
  useClass: DefaultTunnelService,
};

export { TunnelService };
