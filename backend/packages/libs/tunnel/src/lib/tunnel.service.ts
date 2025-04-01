import { TunnelService } from "./tunnel.interface";
import { Logger } from "@nestjs/common";
import { env } from "../env";
import { io } from "socket.io-client";
import { OllamaService } from "@saito/ollama";
import got from "got-cjs";

export class DefaultTunnelService implements TunnelService {
  private readonly gatewayUrl = env().GATEWAY_API_URL;
  private readonly logger = new Logger(DefaultTunnelService.name);
  private readonly socket;
  node_id: string;

  constructor(
    private readonly ollamaService: OllamaService, // Placeholder for actual type
  ) {
    this.socket = io(this.gatewayUrl);
    this.logger.log('Socket initialized');
    this.node_id = '';
    // 连接成功的处理
    this.socket.on('connected', (deviceId: string) => {
      this.logger.log(`Connected with deviceId: ${deviceId}`);
    });

    // 监听来自服务器的消息
    this.socket.on('messageFromServer', async(message: string) => {
      try {
        const serverData: any = JSON.parse(message);
        if (serverData.type === 'chat_request') {
          this.logger.log(`Received message: ${JSON.stringify(serverData)}`);
          const stream = got.stream('http://localhost:8716/api/chat', {
            method: 'POST',
            json: serverData.data
          })
          stream.on('error', (error) => {
            this.logger.error(`Stream error: ${error}`);
          });
          stream.on('data', (data) => {
            console.log('chat_stream', data)
            this.socket.emit('chat_stream', {
              taskId: serverData.taskId,
              content: data
            });
          });
          // 处理聊天请求
        } else if (serverData.type === 'proxy_request') {
          this.logger.log(`Received proxy request: ${JSON.stringify(serverData)}`);
          let reqData = serverData.data;
          try {
            const options: any = {
              method: reqData.method,
              headers: reqData.headers,
              timeout: {
                request: 30000 // 30秒超时
              },
              responseType: 'json'
            };
          
            // 只有在非 GET 请求时才添加 body
            if (reqData.method !== 'GET' && reqData.body) {
              options.json = reqData.body;
            }
            const response = await got(`http://localhost:8716${reqData.url}`, options);
            console.log(response.body)
            // 发送响应数据给客户端
            this.socket.emit('proxy_response', {
              taskId: serverData.taskId,
              content: {
                headers: response.headers,
                body: (response as any).body,
                statusCode: response.statusCode
              },
              statusCode: response.statusCode
            });
          } catch (error) {
            this.logger.error(`Request error: ${error}`);
            this.socket.emit('proxy_response', {
              taskId: serverData.taskId,
              error: error
            });
          }
        }
      } catch (error) {
        this.logger.error(`Error processing message: ${error}`);
      }
    });

    // 断开连接时自动重连
    this.socket.on('disconnect', () => {
      this.logger.log("Disconnected");
      this.connectSocket(this.node_id);
    });
  }



  async connectSocket(node_id: string): Promise<void> {
    const deviceId = node_id;
    this.node_id = node_id
    this.socket.emit('connectSocket', { deviceId });
  }

  async disconnectSocket(): Promise<void> {
    this.socket.disconnect();
  }

  sendMessage(message: any): void {
    this.socket.emit('messageFromServer', JSON.stringify(message));
  }

  onMessage(callback: (message: any) => void): void {
    this.socket.on('messageFromServer', (message: string) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        this.logger.error(`Error parsing message: ${error}`);
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