import { TunnelService } from "./tunnel.interface";
import { Logger } from "@nestjs/common";
import { env } from "../env";
import { io, Socket } from "socket.io-client";
import { OllamaService } from "@saito/ollama";
import got from "got-cjs";
import { OllamaChatRequest, OllamaGenerateRequest } from '@saito/models'

export class DefaultTunnelService implements TunnelService {
  private readonly gatewayUrl = env().GATEWAY_API_URL;
  private readonly logger = new Logger(DefaultTunnelService.name);
  private readonly socket: Socket;
  node_id: string = '';
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 5000; // 5秒

  constructor(
    private readonly ollamaService: OllamaService,
  ) {
    this.socket = io(this.gatewayUrl, {
      reconnection: false, // 禁用自动重连，使用自定义重连逻辑
      timeout: 10000,
    });
    
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      this.logger.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('connected', (deviceId: string) => {
      this.logger.log(`Connected with deviceId: ${deviceId}`);
    });

    this.socket.on('messageFromServer', this.handleServerMessage.bind(this));

    this.socket.on('disconnect', () => {
      this.logger.warn('Socket disconnected');
      this.handleDisconnect();
    });

    this.socket.on('error', (error: Error) => {
      this.logger.error(`Socket error: ${error.message}`);
    });
  }

  private async handleServerMessage(message: string): Promise<void> {
    try {
      const serverData = JSON.parse(message);
      
      switch (serverData.type) {
        case 'chat_request_stream':
          await this.chatRequestStream(serverData);
          break;
        case 'chat_request_no_stream':
          await this.chatRequestNoStream(serverData);
          break;
        case 'generate_request_stream':
          await this.generateRequestStream(serverData);
          break;
        case 'generate_request_no_stream':
          await this.generateRequestNoStream(serverData);
          break;
        case 'proxy_request':
          await this.proxyRequest(serverData);
          break;
        default:
          this.logger.warn(`Unknown message type: ${serverData.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private handleDisconnect(): void {
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

  async proxyRequest(serverData: { taskId: string, data: any }): Promise<void> {
    try {
      this.logger.debug(`Processing proxy request: ${serverData.taskId}`);
      const reqData = serverData.data;
      
      const response = await got(`http://localhost:8716${reqData.url}`, {
        method: reqData.method,
        headers: reqData.headers,
        timeout: { request: 30000 },
        responseType: 'json',
        ...(reqData.method !== 'GET' && reqData.body ? { body: JSON.stringify(reqData.body) } : {})
      });
      
      this.socket.emit('proxy_response', {
        taskId: serverData.taskId,
        content: {
          headers: response.headers,
          body: response.body,
          statusCode: response.statusCode
        },
        statusCode: response.statusCode
      });
    } catch (error) {
      this.logger.error(`Proxy request error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.socket.emit('proxy_response', {
        taskId: serverData.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
}

export const TunnelServiceProvider = {
  provide: TunnelService,
  useClass: DefaultTunnelService
};