import { Socket } from "socket.io-client";

export abstract class TunnelService {
  abstract connectSocket(node_id: String ): Promise<void>;
  abstract disconnectSocket(): Promise<void>;
  abstract sendMessage(message: any): void;
  abstract onMessage(callback: (message: any) => void): void;
  abstract getOneTimeCode(): string;
  abstract createSocket(gatewayAddress: string, key: string, code: string): Promise<void>;
  abstract node_id: string;
  abstract gatewayUrl: string;
  abstract socket: Socket;
  abstract setupSocketListeners(): void;
  abstract handleServerMessage(message: string): Promise<void>;
  abstract handleDisconnect(): void;
}