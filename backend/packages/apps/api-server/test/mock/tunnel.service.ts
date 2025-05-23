import { TunnelService } from "@saito/tunnel";

export class MockedTunnelService implements TunnelService {
  node_id: string = 'mock-node-id';
  onMessage: (message: any) => void = () => {};
  gatewayUrl: string = 'mock-gateway-url';
  socket: any = null;

  async createSocket(gatewayAddress: string, key: string, code?: string, basePath?: string): Promise<void> {
    // Mock implementation
  }

  setupSocketListeners(): void {
    // Mock implementation
  }

  async connectSocket(deviceId: string): Promise<void> {
    // Mock implementation
  }

  async disconnectSocket(): Promise<void> {
    // Mock implementation
  }

  async sendMessage(message: any): Promise<void> {
    // Mock implementation
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  getOneTimeCode(): string {
    return 'mock-one-time-code';
  }

  async handleServerMessage(message: string): Promise<void> {
    // Mock implementation
  }

  handleDisconnect(): void {
    // Mock implementation
  }
}