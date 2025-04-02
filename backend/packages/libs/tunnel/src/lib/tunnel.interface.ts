export abstract class TunnelService {
  abstract connectSocket(node_id: String ): Promise<void>;
  abstract disconnectSocket(): Promise<void>;
  abstract sendMessage(message: any): void;
  abstract onMessage(callback: (message: any) => void): void;
  abstract getOneTimeCode(): string;
  abstract node_id: string;
}
