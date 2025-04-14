import { TunnelService } from "./tunnel.interface";
import { Logger } from "@nestjs/common";
import { env } from "../env";
import { io, Socket } from "socket.io-client";
import { OllamaService } from "@saito/ollama";
import got from "got-cjs";
import { OllamaChatRequest, OllamaGenerateRequest } from '@saito/models'
export class DefaultTunnelService implements TunnelService {
  private readonly logger = new Logger(DefaultTunnelService.name);
  socket: Socket;
  node_id: string = '';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000; // 1秒，与测试一致
  gatewayUrl: string = '';

  constructor(
    private readonly ollamaService: OllamaService,
  ) {
    this.socket = io();
  }
  async createSocket(gatewayAddress: string, key: string, code: string): Promise<void> {
    // 从完整地址中提取基础URL和路径
    const url = new URL(gatewayAddress);
    this.gatewayUrl = `${url.protocol}//${url.host}`;
    const basePath = '/api/model';  // 代理转发的基础路径
    const socketPath = `${basePath}/socket.io`;  // 完整的socket.io路径

    this.logger.debug(`Connecting to Socket.IO server:`);
    this.logger.debug(`Base URL: ${this.gatewayUrl}`);
    this.logger.debug(`Socket.IO Path: ${socketPath}`);

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

    this.setupSocketListeners();
  }
  setupSocketListeners(): void {
    this.socket.on('connect', () => {
      this.logger.log('Socket connected successfully');
      this.logger.log(`Socket ID: ${this.socket.id}`);
      this.logger.debug(`Socket Path: ${this.socket.io.opts.path}`);
      this.logger.debug(`Using URL: ${this.gatewayUrl}`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('connected', (deviceId: string) => {
      this.logger.log(`Connected with deviceId: ${deviceId}`);
    });

    this.socket.on('connect_error', (error: Error) => {
      this.logger.error(`Socket connection error: ${error.message}`);
      this.logger.error('Detailed error:', error);
      this.logger.debug(`Socket Path: ${this.socket.io.opts.path}`);
      this.logger.debug(`Attempted URL: ${this.gatewayUrl}`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.logger.log(`Attempting to reconnect (${attemptNumber}/${this.maxReconnectAttempts})`);
      // 在重连时切换传输方式
      this.socket.io.opts.transports = ['polling', 'websocket'];
    });

    this.socket.on('messageFromServer', this.handleServerMessage.bind(this));

    this.socket.on('disconnect', (reason: string) => {
      this.logger.warn(`Socket disconnected: ${reason}`);
      this.handleDisconnect();
    });

    this.socket.on('error', (error: Error) => {
      this.logger.error(`Socket error: ${error.message}`);
    });
  }

  handleServerMessage(message: string): Promise<void | undefined> {
    try {
      const serverData = JSON.parse(message);

      switch (serverData.type) {
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
          this.logger.warn(`Unknown message type: ${serverData.type}`);
          return Promise.resolve();
      }
    } catch (error) {
      this.logger.error(`Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Promise.resolve();
    }
  }

  handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connectSocket(this.node_id);
      }, this.reconnectDelay);
    } else {
      this.logger.error('Max reconnection attempts reached');
    }
  }

  async connectSocket(node_id: string): Promise<void> {
    this.node_id = node_id;
    if (!this.socket.connected) {
      this.socket.connect();
    }
    this.socket.emit('connectSocket', { deviceId: node_id });
  }

  async disconnectSocket(): Promise<void> {
    this.socket.disconnect();
  }

  sendMessage(message: unknown): void {
    try {
      this.socket.emit('messageFromServer', JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  onMessage(callback: (message: unknown) => void): void {
    this.socket.on('messageFromServer', (message: string) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        this.logger.error(`Error parsing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  getOneTimeCode(): string {
    return this.node_id;
  }

  async chatRequestNoStream(serverData: { taskId: string, data: typeof OllamaChatRequest }): Promise<void> {
    try {
      this.logger.debug(`Processing non-stream chat request: ${serverData.taskId}`);
      const data = await got.post('http://localhost:8716/api/chat', {
        json: serverData.data,
        timeout: { request: 30000 }
      }).json();

      this.socket.emit('register_stream_no_handler', {
        taskId: serverData.taskId,
        content: JSON.stringify(data)
      });
    } catch (error) {
      this.logger.error(`Error in chatRequestNoStream: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.socket.emit('register_stream_no_handler', {
        taskId: serverData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async chatRequestStream(serverData: { taskId: string, data: typeof OllamaChatRequest }): Promise<void> {
    try {
      this.logger.debug(`Processing stream chat request: ${serverData.taskId}`);
      const stream = got.stream('http://localhost:8716/api/chat', {
        method: 'POST',
        json: serverData.data,
        timeout: { request: 30000 }
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`Stream error: ${error.message}`);
        this.socket.emit('chat_stream', {
          taskId: serverData.taskId,
          error: error.message
        });
      });

      stream.on('data', (data: Buffer) => {
        try {
          this.socket.emit('chat_stream', {
            taskId: serverData.taskId,
            content: data.toString()
          });
        } catch (error) {
          this.logger.error(`Error processing stream data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    } catch (error) {
      this.logger.error(`Error in chatRequestStream: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.socket.emit('chat_stream', {
        taskId: serverData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateRequestNoStream(serverData: { taskId: string, data: typeof OllamaGenerateRequest }): Promise<void> {
    try {
      this.logger.debug(`Processing non-stream generate request: ${serverData.taskId}`);
      const data = await got.post('http://localhost:8716/api/generate', {
        json: serverData.data,
        timeout: { request: 30000 }
      }).json();

      this.socket.emit('register_stream_no_handler', {
        taskId: serverData.taskId,
        content: JSON.stringify(data)
      });
    } catch (error) {
      this.logger.error(`Error in generateRequestNoStream: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.socket.emit('register_stream_no_handler', {
        taskId: serverData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateRequestStream(serverData: { taskId: string, data: typeof OllamaGenerateRequest }): Promise<void> {
    try {
      this.logger.debug(`Processing stream generate request: ${serverData.taskId}`);
      const stream = got.stream('http://localhost:8716/api/generate', {
        method: 'POST',
        json: serverData.data,
        timeout: { request: 30000 }
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`Stream error: ${error.message}`);
        this.socket.emit('generate_stream', {
          taskId: serverData.taskId,
          error: error.message
        });
      });

      stream.on('data', (data: Buffer) => {
        try {
          this.socket.emit('generate_stream', {
            taskId: serverData.taskId,
            content: data.toString()
          });
        } catch (error) {
          this.logger.error(`Error processing stream data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    } catch (error) {
      this.logger.error(`Error in generateRequestStream: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.socket.emit('generate_stream', {
        taskId: serverData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async proxyRequest(serverData: { taskId: string, data: { method: string, url: string, headers: Record<string, string>, body: Record<string, string> } }): Promise<void> {
    try {
      this.logger.debug(`Processing proxy request: ${serverData.taskId}`);
      console.log(serverData.data, serverData.data.method.toLowerCase(), `http://localhost:8716${serverData.data.url}`);
      let data;
      const baseOptions = {
        timeout: { request: 30000 },
        headers: serverData.data.headers
      };

      switch (serverData.data.method.toLowerCase()) {
        case 'get':
          data = await got.get(`http://localhost:8716${serverData.data.url}`, baseOptions).json();
          break;
        case 'post':
          data = await got.post(`http://localhost:8716${serverData.data.url}`, {
            ...baseOptions,
            json: serverData.data.body
          }).json();
          break;
        case 'put':
          data = await got.put(`http://localhost:8716${serverData.data.url}`, {
            ...baseOptions,
            json: serverData.data.body
          }).json();
          break;
        case 'delete':
          data = await got.delete(`http://localhost:8716${serverData.data.url}`, {
            ...baseOptions,
            json: serverData.data.body
          }).json();
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${serverData.data.method}`);
      }

      this.socket.emit('proxy_response', {
        taskId: serverData.taskId,
        content: JSON.stringify(data)
      });
    } catch (error) {
      this.logger.error(`Error in proxyRequest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.socket.emit('proxy_response', {
        taskId: serverData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const TunnelServiceProvider = {
  provide: TunnelService,
  useClass: DefaultTunnelService,
};
