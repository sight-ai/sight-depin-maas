import { Injectable, Logger } from '@nestjs/common';
import { TunnelMessage } from '@saito/models';
import axios from 'axios';
import { ILibp2pTransportGateway, ConnectionStatus } from './message-gateway.interface';

@Injectable()
export class MessageGatewayLibp2pService implements ILibp2pTransportGateway {
  private readonly logger = new Logger(MessageGatewayLibp2pService.name);
  private messageCallback: ((message: TunnelMessage) => void) | null = null;
  private connectionCallback: ((connected: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  constructor() {}

  /**
   * 获取传输类型标识
   */
  getTransportType(): 'libp2p' {
    return 'libp2p';
  }

  // 实际负责消息发送，调用 libp2p 网络
  async sendMessage(message: TunnelMessage): Promise<void> {
    try {
      const port = process.env['LIBP2P_PORT'] || 4010;
      const url = `http://localhost:${port}/libp2p/send`;
      this.logger.debug(`Going to send to ${url}`);
      await axios.post(url, message, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`Sent to libp2p: ${url}`);
    } catch (err) {
      this.logger.error('Failed to send message to libp2p REST server', err);
      if (axios.isAxiosError(err)) {
        this.logger.error('Axios error', {
          code: err.code,
          message: err.message,
          url: err.config?.url,
          stack: err.stack,
          data: err.response?.data,
          status: err.response?.status,
        });
      } else {
        this.logger.error('Unknown error', err);
      }
      throw err;
    }
  }

  onMessage(callback: (message: TunnelMessage) => void): void {
    this.messageCallback = callback;
  }

  /**
   * 获取连接状态 - Libp2p模式下始终返回已连接
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: true, // Libp2p模式下假设始终连接
      deviceId: null,
      gatewayUrl: undefined
    };
  }
}

export const MessageGatewayLibp2pProvider = {
  provide: 'MessageGatewayLibp2p',
  useClass: MessageGatewayLibp2pService,
};
