import { TunnelService } from "./tunnel.interface";
import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import got from "got-cjs";
import { OllamaChatRequest, OllamaGenerateRequest, TunnelSchemas } from '@saito/models';
import * as R from 'ramda';
import { z } from 'zod';

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
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000; // 1秒，与测试一致
  gatewayUrl: string = '';
  
  // 用于存储消息回调
  private messageCallbacks: Array<(message: unknown) => void> = [];

  constructor(
  ) {
    this.socket = io();
  }

  /**
   * 创建Socket连接
   * @param gatewayAddress 网关地址
   * @param key 认证密钥
   * @param code 一次性认证码
   */
  async createSocket(gatewayAddress: string, key: string, code: string): Promise<void> {
    try {
      // 从完整地址中提取基础URL
      const url = new URL(gatewayAddress);
      this.gatewayUrl = `${url.protocol}//${url.host}`;
      const basePath = '';  // 代理转发的基础路径
      // const basePath = '/api/model';  // 代理转发的基础路径
      const socketPath = `${basePath}/socket.io`;  // 完整的socket.io路径

      this.logger.debug('Socket连接配置信息:');
      this.logger.debug(`基础URL: ${this.gatewayUrl}`);
      this.logger.debug(`Socket.IO路径: ${socketPath}`);

      // 创建Socket连接
      this.socket = io(this.gatewayUrl, {
        path: socketPath,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
        transports: ['polling', 'websocket'],
        forceNew: true,
        secure: true,
        rejectUnauthorized: false,
        extraHeaders: {
          'Origin': this.gatewayUrl,
          'Authorization': `Bearer ${key}`
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
      this.logger.debug(`Socket路径: ${this.socket.io.opts.path}`);
      this.logger.debug(`使用URL: ${this.gatewayUrl}`);
      this.reconnectAttempts = 0;
    });

    // 设备连接确认
    this.socket.on('connected', (deviceId: string) => {
      this.logger.log(`设备已连接，ID: ${deviceId}`);
    });

    // 连接错误
    this.socket.on('connect_error', (error: Error) => {
      this.logger.error(`Socket连接错误: ${error.message}`);
      this.logger.error('详细错误:', error);
      this.logger.debug(`Socket路径: ${this.socket.io.opts.path}`);
      this.logger.debug(`尝试连接的URL: ${this.gatewayUrl}`);
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.logger.log(`尝试重新连接 (${attemptNumber}/${this.maxReconnectAttempts})`);
      // 在重连时切换传输方式
      this.socket.io.opts.transports = ['polling', 'websocket'];
    });

    // 服务器消息
    this.socket.on('messageFromServer', this.handleServerMessage.bind(this));

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
   * 处理来自服务器的消息
   * @param message 消息内容
   */
  async handleServerMessage(message: string): Promise<void | undefined> {
    try {
      const serverData = JSON.parse(message);
      
      // 根据消息类型调用相应的处理方法
      const messageType = R.prop('type', serverData);
      const taskId = R.prop('taskId', serverData);
      
      this.logger.debug(`收到服务器消息，类型: ${messageType}, 任务ID: ${taskId}`);
      
      switch (messageType) {
        case 'chat_request_stream':
          return this.chatRequestStream(serverData);
        case 'chat_request_no_stream':
          return this.chatRequestNoStream(serverData);
        case 'generate_request_stream':
          return this.generateRequestStream(serverData);
        case 'generate_request_no_stream':
          return this.generateRequestNoStream(serverData);
        case 'proxy_request':
          return this.proxyRequest(serverData);
        default:
          this.logger.warn(`未知的消息类型: ${messageType}`);
          return Promise.resolve();
      }
    } catch (error) {
      this.logger.error(`处理消息时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      return Promise.resolve();
    }
  }

  /**
   * 处理连接断开
   */
  handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connectSocket(this.node_id);
      }, this.reconnectDelay * this.reconnectAttempts); // 使用退避算法增加延迟
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
    this.socket.emit('connectSocket', { deviceId: node_id });
    this.logger.log(`尝试连接节点，ID: ${node_id}`);
  }

  /**
   * 断开Socket连接
   */
  async disconnectSocket(): Promise<void> {
    this.socket.disconnect();
    this.logger.log('Socket连接已断开');
  }

  /**
   * 发送消息到服务器
   * @param message 消息内容
   */
  sendMessage(message: unknown): void {
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.emit('messageFromServer', messageString);
      this.logger.debug('消息已发送到服务器');
    } catch (error) {
      this.logger.error(`发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 注册消息处理回调
   * @param callback 消息处理回调函数
   */
  onMessage(callback: (message: unknown) => void): void {
    this.messageCallbacks.push(callback);
    
    this.socket.on('messageFromServer', (message: string) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        this.logger.error(`解析消息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
  }

  /**
   * 获取一次性认证码
   */
  getOneTimeCode(): string {
    return this.node_id;
  }

  /**
   * 创建HTTP请求选项
   * @param baseUrl 基础URL
   * @param endpoint 端点路径
   */
  private createRequestOptions(baseUrl: string, endpoint: string) {
    return {
      url: `${baseUrl}${endpoint}`,
      timeout: { request: 30000 }
    };
  }

  /**
   * 处理请求错误
   * @param taskId 任务ID
   * @param error 错误
   * @param eventName 事件名称
   */
  private handleRequestError(taskId: string, error: unknown, eventName: string): void {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    this.logger.error(`请求处理错误: ${errorMessage}`);
    
    const errorResponse = {
      taskId,
      error: errorMessage
    };
    
    this.socket.emit(eventName, errorResponse);
  }

  /**
   * 处理非流式聊天请求
   * @param serverData 服务器数据
   */
  async chatRequestNoStream(serverData: { taskId: string, data: z.infer<typeof OllamaChatRequest> }): Promise<void> {
    try {
      const { taskId, data } = serverData;
      this.logger.debug(`处理非流式聊天请求: ${taskId}`);
      
      // 构建请求选项
      const requestOptions = this.createRequestOptions('http://localhost:8716', '/api/chat');
      
      // 添加任务ID到请求数据
      const requestData = {
        ...data,
        taskId
      };
      
      // 发送请求并获取响应
      const responseData = await got.post(requestOptions.url, {
        json: requestData,
        timeout: requestOptions.timeout
      }).json();
      
      // 发送响应到Socket
      this.socket.emit('register_stream_no_handler', {
        taskId,
        content: JSON.stringify(responseData)
      });
    } catch (error) {
      this.handleRequestError(serverData.taskId, error, 'register_stream_no_handler');
    }
  }

  /**
   * 处理流式聊天请求
   * @param serverData 服务器数据
   */
  async chatRequestStream(serverData: { taskId: string, data: z.infer<typeof OllamaChatRequest> }): Promise<void> {
    try {
      const { taskId, data } = serverData;
      this.logger.debug(`处理流式聊天请求: ${taskId}`);
      
      // 构建请求选项
      const requestOptions = this.createRequestOptions('http://localhost:8716', '/api/chat');
      
      // 添加任务ID到请求数据
      const requestData = {
        ...data,
        taskId
      };
      
      // 创建流式请求
      const stream = got.stream(requestOptions.url, {
        method: 'POST',
        json: requestData,
        timeout: requestOptions.timeout
      });
      
      // 处理流错误
      stream.on('error', (error: Error) => {
        this.logger.error(`流错误: ${error.message}`);
        this.socket.emit('chat_stream', {
          taskId,
          error: error.message
        });
      });
      
      // 处理流数据
      stream.on('data', (data: Buffer) => {
        try {
          const content = data.toString();
          this.socket.emit('chat_stream', {
            taskId,
            content
          });
        } catch (error) {
          this.logger.error(`处理流数据错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      });
    } catch (error) {
      this.handleRequestError(serverData.taskId, error, 'chat_stream');
    }
  }

  /**
   * 处理非流式生成请求
   * @param serverData 服务器数据
   */
  async generateRequestNoStream(serverData: { taskId: string, data: z.infer<typeof OllamaGenerateRequest> }): Promise<void> {
    try {
      const { taskId, data } = serverData;
      this.logger.debug(`处理非流式生成请求: ${taskId}`);
      
      // 构建请求选项
      const requestOptions = this.createRequestOptions('http://localhost:8716', '/api/generate');
      
      // 添加任务ID到请求数据
      const requestData = {
        ...data,
        taskId
      };
      
      // 发送请求并获取响应
      const responseData = await got.post(requestOptions.url, {
        json: requestData,
        timeout: requestOptions.timeout
      }).json();
      
      // 发送响应到Socket
      this.socket.emit('register_stream_no_handler', {
        taskId,
        content: JSON.stringify(responseData)
      });
    } catch (error) {
      this.handleRequestError(serverData.taskId, error, 'register_stream_no_handler');
    }
  }

  /**
   * 处理流式生成请求
   * @param serverData 服务器数据
   */
  async generateRequestStream(serverData: { taskId: string, data: z.infer<typeof OllamaGenerateRequest> }): Promise<void> {
    try {
      const { taskId, data } = serverData;
      this.logger.debug(`处理流式生成请求: ${taskId}`);
      
      // 构建请求选项
      const requestOptions = this.createRequestOptions('http://localhost:8716', '/api/generate');
      
      // 添加任务ID到请求数据
      const requestData = {
        ...data,
        taskId
      };
      
      // 创建流式请求
      const stream = got.stream(requestOptions.url, {
        method: 'POST',
        json: requestData,
        timeout: requestOptions.timeout
      });
      
      // 处理流错误
      stream.on('error', (error: Error) => {
        this.logger.error(`流错误: ${error.message}`);
        this.socket.emit('generate_stream', {
          taskId,
          error: error.message
        });
      });
      
      // 处理流数据
      stream.on('data', (data: Buffer) => {
        try {
          const content = data.toString();
          this.socket.emit('generate_stream', {
            taskId,
            content
          });
        } catch (error) {
          this.logger.error(`处理流数据错误: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      });
    } catch (error) {
      this.handleRequestError(serverData.taskId, error, 'generate_stream');
    }
  }

  /**
   * 处理代理请求
   * @param serverData 服务器数据
   */
  async proxyRequest(serverData: TunnelSchemas.ModelOfTunnel<'ProxyRequest'>): Promise<void> {
    try {
      const { taskId, data } = serverData;
      this.logger.debug(`处理代理请求: ${taskId}`);
      
      const baseUrl = 'http://localhost:8716';
      const url = `${baseUrl}${data.url}`;
      const method = data.method.toLowerCase();
      
      this.logger.debug(`代理请求信息: ${method} ${url}`);
      
      // 通用请求配置
      const baseOptions = {
        timeout: { request: 30000 },
        headers: data.headers
      };
      
      // 根据HTTP方法发送请求
      let responseData;
      
      switch (method) {
        case 'get':
          responseData = await got.get(url, baseOptions).json();
          break;
        case 'post':
          responseData = await got.post(url, {
            ...baseOptions,
            json: data.body
          }).json();
          break;
        case 'put':
          responseData = await got.put(url, {
            ...baseOptions,
            json: data.body
          }).json();
          break;
        case 'delete':
          responseData = await got.delete(url, {
            ...baseOptions,
            json: data.body
          }).json();
          break;
        default:
          throw new Error(`不支持的HTTP方法: ${method}`);
      }
      
      // 发送响应到Socket
      this.socket.emit('proxy_response', {
        taskId,
        content: JSON.stringify(responseData)
      });
    } catch (error) {
      this.handleRequestError(serverData.taskId, error, 'proxy_response');
    }
  }
}

export const TunnelServiceProvider = {
  provide: TunnelService,
  useClass: DefaultTunnelService,
};
